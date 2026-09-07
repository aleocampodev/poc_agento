/**
 * Webhook del bot de gestión de Shirley.
 *
 * Telegram hace POST aquí en cada mensaje. Validamos el secreto, deduplicamos
 * por update_id, verificamos que SOLO Shirley (TELEGRAM_ADMIN_CHAT_ID) pueda
 * usarlo y corremos el agente (Claude Agent SDK → LiteLLM → Groq free).
 * Fuera de /api para no chocar con el catch-all de Payload.
 *
 * Registrar el webhook: pnpm tsx scripts/set-telegram-webhook.ts <url-publica>
 */
import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import { runShirleyAgent } from '@/lib/agent/runShirleyAgent'
import { sendTelegramChatAction, sendTelegramReply } from '@/lib/telegram'

export const maxDuration = 300

// Single-flight + burst fusion for text-only messages (single-instance).
// Rapid double-taps from Shirley are fused into ONE agent call instead of N,
// so bursts never burn N× tokens nor hit Groq RPM. Media messages bypass the
// queue and process immediately. The check-and-mark sequence below is
// synchronous (no await between), hence atomic in the Node event loop.
const chatLocks = new Set<number>()
const chatDebouncing = new Set<number>()
const chatQueues = new Map<number, string[]>()
const DEBOUNCE_MS = 1000
const MAX_DRAINS = 3
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Dedupe de updates (Telegram reintenta si no recibe 200). Suficiente para
// instancia única — mismo criterio que src/lib/idempotency.ts.
const seenUpdates = new Set<number>()
function alreadySeen(updateId: number): boolean {
  if (seenUpdates.has(updateId)) return true
  seenUpdates.add(updateId)
  if (seenUpdates.size > 1000) {
    const oldest = seenUpdates.values().next().value
    if (oldest !== undefined) seenUpdates.delete(oldest)
  }
  return false
}

interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

interface TelegramVoice {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
}

interface TelegramAudio {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
  title?: string
}

interface TelegramVideo {
  file_id: string
  file_unique_id: string
  width?: number
  height?: number
  duration?: number
  mime_type?: string
  file_size?: number
}

interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

interface TelegramUpdate {
  update_id: number
  message?: {
    chat: { id: number }
    from?: { first_name?: string; username?: string }
    text?: string
    caption?: string
    photo?: TelegramPhotoSize[]
    video?: TelegramVideo
    video_note?: TelegramVideo
    document?: TelegramDocument
    voice?: TelegramVoice
    audio?: TelegramAudio
  }
}

/** chat_id personal de Shirley — ÚNICO remitente que el bot procesa. */
function isAuthorizedAdmin(chatId: number): boolean {
  const adminChatId = Number(process.env.TELEGRAM_ADMIN_CHAT_ID)
  if (!Number.isFinite(adminChatId)) return false
  return chatId === adminChatId
}

/**
 * Runs one fused agent turn with typing feedback. Never throws: any failure
 * is rendered as the warm Spanish fallback reply, never a stack trace.
 */
async function runAgentAndReply(
  payload: Payload,
  chatId: number,
  fusedText: string,
  uploadedMediaId?: number,
): Promise<void> {
  // Feedback visual: mostrar "escribiendo..." en Telegram
  void sendTelegramChatAction(chatId, 'typing')
  const typingInterval = setInterval(() => {
    void sendTelegramChatAction(chatId, 'typing')
  }, 4000)

  try {
    const reply = await runShirleyAgent({
      text: fusedText || 'Shirley envió una foto para el catálogo o landing.',
      payload,
      chatId,
      mediaId: uploadedMediaId,
    })
    payload.logger.info({ msg: '[telegram] handled by shirley-agent', chatId })
    await sendTelegramReply({ chatId, text: reply })
  } catch (err) {
    payload.logger.error({ msg: '[telegram] error', err })
    await sendTelegramReply({
      chatId,
      text: 'Uy, tuve un problemita para responder. ¿Puedes intentar de nuevo en un momento? 💜',
    })
  } finally {
    clearInterval(typingInterval)
  }
}

export async function POST(request: Request): Promise<Response> {
  // 1. Autenticación: Telegram reenvía nuestro secreto en este header.
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret) {
    const got = (await headers()).get('x-telegram-bot-api-secret-token')
    if (got !== expectedSecret) {
      return new Response('forbidden', { status: 403 })
    }
  }

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const message = update.message
  let text = (message?.text ?? message?.caption ?? '')?.trim()
  const chatId = message?.chat?.id

  // 2. Guard single-admin: el bot es EXCLUSIVO de Shirley. Cualquier otro
  //    remitente se rechaza en silencio con 200 OK para evitar reintentos
  //    infinitos de Telegram.
  if (chatId === undefined || !isAuthorizedAdmin(chatId)) {
    return Response.json({ ok: true, ignored: 'unauthorized' })
  }

  // Updates sin texto, ni media (foto, video, doc), ni audio/voz se aceptan sin procesar.
  const hasMedia = message?.photo || message?.video || message?.video_note || message?.document
  if (!text && !hasMedia && !message?.voice && !message?.audio) {
    return Response.json({ ok: true })
  }

  // 3. Dedupe por update_id — un mensaje repetido NUNCA ejecuta tools dos veces.
  if (alreadySeen(update.update_id)) {
    return Response.json({ ok: true })
  }

  const payload = await getPayload({ config })

  // 4. Voice/audio notes get a fixed zero-token reply (no transcription path).
  const audioObj = message?.voice ?? message?.audio
  if (audioObj) {
    await sendTelegramReply({
      chatId,
      text: 'Shirley, la tienda ahora opera exclusivamente por mensaje de texto o enviando fotos y videos ✍️. ¡Escríbeme lo que necesitas y te ayudo de inmediato! 💜',
    })
    return Response.json({ ok: true })
  }

  if (!text && !hasMedia) {
    return Response.json({ ok: true })
  }

  // 5. Text-only fast path: single-flight + burst fusion. Double-taps sent
  //    within DEBOUNCE_MS are fused into a single agent call.
  if (!hasMedia) {
    const queue = chatQueues.get(chatId) ?? []
    queue.push(text)
    chatQueues.set(chatId, queue)
    if (chatLocks.has(chatId) || chatDebouncing.has(chatId)) {
      return Response.json({ ok: true, queued: true })
    }
    chatDebouncing.add(chatId)
    await sleep(DEBOUNCE_MS)
    chatDebouncing.delete(chatId)
    chatLocks.add(chatId)
    try {
      let drains = 0
      while (drains <= MAX_DRAINS) {
        const buffered = chatQueues.get(chatId) ?? []
        if (buffered.length === 0) break
        chatQueues.set(chatId, [])
        await runAgentAndReply(payload, chatId, buffered.join('\n'))
        drains++
      }
    } finally {
      chatLocks.delete(chatId)
      if ((chatQueues.get(chatId) ?? []).length === 0) chatQueues.delete(chatId)
    }
    return Response.json({ ok: true })
  }

  // 6. Media path (photo/video/document): upload to Media, then one agent turn.
  try {
    let uploadedMediaId: number | undefined

    // 5. Procesar video adjunto de Telegram si existe
    const videoObj = message?.video ?? message?.video_note
    if (videoObj?.file_id && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const fileRes = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${videoObj.file_id}`,
        )
        const fileJson = (await fileRes.json()) as {
          ok: boolean
          result?: { file_path?: string }
        }
        if (fileJson.ok && fileJson.result?.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileJson.result.file_path}`
          const vidRes = await fetch(downloadUrl)
          const arrayBuffer = await vidRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const ext = fileJson.result.file_path.split('.').pop() || 'mp4'

          const mediaDoc = await payload.create({
            collection: 'media',
            data: {
              alt: text || 'Video del taller artesanal Nénufar',
            },
            file: {
              data: buffer,
              mimetype: videoObj.mime_type || 'video/mp4',
              name: `taller-${Date.now()}.${ext}`,
              size: buffer.length,
            },
            overrideAccess: true,
          })
          uploadedMediaId = mediaDoc.id
          payload.logger.info({
            msg: '[telegram] Video descargado y guardado en Media',
            mediaId: uploadedMediaId,
          })
        }
      } catch (vidErr) {
        payload.logger.error({ msg: '[telegram] Error descargando video de Telegram', err: vidErr })
      }
    }

    // 5. Procesar foto adjunta de Telegram si existe
    if (message?.photo && message.photo.length > 0 && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const bestPhoto = message.photo[message.photo.length - 1]
        const fileRes = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${bestPhoto.file_id}`,
        )
        const fileJson = (await fileRes.json()) as {
          ok: boolean
          result?: { file_path?: string }
        }
        if (fileJson.ok && fileJson.result?.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileJson.result.file_path}`
          const imgRes = await fetch(downloadUrl)
          const arrayBuffer = await imgRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const mediaDoc = await payload.create({
            collection: 'media',
            data: {
              alt: text || 'Joya Nénufar',
            },
            file: {
              data: buffer,
              mimetype: 'image/jpeg',
              name: `joya-${Date.now()}.jpg`,
              size: buffer.length,
            },
            overrideAccess: true,
          })
          uploadedMediaId = mediaDoc.id
          payload.logger.info({
            msg: '[telegram] Foto descargada y guardada en Media',
            mediaId: uploadedMediaId,
          })
        }
      } catch (mediaErr) {
        payload.logger.error({ msg: '[telegram] Error descargando foto de Telegram', err: mediaErr })
      }
    }

    await runAgentAndReply(payload, chatId, text, uploadedMediaId)
  } catch (err) {
    payload.logger.error({ msg: '[telegram] error', err })
    await sendTelegramReply({
      chatId,
      text: 'Uy, tuve un problemita para responder. ¿Puedes intentar de nuevo en un momento? 💜',
    })
  }

  return Response.json({ ok: true })
}

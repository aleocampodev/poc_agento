import type { Payload } from 'payload'
import { ANTHROPIC_SHIRLEY_TOOLS, executeShirleyTool } from './tools'

export interface RunShirleyAgentArgs {
  /** Mensaje de texto de Shirley. */
  text: string
  /** Instancia de Payload Local API para las tools. */
  payload: Payload
  /** chat_id de Telegram (contexto; ya validado como admin en el webhook). */
  chatId: number
  userName?: string
  /** ID de medio cargado si el mensaje incluía foto */
  mediaId?: number
}

/** Mensaje de cortesía ante caída del gateway/timeout — jamás un stack trace a Telegram. */
export const AGENT_FALLBACK =
  'Shirley, tuve un inconveniente conectando con el servicio. Puedes revisar directamente en /admin mientras tanto 💜'

/** Límite de rondas agénticas. */
const MAX_TURNS = 4

/** Timeout por petición al gateway (2 minutos para operaciones complejas). */
const TIMEOUT_MS = 120_000

/** Ventana máxima de mensajes previos para memoria conversacional. */
const MAX_HISTORY_MESSAGES = 4

/** Tools destructivas: requieren confirmación explícita de Shirley (HITL). */
const DESTRUCTIVE_TOOLS = new Set([
  'eliminarEvento',
  'eliminarFotoGaleria',
  'eliminarTestimonio',
  'confirmarPedido',
])

/** Tiempo de vida de una confirmación pendiente antes de cancelarse sola. */
const PENDING_TTL_MS = 5 * 60_000

/** Topes invisibles de tamaño para no quemar tokens en entradas/salidas largas. */
const INPUT_MAX_CHARS = 1000
const TOOL_RESULT_MAX_CHARS = 2000

/** Presupuesto diario (Groq gpt-oss-120b free: 200K TPD). */
const DAILY_WARN_TOKENS = 150_000
const DAILY_PARK_TOKENS = 190_000

/** Cadena de failover explícita (espejo de litellm/config.yaml). */
const MODEL_CHAIN = ['nenufar-bot', 'nenufar-bot-20b', 'nenufar-bot-qwen36', 'nenufar-bot-qwen38']

/** Reintentos ante 429/5xx con backoff. */
const MAX_GATEWAY_ATTEMPTS = 3
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 529])

/** Circuit breaker ante saturación sostenida del tier gratuito. */
const CIRCUIT_FAIL_THRESHOLD = 3
const CIRCUIT_BREAKER_MS = 5 * 60_000

/** Confirmación relajada en lenguaje natural (no tediosa). */
const CONFIRM_RE = /^(s[ií]|s[ií] por favor|confirmo|dale|ok|yes|listo)\b/i
const CANCEL_RE = /^(no|cancela|mejor no|déjalo|dejalo)\b/i

interface PendingConfirmation {
  toolName: string
  args: Record<string, any>
  summary: string
  expiresAt: number
}

// Single-instance in-memory guards (same criterion as webhook dedupe:
// sufficient for the current single-node deployment, never a billing risk
// since the only caller is the single-admin Telegram webhook).
const pendingConfirmations = new Map<number, PendingConfirmation>()
let circuitOpenUntil = 0
let consecutiveGatewayFailures = 0

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Herramientas operativas cuyos mensajes de salida ya están formateados en lenguaje natural para Shirley. */
const DIRECT_REPLY_TOOLS = new Set([
  'buscarProducto',
  'crearProductoDraft',
  'publicarProducto',
  'actualizarInventario',
  'destacarProducto',
  'crearCategoria',
  'listarCategorias',
  'asignarCategoriaProducto',
  'pedidosPendientes',
  'confirmarPedido',
  'publicarEvento',
  'listarEventos',
  'eliminarEvento',
  'crearTestimonio',
  'listarTestimonios',
  'eliminarTestimonio',
  'agregarFotoGaleria',
  'listarFotosGaleria',
  'eliminarFotoGaleria',
  'generarCopyProducto',
  'actualizarDescripcionProducto',
  'generarCopyLanding',
  'consultarAlmacenamientoFotos',
])

function buildSystemPrompt(): string {
  return [
    'Eres el asistente de gestión de Nénufar, la marca de joyería artesanal en Cartagena, Colombia.',
    'Tu interlocutora es Shirley, dueña, diseñadora artesanal y administradora de la tienda, quien te escribe desde Telegram.',
    'Dirígete siempre a ella únicamente como Shirley. Está ESTRICTAMENTE PROHIBIDO usar apelativos como "amor", "reina", "mi cielo", "corazón", "cariño", "linda", etc. Siempre trátala con respeto profesional, calidez y solo llamándola Shirley.',
    'Shirley no tiene conocimientos técnicos: NUNCA menciones IDs internos de bases de datos, números de registro con numeral (#8, ID Evento, etc.), colecciones, slugs o términos de código. Habla siempre de sus joyas, talleres, ferias y pedidos de forma natural y clara.',
    '',
    'Tono: cálido, respetuoso y cartagenero, pero profesional y eficiente. Respuestas directas para Telegram. Español.',
    '',
    'Reglas de negocio:',
    '- Precios siempre en pesos colombianos (COP) sin decimales.',
    '- Nunca inventes datos: si necesitas información del catálogo o pedidos, usa las herramientas.',
    '- Si te preguntan qué productos hay, qué joyas vendemos o piden ver el catálogo, USA SIEMPRE la herramienta buscarProducto (con consulta vacía o palabra clave) para obtener la lista real de la base de datos.',
    '- Puedes crear productos en borrador o publicarlos de inmediato en la tienda web (/shop) si te lo pide (incluso asignando su categoría).',
    '- Puedes crear y listar categorías del catálogo con crearCategoria y listarCategorias.',
    '- Puedes asignar categorías a joyas existentes con asignarCategoriaProducto.',
    '- Puedes publicar o despublicar cualquier producto existente con la herramienta publicarProducto.',
    '- Puedes gestionar la subpágina de galería de Nénufar (/galeria) con agregarFotoGaleria, listarFotosGaleria y eliminarFotoGaleria.',
    '- Si Shirley envía una foto con texto indicando una categoría (clientas, ferias, talleres, shirley) o diciendo que es para la galería, USA SIEMPRE agregarFotoGaleria para publicarla de inmediato.',
    '- Si Shirley pide ver o listar las fotos de la galería, USA SIEMPRE listarFotosGaleria.',
    '- Si Shirley pide retirar o borrar una foto de la galería, USA SIEMPRE eliminarFotoGaleria.',
    '- Si Shirley pide ideas de texto, descripciones atractivas para una joya o copys para el catálogo web (/products/[slug]), usa generarCopyProducto.',
    '- Si Shirley pide agendar un taller o feria, USA SIEMPRE publicarEvento.',
    '- Si Shirley pide ver, consultar o listar los talleres y ferias programados, USA SIEMPRE listarEventos para ver los datos reales.',
    '- Si Shirley pide eliminar o cancelar un taller o feria, USA SIEMPRE eliminarEvento.',
    '- Si Shirley pide registrar testimonios de compradoras, USA crearTestimonio o listarTestimonios.',
    '- Si Shirley pregunta por el espacio, almacenamiento de fotos en Supabase o qué fotos pesan más para eliminar y liberar espacio, USA SIEMPRE consultarAlmacenamientoFotos.',
    '- Si una herramienta falla, discúlpate brevemente y sugiere intentar en un momento. No muestres errores técnicos ni IDs.',
    '- Si el mensaje es una pregunta general o saludo, responde directo sin usar herramientas.',
    '- Tienes acceso al historial de conversación previo: úsalo para entender referencias a productos, fotos o temas hablados anteriormente.',
    '',
    'Reglas de Copywriting para Marketing y Ventas (ALTA CONVERSIÓN · ANTI-SLOP · ANTI-SYCOPHANCY):',
    '- ENFOQUE DE MARKETING Y VENTAS DIRECTAS: El objetivo de cada texto comercial es convertir visitantes en compradoras. Despierta deseo genuino, vincula características técnicas a beneficios tangibles (ej. ligereza extrema que permite usar aretes de impacto 10 horas seguidas sin dolor), derriba objeciones (cero níquel para pieles reactivas, resistencia al sudor, empaque de regalo) y cierra con llamados a la acción claros.',
    '- FORMATO COMERCIAL INTEGRAL: Entrega propuestas útiles para los canales de Shirley: ficha para la tienda web, copy persuasivo para Instagram/WhatsApp con gancho scroll-stopper, y frase de cierre directo para cuando una clienta pregunte por chat.',
    '- PROHIBIDO EL AI SLOP Y CLICHÉS DE IA: No uses fórmulas vacías como "eleva tu estilo al siguiente nivel", "un tapiz de emociones", "sinfonía de colores", "en un mundo donde...", "déjate cautivar", "fusión mágica de lo ancestral y lo contemporáneo" ni adjetivos inflados.',
    '- PROHIBIDO EL SYCOPHANCY (adulación servil o complaciente): Jamás adules a Shirley ni a las clientas con lisonjas exageradas ("¡maravillosa reina!", "¡obra maestra divina!", "¡eres genial!"). El tono debe ser cálido pero sobrio, profesional y con la dignidad de quien domina un oficio manual.',
    '- ANCLADO EN EL OFICIO REAL: Basa cada argumento de venta en hechos tangibles: micro-mostacilla checa calibrada Preciosa Ornela que conserva su brillo, tejido punto por punto con hilo técnico resistente a la humedad del Caribe, ligereza extrema (menos de 15g que no jala las orejas ni cansa el cuello), remates limpios hipoalergénicos y confección pausada en Getsemaní, Cartagena.',
  ].join('\n')
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | Array<Record<string, any>>
}

/**
 * Carga el historial de conversación reciente para dar memoria contextual al agente.
 */
async function loadRecentHistory(
  payload: Payload,
  chatId: number,
): Promise<AnthropicMessage[]> {
  try {
    const result = await payload.find({
      collection: 'agent-messages' as any,
      where: {
        chatId: { equals: chatId },
      },
      sort: '-createdAt',
      limit: MAX_HISTORY_MESSAGES,
      overrideAccess: true,
    })

    if (!result.docs || result.docs.length === 0) {
      return []
    }

    // Orden cronológico (más antiguo al más reciente)
    const chronologicalDocs = [...result.docs].reverse()
    const history: AnthropicMessage[] = []

    for (const doc of chronologicalDocs) {
      if (doc.role === 'user' || doc.role === 'assistant') {
        const textContent = typeof doc.content === 'string' ? doc.content.trim() : ''
        if (textContent) {
          history.push({
            role: doc.role,
            content: textContent,
          })
        }
      }
    }

    return history
  } catch (err) {
    payload.logger.warn({
      msg: '[shirley-agent] No se pudo cargar historial conversacional, continuando sin memoria previa',
      err: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

/**
 * Guarda un mensaje en la colección de historial de Supabase.
 */
async function persistMessage(
  payload: Payload,
  data: {
    chatId: number
    role: 'user' | 'assistant' | 'tool'
    content?: string
    toolName?: string
    toolCalls?: any
    toolResults?: any
  },
): Promise<void> {
  try {
    await payload.create({
      collection: 'agent-messages' as any,
      data: {
        chatId: data.chatId,
        role: data.role,
        content: data.content,
        toolName: data.toolName,
        toolCalls: data.toolCalls,
        toolResults: data.toolResults,
      },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.warn({
      msg: '[shirley-agent] Error persistiendo mensaje en historial',
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Registra una traza de ejecución para auditoría y observabilidad en Supabase.
 */
async function recordTrace(
  payload: Payload,
  data: {
    chatId: number
    query: string
    responseSummary?: string
    toolsUsed?: string
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    cost?: string
    executionTimeMs: number
    status: 'success' | 'error' | 'fallback'
    errorMessage?: string
    model?: string
  },
): Promise<void> {
  try {
    await payload.create({
      collection: 'agent-traces' as any,
      data: {
        chatId: data.chatId,
        query: data.query,
        responseSummary: data.responseSummary,
        toolsUsed: data.toolsUsed,
        inputTokens: data.inputTokens ?? 0,
        outputTokens: data.outputTokens ?? 0,
        totalTokens: data.totalTokens ?? 0,
        cost: data.cost ?? '$0 USD (Groq Free Tier)',
        executionTimeMs: data.executionTimeMs,
        status: data.status,
        errorMessage: data.errorMessage,
        model: data.model,
      },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.warn({
      msg: '[shirley-agent] Error registrando traza de observabilidad',
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Suma los tokens consumidos hoy (UTC, ventana de reset de Groq) leyendo
 * agent-traces. Base del presupuesto diario invisible.
 */
export async function getDailyTokenUsage(
  payload: Payload,
): Promise<{ total: number; lite: boolean; parked: boolean }> {
  try {
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    const result = await payload.find({
      collection: 'agent-traces' as any,
      where: {
        createdAt: { greater_than_equal: start.toISOString() },
      },
      pagination: false,
      limit: 2000,
      overrideAccess: true,
    })
    const total = (result.docs || []).reduce(
      (acc: number, doc: any) => acc + Number(doc?.totalTokens || 0),
      0,
    )
    return {
      total,
      lite: total >= DAILY_WARN_TOKENS,
      parked: total >= DAILY_PARK_TOKENS,
    }
  } catch (err) {
    payload.logger.warn({
      msg: '[shirley-agent] No se pudo calcular el consumo diario, continuando sin presupuesto',
      err: err instanceof Error ? err.message : String(err),
    })
    return { total: 0, lite: false, parked: false }
  }
}

/** Mensaje cálido cuando la cuota gratuita del día se agota. */
export const DAILY_PARK_MESSAGE =
  'Shirley, por hoy agoté mi cuota gratuita del servicio. Puedes trabajar desde /admin y mañana seguimos normal 💜'

/** Mensaje cálido cuando el gateway gratuito está saturado temporalmente. */
export const CIRCUIT_BUSY_MESSAGE =
  'Shirley, el servicio gratuito está saturado por unos minutos. Si es urgente revísalo en /admin y ya retomamos 💜'

/**
 * Corre una consulta agéntica completa y devuelve el texto final para enviar
 * por Telegram. Nunca lanza: ante cualquier fallo devuelve AGENT_FALLBACK.
 */
function determineToolChoice(text: string, mediaId?: number): { type: 'tool' | 'auto'; name?: string } | undefined {
  const t = text.toLowerCase().trim()
  // 1. Pregunta sobre eventos/talleres programados
  if (
    /(taller|talleres|feria|ferias|evento|eventos)/i.test(t) &&
    /(que|cu[aá]les|hay|ver|lista|listar|muestra|mostrar|consultar|programad)/i.test(t) &&
    !/(elimina|borra|cancela|agenda|crea|agrega|publica|nuevo)/i.test(t)
  ) {
    return { type: 'tool', name: 'listarEventos' }
  }

  // 2. Pregunta sobre pedidos pendientes
  if (
    /(pedido|pedidos|compras|ventas)/i.test(t) &&
    /(pendiente|pendientes|nuevo|nuevos|hay|cu[aá]ntos|ver|lista)/i.test(t) &&
    !/(confirma|complet)/i.test(t)
  ) {
    return { type: 'tool', name: 'pedidosPendientes' }
  }

  // 3. Almacenamiento en la nube de Supabase / Espacio / Cuota / Fotos pesadas
  if (
    /(almacenamiento|espacio|memoria|cuota|giga|gigas|mega|megas|peso.*foto|foto.*pesad|pesadas|cu[aá]nto.*queda|disco|supabase|liberar.*espacio)/i.test(
      t,
    )
  ) {
    return { type: 'tool', name: 'consultarAlmacenamientoFotos' }
  }

  // 4. Galería de Fotos / Momentos / Clientas (subpágina /galeria)
  if (/(galer[ií]a|foto|fotos|fotograf[ií]a|momentos|clienta|clientas)/i.test(t)) {
    if (/(elimina|borra|quita|retira|cancela)/i.test(t)) {
      return { type: 'tool', name: 'eliminarFotoGaleria' }
    }
    if (/(agrega|sube|guarda|pon|nueva|nuevo|publica)/i.test(t) || Boolean(mediaId)) {
      return { type: 'tool', name: 'agregarFotoGaleria' }
    }
    if (/(ver|que|cu[aá]les|hay|lista|listar|muestra|mostrar)/i.test(t)) {
      return { type: 'tool', name: 'listarFotosGaleria' }
    }
  }

  // 5. Actualizar descripción de producto existente
  if (/(actualiza|cambia|modifica|guarda).*descripci[oó]n/i.test(t)) {
    return { type: 'tool', name: 'actualizarDescripcionProducto' }
  }

  // 6. Redacción de copys comerciales (Anti-Slop / Oficio Real)
  if (/(copy|copys|redacta|redactar|propuesta|escribe|escribir|texto)/i.test(t)) {
    if (/(landing|inicio|hero|home|web|portada|cta|secci[oó]n)/i.test(t)) {
      return { type: 'tool', name: 'generarCopyLanding' }
    }
    if (/(producto|joya|aretes|collar|pulsera|pieza|colecci[oó]n|descripci[oó]n)/i.test(t) || /(para|de)\s+/i.test(t)) {
      return { type: 'tool', name: 'generarCopyProducto' }
    }
  }

  // 7. Pregunta sobre productos / catálogo
  if (
    /(joya|joyas|producto|productos|cat[aá]logo|aretes|collares|pulseras|piezas|colecci[oó]n)/i.test(t) &&
    /(que|cu[aá]les|hay|ver|lista|listar|muestra|mostrar|qu[eé] vendemos|inventario)/i.test(t) &&
    !/(crea|agrega|publica|elimina|borra|foto|copy|redacta|descripci[oó]n)/i.test(t)
  ) {
    return { type: 'tool', name: 'buscarProducto' }
  }

  return undefined
}

export async function runShirleyAgent({
  text,
  payload,
  chatId,
  mediaId,
}: RunShirleyAgentArgs): Promise<string> {
  const startTime = Date.now()
  const toolsInvoked: string[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0

  const cleanPrompt = (() => {
    const trimmed = text.trim().slice(0, INPUT_MAX_CHARS)
    if (trimmed === '/start' || trimmed === '/iniciar') {
      return 'Hola, soy Shirley. ¿Cómo estás y en qué me puedes ayudar hoy en la tienda?'
    }
    if (trimmed === '/help' || trimmed === '/ayuda') {
      return '¿Qué herramientas y tareas puedes hacer por mí en la tienda?'
    }
    if (trimmed.startsWith('/')) {
      return trimmed.replace(/^\/+/, '')
    }
    return trimmed
  })()

  const isResetCommand =
    text.trim() === '/start' ||
    text.trim() === '/iniciar' ||
    text.trim() === '/reiniciar' ||
    text.trim() === '/reset'

  if (isResetCommand) {
    pendingConfirmations.delete(chatId)
  }

  // 0a. Circuit breaker: ante saturación sostenida no se queman tokens.
  if (Date.now() < circuitOpenUntil) {
    return CIRCUIT_BUSY_MESSAGE
  }

  // 0b. Presupuesto diario invisible (ventana UTC de Groq).
  const dailyUsage = await getDailyTokenUsage(payload)
  if (dailyUsage.parked) {
    void recordTrace(payload, {
      chatId,
      query: text,
      responseSummary: DAILY_PARK_MESSAGE,
      toolsUsed: 'ninguna',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: '$0 USD (Groq Free Tier)',
      executionTimeMs: Date.now() - startTime,
      status: 'fallback',
      errorMessage: `daily-budget-parked (${dailyUsage.total} tokens)`,
      model: process.env.ANTHROPIC_MODEL || 'nenufar-bot',
    })
    return DAILY_PARK_MESSAGE
  }
  const liteMode = dailyUsage.lite
  const effectiveMaxTurns = liteMode ? 1 : MAX_TURNS

  // 0c. HITL: resolver una confirmación pendiente antes de cualquier llamada.
  const pending = pendingConfirmations.get(chatId)
  if (pending && !isResetCommand) {
    if (Date.now() > pending.expiresAt) {
      pendingConfirmations.delete(chatId)
    } else if (CONFIRM_RE.test(cleanPrompt)) {
      pendingConfirmations.delete(chatId)
      const confirmedArgs = { ...pending.args, ...(mediaId ? { mediaId } : {}) }
      const resultText = await executeShirleyTool(pending.toolName, confirmedArgs, payload)
      void persistMessage(payload, {
        chatId,
        role: 'assistant',
        content: resultText,
        toolName: pending.toolName,
      })
      void recordTrace(payload, {
        chatId,
        query: text,
        responseSummary: resultText,
        toolsUsed: pending.toolName,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        cost: '$0 USD (Groq Free Tier)',
        executionTimeMs: Date.now() - startTime,
        status: 'success',
        model: process.env.ANTHROPIC_MODEL || 'nenufar-bot',
      })
      return resultText
    } else if (CANCEL_RE.test(cleanPrompt)) {
      pendingConfirmations.delete(chatId)
      const cancelReply = 'Entendido Shirley, lo dejé como estaba, no eliminé ni cambié nada 💜'
      void persistMessage(payload, { chatId, role: 'assistant', content: cancelReply })
      void recordTrace(payload, {
        chatId,
        query: text,
        responseSummary: cancelReply,
        toolsUsed: 'ninguna',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: '$0 USD (Groq Free Tier)',
        executionTimeMs: Date.now() - startTime,
        status: 'fallback',
        errorMessage: 'HITL: confirmation-cancelled by Shirley',
        model: process.env.ANTHROPIC_MODEL || 'nenufar-bot',
      })
      return cancelReply
    } else {
      // Cualquier otro mensaje sustituye la confirmación pendiente (no tedioso).
      pendingConfirmations.delete(chatId)
    }
  }

  // 1. Cargar memoria previa de Supabase (o iniciar sesión limpia si envió /start)
  // En modo lite se omite el historial para ahorrar tokens de entrada.
  const historyMessages = isResetCommand || liteMode ? [] : await loadRecentHistory(payload, chatId)
  const system = buildSystemPrompt()
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'http://localhost:4000').replace(/\/$/, '')
  const apiKey =
    process.env.ANTHROPIC_AUTH_TOKEN || process.env.LITELLM_MASTER_KEY || 'sk-nenufar-local'
  const model = process.env.ANTHROPIC_MODEL || 'nenufar-bot'

  const messages: AnthropicMessage[] = [
    ...historyMessages,
    { role: 'user', content: cleanPrompt },
  ]

  // Persistir mensaje del usuario
  void persistMessage(payload, {
    chatId,
    role: 'user',
    content: text,
  })

  console.log(`⏱️ [agent] Iniciando consulta (${Date.now() - startTime}ms)`)
  const forcedToolChoice = determineToolChoice(cleanPrompt, mediaId)

  try {
    for (let turn = 0; turn < effectiveMaxTurns; turn++) {
      const turnStart = Date.now()
      console.log(`⏱️ [agent] Llamando a LiteLLM Turno ${turn + 1}...`)

      // Gateway call with silent retry + explicit model failover.
      // Respects Groq retry-after, backs off with jitter, and advances
      // through MODEL_CHAIN so a 429 on the big model falls to a smaller one.
      let response: Response | null = null
      let lastStatus = 0
      let lastErrorText = ''
      for (let attempt = 0; attempt < MAX_GATEWAY_ATTEMPTS; attempt++) {
        const attemptModel = liteMode
          ? 'nenufar-bot-20b'
          : attempt === 0
            ? model
            : MODEL_CHAIN[attempt % MODEL_CHAIN.length]
        try {
          const res = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: attemptModel,
              max_tokens: 1024,
              system,
              messages,
              tools: ANTHROPIC_SHIRLEY_TOOLS,
              ...(turn === 0 && forcedToolChoice ? { tool_choice: forcedToolChoice } : {}),
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
          })
          console.log(
            `⏱️ [agent] LiteLLM Turno ${turn + 1} respondió en ${Date.now() - turnStart}ms (status: ${res.status}, model: ${attemptModel})`,
          )
          if (res.ok) {
            response = res
            consecutiveGatewayFailures = 0
            break
          }
          lastStatus = res.status
          lastErrorText = await res.text()
          if (!RETRYABLE_STATUS.has(res.status)) break
          const retryAfterSec = Number(res.headers.get('retry-after'))
          const backoffMs = Math.min(
            (Number.isFinite(retryAfterSec) && retryAfterSec > 0
              ? retryAfterSec * 1000
              : 750 * 2 ** attempt) + Math.random() * 400,
            12000,
          )
          payload.logger.warn({
            msg: '[shirley-agent] Gateway saturado, reintentando en silencio',
            status: res.status,
            attempt: attempt + 1,
            backoffMs: Math.round(backoffMs),
          })
          await sleep(backoffMs)
        } catch (attemptErr) {
          lastErrorText = attemptErr instanceof Error ? attemptErr.message : String(attemptErr)
          if (attemptErr instanceof Error && attemptErr.name === 'TimeoutError') break
          await sleep(Math.min(750 * 2 ** attempt + Math.random() * 400, 8000))
        }
      }

      if (!response) {
        consecutiveGatewayFailures++
        if (consecutiveGatewayFailures >= CIRCUIT_FAIL_THRESHOLD) {
          circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_MS
        }
        payload.logger.error({
          msg: '[shirley-agent] Error en llamada a Anthropic/LiteLLM tras reintentos',
          status: lastStatus,
          errorText: lastErrorText,
        })

        void recordTrace(payload, {
          chatId,
          query: text,
          responseSummary: AGENT_FALLBACK,
          toolsUsed: toolsInvoked.join(', ') || 'ninguna',
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          cost: '$0 USD (Groq Free Tier)',
          executionTimeMs: Date.now() - startTime,
          status: 'error',
          errorMessage: `HTTP ${lastStatus}: ${lastErrorText}`,
          model,
        })

        return AGENT_FALLBACK
      }

      const data = await response.json()

      // Acumular conteo de tokens devueltos por LiteLLM / Groq
      if (data.usage) {
        totalInputTokens += Number(data.usage.input_tokens || 0)
        totalOutputTokens += Number(data.usage.output_tokens || 0)
      }

      const content = (data.content ?? []) as Array<Record<string, any>>

      // 1. Detectar invocaciones de herramientas (tool_use)
      const toolCalls = content.filter((item) => item.type === 'tool_use')
      if (toolCalls.length > 0) {
        // HITL: ninguna tool destructiva se ejecuta sin el "sí" de Shirley.
        // Si hay al menos una, se difiere TODO el turno y se pide confirmación
        // en lenguaje natural (un solo turno extra, nada tedioso).
        const destructiveCalls = toolCalls.filter((tc) => DESTRUCTIVE_TOOLS.has(tc.name))
        if (destructiveCalls.length > 0) {
          const summary = destructiveCalls
            .map((tc) => {
              const inputPreview = JSON.stringify(tc.input ?? {}).slice(0, 300)
              return `• ${tc.name} ${inputPreview}`
            })
            .join('\n')
          pendingConfirmations.set(chatId, {
            toolName: destructiveCalls[0].name,
            args: { ...(destructiveCalls[0].input ?? {}) },
            summary,
            expiresAt: Date.now() + PENDING_TTL_MS,
          })
          const confirmPrompt =
            `Shirley, antes de hacerlo quiero confirmar:\n${summary}\n\n` +
            `Respóndeme *sí* para confirmar o *no* para cancelar. (Se cancela solo en 5 minutos)`
          void persistMessage(payload, {
            chatId,
            role: 'assistant',
            content: confirmPrompt,
            toolName: destructiveCalls.map((tc) => tc.name).join(', '),
          })
          void recordTrace(payload, {
            chatId,
            query: text,
            responseSummary: confirmPrompt,
            toolsUsed: destructiveCalls.map((tc) => tc.name).join(', '),
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            cost: '$0 USD (Groq Free Tier)',
            executionTimeMs: Date.now() - startTime,
            status: 'fallback',
            errorMessage: 'HITL: awaiting Shirley confirmation',
            model,
          })
          return confirmPrompt
        }

        messages.push({ role: 'assistant', content })

        const toolResults: Array<Record<string, any>> = []
        for (const toolCall of toolCalls) {
          toolsInvoked.push(toolCall.name)
          const toolArgs = {
            ...(toolCall.input ?? {}),
            ...(mediaId ? { mediaId } : {}),
          }
          let resultText = await executeShirleyTool(
            toolCall.name,
            toolArgs,
            payload,
          )
          if (resultText.length > TOOL_RESULT_MAX_CHARS) {
            resultText =
              resultText.slice(0, TOOL_RESULT_MAX_CHARS) + '\n…(lista recortada, ver /admin)'
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: resultText,
          })
        }

        const onlyDirectTools = toolCalls.every((tc) => DIRECT_REPLY_TOOLS.has(tc.name))
        if (onlyDirectTools && toolResults.length > 0) {
          const directReply = toolResults.map((tr) => tr.content).join('\n\n')

          void persistMessage(payload, {
            chatId,
            role: 'assistant',
            content: directReply,
            toolName: toolsInvoked.join(', ') || undefined,
          })

          void recordTrace(payload, {
            chatId,
            query: text,
            responseSummary: directReply,
            toolsUsed: toolsInvoked.join(', ') || 'ninguna',
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            cost: '$0 USD (Groq Free Tier)',
            executionTimeMs: Date.now() - startTime,
            status: 'success',
            model,
          })

          return directReply
        }

        messages.push({ role: 'user', content: toolResults })
        continue
      }

      // 2. Extraer texto de respuesta final
      const textBlock = content.find((item) => item.type === 'text')
      if (textBlock && typeof textBlock.text === 'string' && textBlock.text.trim()) {
        const finalReply = textBlock.text.trim()

        // Persistir respuesta del asistente
        void persistMessage(payload, {
          chatId,
          role: 'assistant',
          content: finalReply,
          toolName: toolsInvoked.join(', ') || undefined,
        })

        // Registrar métrica de observabilidad con conteo de tokens
        void recordTrace(payload, {
          chatId,
          query: text,
          responseSummary: finalReply,
          toolsUsed: toolsInvoked.join(', ') || 'ninguna',
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          cost: '$0 USD (Groq Free Tier)',
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          model,
        })

        return finalReply
      }
    }

    void recordTrace(payload, {
      chatId,
      query: text,
      responseSummary: AGENT_FALLBACK,
      toolsUsed: toolsInvoked.join(', ') || 'ninguna',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      cost: '$0 USD (Groq Free Tier)',
      executionTimeMs: Date.now() - startTime,
      status: 'fallback',
      errorMessage: 'Se alcanzó el límite de MAX_TURNS sin respuesta textual',
      model,
    })

    return AGENT_FALLBACK
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    payload.logger.error({
      msg: '[shirley-agent] Error crítico en el loop agéntico',
      err: errorMsg,
    })

    void recordTrace(payload, {
      chatId,
      query: text,
      responseSummary: AGENT_FALLBACK,
      toolsUsed: toolsInvoked.join(', ') || 'ninguna',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      cost: '$0 USD (Groq Free Tier)',
      executionTimeMs: Date.now() - startTime,
      status: 'error',
      errorMessage: errorMsg,
      model,
    })

    return AGENT_FALLBACK
  }
}

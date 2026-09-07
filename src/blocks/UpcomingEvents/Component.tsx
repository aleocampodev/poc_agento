import configPromise from "@payload-config"
import { getPayload } from "payload"
import React from "react"
import { VideoPlayer } from "./VideoPlayer.client"
import { CalendarClient, EventItem } from "./Calendar.client"
import type { Media } from "@/payload-types"
import { Sparkles } from "lucide-react"
import { ScrollReveal } from "@/components/Animation/ScrollReveal"
import { fetchGoogleCalendarEvents } from "@/lib/google-calendar"

interface UpcomingEventsBlockProps {
  tagline?: string | null
  title?: string | null
  description?: string | null
  video?: Media | string | null
  videoUrl?: string | null
  videoCaption?: string | null
  events?: any[] | null
  googleCalendarIcalUrl?: string | null
  syncWithGoogleCalendar?: boolean | null
  id?: string
}

export const UpcomingEventsBlock: React.FC<UpcomingEventsBlockProps> = async ({
  tagline = "EXPERIENCIAS & ENCUENTROS",
  title = "Talleres en Vivo & Próximas Ferias en Cartagena",
  description = "Vive el arte de tejer mostacilla en nuestro taller o encuéntranos en las ferias artesanales del Centro Histórico.",
  video,
  videoUrl,
  videoCaption,
  events,
  googleCalendarIcalUrl,
  syncWithGoogleCalendar = false,
  id,
}) => {
  let eventsList: EventItem[] = []
  let isGoogleCalendarSynced = false

  // 1. Optional inbound sync from Shirley's Google Calendar (opt-in only,
  // so her personal calendar never floods the site by default)
  if (syncWithGoogleCalendar !== false) {
    try {
      const gcalRes = await fetchGoogleCalendarEvents(googleCalendarIcalUrl)
      if (gcalRes.events && gcalRes.events.length > 0) {
        eventsList = gcalRes.events
        isGoogleCalendarSynced = true
      }
    } catch (gcalErr) {
      console.warn("[UpcomingEvents] Google Calendar sync notice:", gcalErr)
    }
  }

  // 2. Si Google Calendar no devolvió eventos, consultar la colección de Payload
  if (eventsList.length === 0) {
    try {
      const payload = await getPayload({ config: configPromise })
      const result = await payload.find({
        collection: "events",
        depth: 1,
        limit: 12,
        overrideAccess: true,
        sort: "date",
        where: {
          _status: { equals: "published" },
        },
      })

      if (result.docs && result.docs.length > 0) {
        eventsList = result.docs.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          date: doc.date,
          endDate: doc.endDate,
          location: doc.location,
          description: doc.description,
          type: doc.type,
        }))
      }
    } catch (err) {
      console.warn("[UpcomingEvents] Error fetching events from collection:", err)
    }
  }

  // Si la colección no tiene eventos, usar los del bloque o fallbacks
  if (eventsList.length === 0 && events && Array.isArray(events) && events.length > 0) {
    eventsList = events
      .filter((ev) => ev != null && typeof ev === 'object')
      .map((ev, idx) => ({
        id: ev.id || `ev-${idx + 1}`,
        title: ev.title || '',
        date: ev.date || '',
        endDate: ev.endDate || null,
        location: ev.location || null,
        description: ev.description || null,
        type: ev.type || 'feria',
      }))
  }

  // Fallbacks de ferias y talleres en Cartagena si la base de datos está vacía
  if (eventsList.length === 0) {
    eventsList = [
      {
        id: "ev-1",
        title: "Feria Artesanal del Centro Histórico",
        date: "2026-08-15T15:00:00.000Z",
        location: "Plaza de San Pedro Claver, Cartagena de Indias",
        type: "feria",
        description:
          "Shirley presentará su colección completa de Okamas y Otapas ceremoniales tejidos en micro-mostacilla checa calibrada. Un espacio al aire libre bajo la brisa caribeña para apreciar la técnica ancestral y llevarte una joya irrepetible.",
      },
      {
        id: "ev-2",
        title: "Taller Vivencial de Tejido Emberá",
        date: "2026-08-22T10:00:00.000Z",
        location: "Taller Nénufar, Getsemaní, Cartagena",
        type: "taller",
        description:
          "Experiencia íntima de 3 horas donde Shirley guía a cada participante paso a paso en el hilado y la geometría sagrada. Incluye micro-mostacillas checas, aguja técnica, café de origen y tu propia pieza terminada.",
      },
      {
        id: "ev-3",
        title: "Pop-Up Joyas de Autor & Café",
        date: "2026-08-29T16:00:00.000Z",
        location: "Calle del Espíritu Santo, Getsemaní",
        type: "pop-up",
        description:
          "Muestra especial de piezas únicas de autor. Shirley estará compartiendo la historia de cada collar y asesorando sobre la caída anatómica en el cuerpo.",
      },
    ]
  }

  let finalVideoUrl = videoUrl
  if (video && typeof video === 'object' && (video as Media).url) {
    finalVideoUrl = (video as Media).url
  } else if (typeof video === 'number') {
    try {
      const payload = await getPayload({ config: configPromise })
      const mediaDoc = await payload.findByID({ collection: 'media', id: video })
      if (mediaDoc?.url) {
        finalVideoUrl = mediaDoc.url
      }
    } catch (err) {
      console.warn('[UpcomingEvents] Error fetching video media:', err)
    }
  }

  // Fallback a video real subido si no hay URL configurada
  if (!finalVideoUrl) {
    finalVideoUrl = '/media/taller-artesanal.mp4'
  }

  return (
    <section id={id || "talleres"} className="w-full py-20 bg-[#FAF8F5] text-stone-900 border-t border-stone-200/80 scroll-mt-24 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Encabezado Editorial Claro */}
        <ScrollReveal variant="fade-up" duration={800}>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            {tagline && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-[11px] font-sans font-semibold uppercase tracking-[0.25em]">
                <Sparkles className="w-3 h-3 text-brand" />
                {tagline}
              </span>
            )}
            {title && (
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-stone-900 font-normal tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        </ScrollReveal>

        {/* Cuadrícula de 2 Columnas Clara: Video 9:16 + Calendario con Dropdown de Texto */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Columna Izquierda: Video Vertical 9:16 */}
          <div className="lg:col-span-5 flex justify-center">
            <ScrollReveal variant="fade-right" delay={150} duration={900}>
              <VideoPlayer videoUrl={finalVideoUrl} caption={videoCaption} />
            </ScrollReveal>
          </div>

          {/* Columna Derecha: Calendario Interactivo Claro */}
          <div className="lg:col-span-7">
            <ScrollReveal variant="fade-left" delay={250} duration={900}>
              <CalendarClient events={eventsList} isGoogleCalendarSynced={isGoogleCalendarSynced} />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

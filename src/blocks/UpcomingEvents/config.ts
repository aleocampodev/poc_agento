import type { Block } from "payload"

export const UpcomingEventsBlock: Block = {
  slug: "upcomingEvents",
  labels: {
    singular: '5. Ferias & Talleres en Cartagena (Video + Calendario)',
    plural: 'Bloques de Talleres & Ferias',
  },
  admin: {
    description:
      "Muestra el video vertical del taller (formato celular 9:16) y el calendario interactivo con dropdown de ferias en Cartagena.",
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Textos de la Sección",
          fields: [
            {
              name: "tagline",
              type: "text",
              label: "Subtítulo / Tagline superior",
              defaultValue: "EXPERIENCIAS & ENCUENTROS",
              admin: {
                description: "Texto pequeño en mayúsculas sobre el título principal.",
              },
            },
            {
              name: "title",
              type: "text",
              label: "Título de la Sección",
              defaultValue: "Talleres en Vivo & Próximas Ferias en Cartagena",
            },
            {
              name: "description",
              type: "textarea",
              label: "Descripción de la Sección",
              defaultValue:
                "Vive el arte de tejer mostacilla en nuestro taller o encuéntranos en las ferias artesanales del Centro Histórico.",
            },
          ],
        },
        {
          label: "Video del Taller (Formato Celular 9:16)",
          fields: [
            {
              name: "video",
              type: "upload",
              relationTo: "media",
              label: "Video del Taller (Subir archivo .mp4 grabado con celular)",
              admin: {
                description:
                  "Sube un video vertical en formato celular (9:16 / estilo Reel). Tiene prioridad sobre la URL.",
              },
            },
            {
              name: "videoUrl",
              type: "text",
              label: "O URL directa de video (opcional)",
              defaultValue:
                "https://assets.mixkit.co/videos/preview/mixkit-hands-of-an-artisan-weaving-a-basket-43403-large.mp4",
              admin: {
                description: "Enlace directo MP4 si el video está alojado externamente.",
              },
            },
            {
              name: "videoCaption",
              type: "text",
              label: "Texto al pie del video",
              defaultValue: "El arte de tejer paciencia: experiencia vivencial en Cartagena con Shirley.",
              admin: {
                description: "Frase descriptiva que acompaña el video vertical en la tienda.",
              },
            },
          ],
        },
        {
          label: "Calendario de Ferias & Talleres",
          fields: [
            {
              name: "googleCalendarIcalUrl",
              type: "text",
              label: "Enlace iCal de Google Calendar de Shirley (.ics) — opcional",
              admin: {
                description:
                  "Solo si quieres que los eventos de tu Google Calendar aparezcan en la web. Si lo dejas vacío, la web muestra únicamente lo que agregues en la lista inferior y tu calendario personal nunca se mezcla.",
              },
            },
            {
              name: "syncWithGoogleCalendar",
              type: "checkbox",
              label: "Mostrar eventos de mi Google Calendar en la web",
              defaultValue: false,
              admin: {
                description:
                  "Apagado por defecto. Al revés sí funciona siempre: lo que agregues en la lista inferior se publica solo en tu Google Calendar si lo suscribes en calendar.google.com → Otros calendarios → Desde URL con /api/calendar/feed.",
              },
            },
            {
              name: "events",
              type: "array",
              label: "Lista de Eventos y Ferias",
              labels: {
                singular: "Evento / Feria",
                plural: "Eventos y Ferias",
              },
              minRows: 1,
              maxRows: 10,
              defaultValue: [
                {
                  title: "Feria Artesanal del Centro Histórico",
                  type: "feria",
                  date: "2026-09-15T15:00:00.000Z",
                  location: "Plaza de San Pedro Claver, Cartagena de Indias",
                  description:
                    "Shirley presentará su colección completa de Okamas y Otapas ceremoniales tejidos en micro-mostacilla checa calibrada.",
                },
                {
                  title: "Taller Vivencial de Tejido Emberá",
                  type: "taller",
                  date: "2026-09-22T10:00:00.000Z",
                  location: "Taller Nénufar, Getsemaní, Cartagena",
                  description:
                    "Aprende las puntadas ancestrales de hilado en mostacilla en un encuentro íntimo de 3 horas con Shirley. Incluye kit de materiales.",
                },
                {
                  title: "Pop-Up Joyas de Autor & Café",
                  type: "popup",
                  date: "2026-09-29T16:00:00.000Z",
                  location: "Calle del Espíritu Santo, Getsemaní",
                  description:
                    "Muestra exclusiva de piezas únicas y personalización en vivo mientras disfrutas del mejor café de origen colombiano.",
                },
              ],
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "title",
                      type: "text",
                      label: "Nombre del Evento o Feria",
                      required: true,
                      admin: { width: "70%" },
                    },
                    {
                      name: "type",
                      type: "select",
                      label: "Tipo",
                      defaultValue: "feria",
                      admin: { width: "30%" },
                      options: [
                        { label: "🪡 Taller Vivencial", value: "taller" },
                        { label: "🎪 Feria Artesanal", value: "feria" },
                        { label: "✨ Pop-Up", value: "popup" },
                      ],
                    },
                  ],
                },
                {
                  type: "row",
                  fields: [
                    {
                      name: "date",
                      type: "date",
                      label: "Fecha del Evento",
                      required: true,
                      admin: { width: "40%" },
                    },
                    {
                      name: "location",
                      type: "text",
                      label: "Lugar / Ubicación en Cartagena",
                      required: true,
                      admin: { width: "60%" },
                    },
                  ],
                },
                {
                  name: "description",
                  type: "textarea",
                  label: "Descripción Detallada del Evento",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

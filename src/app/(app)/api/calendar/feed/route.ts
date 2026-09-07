import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

// Revalidate every 5 minutes. Google Calendar polls subscribed feeds on its
// own schedule (usually every few hours), so this keeps the ICS fresh.
export const revalidate = 300

type FeedEvent = {
  id: string
  title: string
  date: string
  endDate?: string | null
  location?: string | null
  description?: string | null
  link?: string | null
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

function foldIcsLine(line: string): string {
  // RFC 5545: content lines max 75 octets, continued lines start with a space
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  let out = ''
  let current = ''
  let currentBytes = 0
  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf8')
    if (currentBytes + charBytes > 75) {
      out += `${current}\r\n `
      current = char
      currentBytes = charBytes + 1 // leading space
    } else {
      current += char
      currentBytes += charBytes
    }
  }
  return out + current
}

function toIcsDate(value: string): { allDay: boolean; date: string } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { allDay: true, date: value.replace(/-/g, '') }
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return { allDay: true, date: '' }
  }
  const compact = parsed.toISOString().replace(/[-:]/g, '').split('.')[0] ?? ''
  return { allDay: false, date: `${compact}Z` }
}

function addHoursUtc(compactUtc: string, hours: number): string {
  const parsed = new Date(
    `${compactUtc.slice(0, 4)}-${compactUtc.slice(4, 6)}-${compactUtc.slice(6, 8)}T${compactUtc.slice(9, 11)}:${compactUtc.slice(11, 13)}:${compactUtc.slice(13, 15)}Z`,
  )
  parsed.setUTCHours(parsed.getUTCHours() + hours)
  return `${parsed.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

function addDaysDate(compactDate: string, days: number): string {
  const parsed = new Date(
    `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}T00:00:00Z`,
  )
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10).replace(/-/g, '')
}

function buildVEvent(event: FeedEvent, stamp: string): string | null {
  const start = toIcsDate(event.date)
  if (!start.date) return null

  const lines = [
    'BEGIN:VEVENT',
    `UID:nenufar-event-${String(event.id).replace(/[^a-zA-Z0-9-_]/g, '-')}@nenufar`,
    `DTSTAMP:${stamp}`,
  ]

  if (start.allDay) {
    const end = event.endDate ? toIcsDate(event.endDate) : null
    lines.push(`DTSTART;VALUE=DATE:${start.date}`)
    // RFC 5545: DTEND for DATE values is exclusive
    lines.push(`DTEND;VALUE=DATE:${end && end.date ? (end.allDay ? addDaysDate(end.date, 1) : addDaysDate(end.date.slice(0, 8), 1)) : addDaysDate(start.date, 1)}`)
  } else {
    const end = event.endDate ? toIcsDate(event.endDate) : null
    lines.push(`DTSTART:${start.date}`)
    if (end && end.date && !end.allDay) {
      lines.push(`DTEND:${end.date}`)
    } else if (end && end.date && end.allDay) {
      lines.push(`DTEND;VALUE=DATE:${addDaysDate(end.date, 1)}`)
    } else {
      lines.push(`DTEND:${addHoursUtc(start.date, 3)}`)
    }
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`)
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  if (event.link && /^https?:\/\//i.test(event.link)) lines.push(`URL:${event.link}`)

  lines.push('END:VEVENT')
  return lines.map(foldIcsLine).join('\r\n')
}

export async function GET() {
  const payload = await getPayload({ config: configPromise })
  const collected: FeedEvent[] = []
  const seen = new Set<string>()

  const pushEvent = (event: FeedEvent) => {
    if (!event.title || !event.date) return
    const key = `${event.title.trim().toLowerCase()}|${event.date}`
    if (seen.has(key)) return
    seen.add(key)
    collected.push(event)
  }

  // 1. Published docs from the events collection (upcoming first)
  try {
    const result = await payload.find({
      collection: 'events',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      sort: 'date',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { date: { greater_than_equal: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() } },
        ],
      },
    })
    for (const doc of result.docs as any[]) {
      pushEvent({
        id: String(doc.id),
        title: doc.title,
        date: doc.date,
        endDate: doc.endDate ?? null,
        location: doc.location ?? null,
        description: doc.description ?? null,
        link: doc.link ?? null,
      })
    }
  } catch (err) {
    console.warn('[CalendarFeed] Error fetching events collection:', err)
  }

  // 2. Events added by Shirley in the home page block (primary workflow)
  try {
    const home = await payload.find({
      collection: 'pages',
      depth: 1,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          { or: [{ slug: { equals: 'home' } }, { slug: { equals: 'inicio' } }] },
          { _status: { equals: 'published' } },
        ],
      },
    })
    const layout = (home.docs?.[0] as any)?.layout
    if (Array.isArray(layout)) {
      for (const block of layout) {
        if (block?.blockType !== 'upcomingEvents' || !Array.isArray(block.events)) continue
        for (const ev of block.events) {
          if (!ev || typeof ev !== 'object') continue
          pushEvent({
            id: String(ev.id ?? `block-${collected.length + 1}`),
            title: ev.title ?? '',
            date: typeof ev.date === 'string' ? ev.date : '',
            endDate: ev.endDate ?? null,
            location: ev.location ?? null,
            description: ev.description ?? null,
            link: null,
          })
        }
      }
    }
  } catch (err) {
    console.warn('[CalendarFeed] Error fetching home page events:', err)
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const vevents = collected
    .map((event) => buildVEvent(event, stamp))
    .filter((vevent): vevent is string => vevent !== null)

  const ics = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Nenufar Cartagena//Eventos//ES',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nénufar — Ferias y Talleres',
    'X-WR-TIMEZONE:America/Bogota',
    ...vevents,
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="eventos-nenufar.ics"',
    },
  })
}

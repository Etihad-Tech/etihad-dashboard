import type { Participant, Post, TopicSlot, Trip } from './api'

// How «Etihad Jamoasi» writes dates, times and a post's place — one definition, so the
// trips list, a trip's posts and a template's posts say the same thing the same way.

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
const WEEKDAYS = ['yak', 'dush', 'sesh', 'chor', 'pay', 'juma', 'shan']

/** A YYYY-MM-DD date at local midnight, or null. */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function today(): Date {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

const DAY_MS = 86_400_000
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS)

/** «18 noy» — with the weekday, «18 noy, sesh». */
export function fmtDate(d: Date | null, weekday = false): string {
  if (!d) return '—'
  const s = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return weekday ? `${s}, ${WEEKDAYS[d.getDay()]}` : s
}

/** The calendar date of a trip's day N: day 1 is the departure date (the scheduler's rule). */
export function dayDate(startIso: string | null, day: number): Date | null {
  const start = parseDate(startIso)
  return start ? new Date(start.getTime() + (day - 1) * DAY_MS) : null
}

export type TripPhase = 'upcoming' | 'ontrip' | 'over' | 'archived'

/** Where a trip stands today: not left yet, on its way, back home (still active), or archived. */
export function tripPhase(trip: Trip, now = today()): TripPhase {
  if (!trip.is_active) return 'archived'
  const start = parseDate(trip.start_date)
  const end = parseDate(trip.end_date)
  if (!start || start > now) return 'upcoming'
  if (end && end < now) return 'over'
  return 'ontrip'
}

/** «8 kundan keyin», «Bugun», «Safarda · 3-kun», «Qaytgan». */
export function phaseNote(trip: Trip, now = today()): string {
  const start = parseDate(trip.start_date)
  switch (tripPhase(trip, now)) {
    case 'upcoming': {
      if (!start) return 'Sana yo\'q'
      const n = daysBetween(now, start)
      return n === 0 ? 'Bugun' : n === 1 ? 'Ertaga' : `${n} kundan keyin`
    }
    case 'ontrip':
      return start ? `Safarda · ${daysBetween(start, now) + 1}-kun` : 'Safarda'
    case 'over':
      return 'Qaytgan'
    default:
      return 'Arxiv'
  }
}

/** The time a post really goes out: its own time plus the delay, and how many days that moves it. */
export function effectiveTime(post: Pick<Post, 'scheduled_time' | 'delay_minutes'>): { time: string; dayShift: number } {
  const [h, m] = post.scheduled_time.split(':').map(Number)
  const total = h * 60 + m + (post.delay_minutes || 0)
  const dayShift = Math.floor(total / 1440)
  const mins = ((total % 1440) + 1440) % 1440
  const pad = (n: number) => String(n).padStart(2, '0')
  return { time: `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`, dayShift }
}

/** «+30 daq», «−1 soat», «+1 s 15 daq». */
export function fmtDelay(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const a = Math.abs(minutes)
  const h = Math.floor(a / 60)
  const m = a % 60
  if (!h) return `${sign}${m} daq`
  return m ? `${sign}${h} s ${m} daq` : `${sign}${h} soat`
}

/** The group's topics a trip has, in slot order. */
export function tripTopics(trip: Trip | null): { slot: 1 | 2; id: number }[] {
  const out: { slot: 1 | 2; id: number }[] = []
  if (trip?.topic_id) out.push({ slot: 1, id: trip.topic_id })
  if (trip?.topic_id_2) out.push({ slot: 2, id: trip.topic_id_2 })
  return out
}

export const TOPIC_LABEL: Record<string, string> = {
  null: 'Barcha mavzular',
  1: "E'lonlar mavzusi",
  2: '2-mavzu',
  0: 'Faqat kabinetga',
}
export const topicLabel = (slot: TopicSlot) => TOPIC_LABEL[String(slot)]

/** The list mark of a post that does NOT go where a new post goes (the announcements
 *  topic) — the bot's own rule, so the few exceptions are what the eye finds. */
export function topicMark(slot: TopicSlot): { text: string; cls: string } | null {
  if (slot === 1) return null
  if (slot === 0) return { text: 'Faqat kabinet', cls: 'chip-violet' }
  if (slot === 2) return { text: '2-mavzu', cls: 'chip-blue' }
  return { text: 'Barcha mavzular', cls: 'chip-blue' }
}

export function pollOptions(post: Pick<Post, 'poll_options'>): string[] {
  if (!post.poll_options) return []
  try {
    const v = JSON.parse(post.poll_options)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

const MEDIA_ICON: Record<string, string> = { photo: 'image', video: 'video', document: 'paperclip', location: 'location-dot' }
const MEDIA_LABEL: Record<string, string> = { photo: 'Rasm', video: 'Video', document: 'Fayl', location: 'Joylashuv', voice: 'Ovoz', video_note: 'Dumaloq video' }

/** What media a post carries — the first file's kind and how many files. */
export function mediaInfo(post: Pick<Post, 'media_path' | 'media_type'>): { icon: string; label: string; count: number } | null {
  if (!post.media_path) return null
  let type = post.media_type || 'document'
  let count = 1
  try {
    const meta = JSON.parse(post.media_path)
    type = meta?.media_type || type
    if (Array.isArray(meta?.items)) count = meta.items.length
  } catch { /* a bare file id */ }
  return { icon: MEDIA_ICON[type] || 'paperclip', label: MEDIA_LABEL[type] || 'Fayl', count }
}

/** A post's text as one plain line: the HTML the bot sends, without its tags. */
export function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

export function personName(p: Partial<Pick<Participant, 'first_name' | 'last_name' | 'respondent_name' | 'username'>>): string {
  return p.respondent_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || (p.username ? '@' + p.username : '—')
}

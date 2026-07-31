import { computed, ref } from 'vue'
import { useNazoratStore, type GroupOption, type Worker } from '../../stores/nazorat'

/** The vocabulary of the Nazorat panel — colours, labels and the small pure helpers —
 *  defined ONCE so the three screens can never drift from each other. */

/** The four outcomes. The split bar, the legend, the ranking bars, the table headers
 *  and the per-row bars all read from here.
 *
 *  Palette: validated with the dataviz skill's checker against a white surface —
 *  lightness band, chroma floor, CVD separation (worst adjacent pair ΔE 13.0, target
 *  ≥8) and the normal-vision floor (19.8, floor 15) all PASS. Amber sits below 3:1
 *  contrast, so it is never the only carrier of meaning: every use is paired with a
 *  visible label, and table VALUES are ink with the colour reduced to a header dot. */
export const BUCKETS = [
   {
      key: 'completed', label: 'Bajarildi', short: 'Bajarildi', color: '#059669',
      hint: "qabul qildi, ziyoratchi qayta so'ramadi",
   },
   {
      key: 're_requests', label: "Takroriy so'rov", short: 'Takroriy', color: '#f59e0b',
      hint: "ziyoratchi ilgari ham so'ragan edi — shu odam ikkinchi so'rovni qabul qildi",
   },
   {
      key: 'reopened', label: 'Bajarilmagan', short: 'Bajarilmagan', color: '#ef4444',
      hint: "qabul qilgan, LEKIN ziyoratchi qayta so'radi — aslida hal qilinmagan",
   },
   {
      key: 'never_accepted', label: 'Javobsiz', short: 'Javobsiz', color: '#3b82f6',
      hint: 'kartochka yetib bordi, lekin umuman qabul qilinmadi',
   },
] as const

export const PERIODS = [
   { value: 'day', label: 'Kunlik' },
   { value: 'week', label: 'Haftalik' },
   { value: 'month', label: 'Oylik' },
]

const CITY_LABELS: Record<string, string> = { makka: 'Makka', madina: 'Madina' }
export function cityLabel(c: string | null): string {
   return c ? (CITY_LABELS[c] || c) : ''
}

// Xatolik taxonomy labels — codes mirror server IT_ERROR_KINDS (bot/services/control.py).
const KIND_LABELS: Record<string, string> = {
   wp: "Noto'g'ri shaxs",
   nr: "So'rov emas",
   wl: "Noto'g'ri shahar/xona",
   wa: "Javob noto'g'ri",
   unlabeled: 'Turi belgilanmagan',
}

// staff.role -> a job an ordinary reader recognises. The job is WHY two people's
// numbers differ: the doctor is deliberately kept out of the whole-crew tag and only
// receives health needs, the airport contact only airport ones.
const JOB_LABELS: Record<string, string> = {
   ishchi_guruh: 'Ishchi guruh',
   doctor: 'Shifokor',
   airport: 'Aeroport',
}
export function jobLabel(w: { role: string; staff_role?: string | null }): string {
   if (w.role === 'ellikboshi') return 'Ellikboshi'
   const j = w.staff_role
   return j ? (JOB_LABELS[j] || j) : 'Xodim'
}

/** Display label for a worker/recipient — the DASHBOARD name if entered, else @username. */
export function personLabel(
   p: { name?: string | null; username?: string | null; telegram_id: number },
): string {
   return p.name || p.username || ('ID ' + p.telegram_id)
}

/** Seconds -> a short Uzbek duration ("2 soat 5 daq"). null when never measured. */
export function dur(s: number | null): string {
   if (s === null || s === undefined) return '—'
   if (s < 60) return `${Math.round(s)} soniya`
   const m = Math.floor(s / 60)
   if (m < 60) return `${m} daq`
   const h = Math.floor(m / 60)
   const rem = m % 60
   return rem ? `${h} soat ${rem} daq` : `${h} soat`
}

export function fmtTime(iso: string | null): string {
   if (!iso) return '—'
   return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

/** Date + time — a feed can span a whole month, so the day matters here in a way it
 *  does not inside one worker's own log. */
export function fmtDateTime(iso: string | null): string {
   if (!iso) return '—'
   const d = new Date(iso)
   return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })
      + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

/** Human duration between two timestamps; if `toIso` is null, measures up to NOW. */
export function durBetween(fromIso: string | null, toIso: string | null): string {
   if (!fromIso) return '—'
   const to = toIso ? new Date(toIso).getTime() : Date.now()
   return dur(Math.max(0, Math.round((to - new Date(fromIso).getTime()) / 1000)))
}

/** Cards that left this person's accountability: never arrived, a colleague claimed it
 *  first, or they marked it a bot error. They belong to none of the four colour buckets. */
export function uncounted(w: Worker): number {
   return (w.undelivered || 0) + (w.released || 0) + (w.flagged || 0)
}

/** One row's composition as a mini bar — lets a long list be scanned for "who is mostly
 *  red" without reading every number. The cards that left their accountability ride
 *  along in gray, so the bar always spans the row's whole Murojaat count. */
export function rowSegments(w: Worker) {
   const total = w.dms || 1
   const segs: { key: string; color: string; value: number }[] = BUCKETS
      .map((b) => ({ key: b.key as string, color: b.color as string, value: (w as any)[b.key] as number }))
   segs.push({ key: 'uncounted', color: '#e5e7eb', value: uncounted(w) })
   return segs.filter((s) => s.value > 0).map((s) => ({ ...s, pct: (s.value / total) * 100 }))
}

export function rowSplitHint(w: Worker): string {
   const parts = BUCKETS.map((b) => `${b.label}: ${(w as any)[b.key]}`)
   // Spelled out rather than summed under a heading: "boshqa xodim oldi" is a fact
   // anyone can act on, "hisobga olinmagan" was a word people had to ask about.
   if (w.released) parts.push(`Boshqa xodim oldi: ${w.released}`)
   if (w.undelivered) parts.push(`Yetib bormadi: ${w.undelivered}`)
   if (w.flagged) parts.push(`«Xatolik» deb belgilangan: ${w.flagged}`)
   return parts.join(' · ')
}

/** "Makka · 3 guruh" — where a worker's needs came from this period. */
export function whereLabel(w: Worker): string {
   const cities = (w.cities || []).map(cityLabel).filter(Boolean).join(', ')
   const groups = w.group_count ? `${w.group_count} guruh` : ''
   return [cities, groups].filter(Boolean).join(' · ') || '—'
}

/** Group name for the filter dropdown; falls back to the raw id when a group has no
 *  title saved (never show an empty option — an unnamed group is still a real one). */
function groupLabel(g: GroupOption): string {
   const name = g.title || `Guruh ${g.chat_id}`
   const cities = (g.cities || []).map(cityLabel).filter(Boolean)
   return cities.length ? `${name} · ${cities.join(', ')}` : name
}

// Below this many accountable cards a percentage is noise — one lucky card would put
// somebody at 100% above a person who handled forty.
export const MIN_RANK_CARDS = 3

export const RANK_MODES = [
   { key: 'rate', label: 'Javob darajasi', unit: 'javob darajasi' },
   { key: 'completed', label: 'Bajarilgan', unit: 'bajarildi' },
   { key: 'never_accepted', label: 'Javobsiz', unit: 'javobsiz' },
] as const

// Module-level so the chosen ranking mode survives a tab switch — the Reyting screen is
// unmounted when the reader looks at the Jurnal, and coming back to a silently reset
// board reads as "the numbers changed".
export const rankMode = ref<'rate' | 'completed' | 'never_accepted'>('rate')

/** Everything derived from the store. A composable rather than a second store: it holds
 *  no state of its own, it is pure projection. */
export function useNazoratView() {
   const s = useNazoratStore()

   const isStaffScope = computed(() => s.scope === 'staff')
   const isLeaderScope = computed(() => s.scope === 'ellikboshi')

   /** "Xodim" / "Ellikboshi" — the word for one person in this account's population. */
   const personWord = computed(() => (isLeaderScope.value ? 'Ellikboshi' : 'Xodim'))
   const personWordLower = computed(() => personWord.value.toLowerCase())

   const scopeTitle = computed(() =>
      isStaffScope.value ? 'Nazorat — Xodimlar'
         : isLeaderScope.value ? 'Nazorat — Ellikboshilar'
            : 'Nazorat',
   )

   /** The Guruh dropdown. Two groups CAN carry the same Telegram title, and two
    *  identical options would leave the reader unable to tell which slice they picked —
    *  so a repeated label falls back to the chat id, which is always unique. */
   const groupChoices = computed(() => {
      const seen = new Map<string, number>()
      for (const g of s.groupOptions) {
         const l = groupLabel(g)
         seen.set(l, (seen.get(l) || 0) + 1)
      }
      return s.groupOptions.map((g) => {
         const l = groupLabel(g)
         return { chat_id: g.chat_id, label: (seen.get(l) || 0) > 1 ? `${l} · ${g.chat_id}` : l }
      })
   })

   /** Workers filtered by the lavozim (role) dropdown and the chosen name. */
   const filteredWorkers = computed(() =>
      s.workers.filter((w) => {
         if (s.filterRole && w.role !== s.filterRole) return false
         if (s.filterName && personLabel(w) !== s.filterName) return false
         return true
      }),
   )

   const workerNameOptions = computed(() =>
      [...new Set(s.workers.map(personLabel))].sort((a, b) => a.localeCompare(b)),
   )

   /** Who the bot actually FAILED to reach this period. `staff-readiness` only predicts
    *  this; an undelivered card is the proof it really happened. */
   const undeliveredPeople = computed(() =>
      s.workers.filter((w) => w.undelivered > 0)
         .map((w) => `${personLabel(w)} (${w.undelivered})`),
   )

   /** Everything on this panel that is a PROBLEM, biggest first, and nothing else.
    *  A clean period renders the calm state instead, never an empty red box. */
   const problems = computed(() => {
      const r = s.report
      if (!r) return [] as any[]
      const out: any[] = []
      if (r.never_accepted) out.push({
         key: 'never_accepted', value: r.never_accepted, label: 'Javobsiz qolgan',
         color: BUCKETS[3].color,
         hint: `Kartochka yetib bordi, lekin ${personWordLower.value} umuman qabul qilmadi.`,
      })
      if (r.reopened) out.push({
         key: 'reopened', value: r.reopened, label: 'Bajarilmagan',
         color: BUCKETS[2].color,
         hint: "Qabul qilingan edi, lekin ziyoratchi qayta so'radi — aslida hal bo'lmagan.",
      })
      // «Hech kimga yetmagan» (report.unassigned) is deliberately NOT shown. Owner rule:
      // this panel is for the CREW and the ELLIKBOSHI, and a need that reached nobody has
      // no recipient — so there is no person it is a statistic about.
      if (r.undelivered) out.push({
         key: 'undelivered', value: r.undelivered, label: 'Yetib bormagan',
         color: '#a16207',
         hint: 'Ular botni «Start» qilmagan — javob bermagani o\'zlarining aybi emas '
            + 'va hisobotda ularga yozilmaydi.',
         people: undeliveredPeople.value,
      })
      if (s.staffReadiness.length) out.push({
         key: 'readiness', value: s.staffReadiness.length, label: 'DM yuborib bo\'lmaydi',
         color: '#a16207',
         hint: 'Botni «Start» qilmagan — murojaatlar ularga umuman bormaydi. Har biri botga '
            + '/start yozishi kerak (yoki Xodimlar sahifasida Telegram ID raqamini kiriting). '
            + 'Ellikboshi qaysi guruhga biriktirilgani qavs ichida — endi kerak bo\'lmasa, '
            + 'Guruhlar sahifasidan o\'zgartiring.',
         // Say WHERE each one is still assigned. A bare @username left the office asking
         // why somebody they had already removed was on the page — the answer is always
         // "a group still names them".
         people: s.staffReadiness.map((r2) =>
            (r2.username || r2.name || '—')
            + (r2.location ? ` · ${cityLabel(r2.location)}` : '')
            + (r2.group ? ` · ${r2.group}` : '')
            + (r2.role === 'ellikboshi' && r2.in_pool === false
               ? " · ro'yxatdan o'chirilgan" : '')),
      })
      if (r.flags_neutral) out.push({
         key: 'flags_neutral', value: r.flags_neutral, label: 'Asossiz «Xatolik»',
         color: '#a16207',
         hint: 'Xodim «bot xatosi» dedi, IT esa neytral deb topdi — da\'vo tasdiqlanmadi.',
      })
      return out
   })

   const bucketTotal = computed(() => {
      const r = s.report
      if (!r) return 0
      return BUCKETS.reduce((sum, b) => sum + ((r as any)[b.key] as number || 0), 0)
   })

   const bucketRows = computed(() => {
      const r = s.report
      const total = bucketTotal.value
      return BUCKETS.map((b) => {
         const value = r ? ((r as any)[b.key] as number) : 0
         return {
            ...b, value,
            pct: total ? (value / total) * 100 : 0,
            pctLabel: total ? `${Math.round((value / total) * 100)}%` : '',
         }
      })
   })

   /** Only the non-zero slices get drawn — a 0%-wide segment is still a 2px gap. */
   const bucketSegments = computed(() => bucketRows.value.filter((b) => b.value > 0))

   /** Context, not verdict: period-level facts that belong nowhere near the colour
    *  buckets, because they count NEEDS while the buckets count recipient rows. */
   const contextStats = computed(() => {
      const r = s.report
      if (!r) return []
      return [
         {
            label: 'Murojaatlar', value: r.requests,
            hint: `${r.delivered} ta ${personWordLower.value} kartochkasi yetib bordi`,
         },
         { label: "O'rtacha javob vaqti", value: dur(r.avg_response_seconds), hint: 'DM → Qabul' },
         {
            label: 'Bot xatosi (tasdiqlangan)', value: r.bot_mistakes,
            hint: r.flags_pending ? `${r.flags_pending} ta kutilmoqda` : 'IT tasdiqlagan',
         },
      ]
   })

   /** The confirmed-mistake breakdown as [{label, count}], biggest first. */
   const errorKinds = computed(() => {
      const e = s.report?.error_kinds
      if (!e) return [] as { label: string; count: number }[]
      return Object.entries(e)
         .map(([code, count]) => ({ label: KIND_LABELS[code] || code, count }))
         .sort((a, b) => b.count - a.count)
   })

   // ── Ranking ──────────────────────────────────────────────────────────────
   const rankSort = computed(() => RANK_MODES.find((m) => m.key === rankMode.value)!)

   /** ACCOUNTABLE = accepted + never_accepted: the cards that stayed theirs. Released /
    *  undelivered / flagged are excluded, so somebody is never marked down for a card a
    *  colleague took first or one that never arrived. */
   const rankRows = computed(() =>
      filteredWorkers.value.map((w) => {
         const accountable = (w.accepted || 0) + (w.never_accepted || 0)
         const rate = accountable ? (w.accepted || 0) / accountable : 0
         const total = w.dms || 1
         const segments = BUCKETS
            .map((b) => ({ key: b.key as string, color: b.color as string, value: (w as any)[b.key] as number }))
            .concat([{ key: 'other', color: '#e5e7eb', value: uncounted(w) }])
            .filter((sg) => sg.value > 0)
            .map((sg) => ({ ...sg, pct: (sg.value / total) * 100 }))
         return {
            telegram_id: w.telegram_id,
            name: personLabel(w),
            role: w.role,
            job: jobLabel(w),
            accountable,
            rate,
            completed: w.completed || 0,
            never_accepted: w.never_accepted || 0,
            segments,
            splitHint: rowSplitHint(w),
            detail: `${w.accepted || 0}/${accountable} qabul · ${w.completed || 0} bajarildi`
               + ` · ${w.never_accepted || 0} javobsiz`
               + (whereLabel(w) !== '—' ? ` · ${whereLabel(w)}` : ''),
         }
      }),
   )

   /** Best first for the two "good" measures, worst first for Javobsiz — in every mode
    *  the TOP of the list is the person the reader is looking for. */
   function rankList(rows: any[]) {
      const m = rankMode.value
      const sorted = [...rows].sort((a, b) =>
         m === 'rate' ? (b.rate - a.rate) || (b.completed - a.completed)
            : m === 'completed' ? (b.completed - a.completed) || (b.rate - a.rate)
               : (b.never_accepted - a.never_accepted) || (a.rate - b.rate))
      return sorted.map((r) => {
         // Tone judges the VALUE, never the position: with a weak team the best response
         // rate can still be poor, and a green "1" beside a red 44% would contradict itself.
         const tone: 'good' | 'bad' | 'plain' =
            m === 'never_accepted' ? (r.never_accepted ? 'bad' : 'good')
               : m === 'completed' ? (r.completed ? 'good' : 'plain')
                  : r.rate >= 0.8 ? 'good' : r.rate < 0.5 ? 'bad' : 'plain'
         return {
            ...r,
            tone,
            headline: m === 'rate' ? `${Math.round(r.rate * 100)}%`
               : m === 'completed' ? String(r.completed) : String(r.never_accepted),
            headlineColor: tone === 'good' ? BUCKETS[0].color
               : tone === 'bad' ? (m === 'never_accepted' ? BUCKETS[3].color : BUCKETS[2].color)
                  : '#6b7280',
         }
      })
   }

   /** One board per POPULATION, never a mixed one. A crew member and an ellikboshi do not
    *  receive comparable work, so ranking them against each other would say nothing. */
   const rankGroups = computed(() => {
      const byVolume = (a: any, b: any) => b.accountable - a.accountable
      const build = (key: string, title: string, rows: any[]) => ({
         key, title,
         rows: rankList(rows.filter((r) => r.accountable >= MIN_RANK_CARDS)),
         // Too few cards to rank fairly — kept beside their own board, never hidden:
         // "received almost nothing" is itself worth seeing.
         unranked: rows.filter((r) => r.accountable < MIN_RANK_CARDS).sort(byVolume),
      })
      if (s.scope !== 'all' || s.filterRole) {
         return [build('one', `${personWord.value}lar`, rankRows.value)]
      }
      return [
         build('staff', 'Xodimlar', rankRows.value.filter((r) => r.role !== 'ellikboshi')),
         build('ellikboshi', 'Ellikboshilar', rankRows.value.filter((r) => r.role === 'ellikboshi')),
      ].filter((g) => g.rows.length || g.unranked.length)
   })

   const hasRanking = computed(() =>
      rankGroups.value.some((g) => g.rows.length || g.unranked.length))

   // ── The drill-down ───────────────────────────────────────────────────────

   /** One MUROJAAT reduced to what happened to it — not one row per recipient.
    *
    *  The old journal printed a sentence for every person a need was DM'd to, and a crew
    *  need goes to the whole city team, so roughly two of every three lines said "boshqa
    *  xodim qabul qildi". That is the same event three times. The feed asks the question
    *  the reader actually has — "what happened to this complaint" — and the per-person
    *  view lives on the person's own screen. */
   function needOutcome(r: any) {
      const recs: any[] = r.recipients || []
      const nameOf = (rec: any) => {
         const w = s.workers.find((x) => x.telegram_id === rec.telegram_id)
         return (w && personLabel(w)) || rec.username || ('ID ' + rec.telegram_id)
      }
      const taker = recs.find((rec) => rec.accepted_at)
      const flagger = recs.find((rec) => rec.flagged_at && !rec.accepted_at)
      const reached = recs.filter((rec) => rec.delivered)

      if (!reached.length) {
         return { key: 'undelivered', label: 'Yetib bormadi', color: '#9ca3af',
            detail: `${recs.length} ta ${personWordLower.value}ga yuborib bo'lmadi` }
      }
      if (taker) {
         const wait = durBetween(taker.dm_sent_at, taker.accepted_at)
         if (taker.reopened_count > 0) {
            return { key: 'reopened', label: 'Bajarilmagan', color: BUCKETS[2].color,
               detail: `${nameOf(taker)} qabul qildi — ziyoratchi qayta so'radi` }
         }
         if (r.parent_request_id && !r.reopen_dismissed) {
            return { key: 're_requests', label: "Takroriy so'rov", color: BUCKETS[1].color,
               detail: `${nameOf(taker)} · ${wait}` }
         }
         return { key: 'completed', label: 'Bajarildi', color: BUCKETS[0].color,
            detail: `${nameOf(taker)} · ${wait}` }
      }
      if (flagger) {
         return { key: 'flagged', label: 'Xatolik', color: '#6366f1',
            detail: `${nameOf(flagger)} belgiladi`
               + (flagger.it_verdict ? ` · IT: ${flagger.it_verdict}` : " · IT hali ko'rmagan") }
      }
      // Delivered to somebody, taken by nobody.
      const oldest = reached.reduce((a, b) =>
         new Date(a.dm_sent_at || 0) < new Date(b.dm_sent_at || 0) ? a : b)
      return { key: 'never_accepted', label: 'Javobsiz', color: BUCKETS[3].color,
         detail: `${reached.length} ta ${personWordLower.value}ga bordi · `
            + `${durBetween(oldest.dm_sent_at, null)}dan beri javobsiz` }
   }

   /** The feed: newest first, one card per murojaat. */
   const feed = computed(() =>
      [...s.requests]
         .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .map((r) => ({
            id: r.id,
            text: r.text,
            created_at: r.created_at,
            group_label: r.group_title || `Guruh ${r.chat_id}`,
            city: r.location,
            room_no: r.room_no,
            pilgrim_username: r.pilgrim_username,
            message_link: r.message_link,
            is_repeat: !!r.parent_request_id && !r.reopen_dismissed,
            outcome: needOutcome(r),
            recipients: r.recipients || [],
         })),
   )

   /** The other way into the journal: BY PERSON, which is how the panel was read before
    *  the feed existed — you look for Ali, you tap Ali, you get Ali's log. The count is
    *  of the loaded window, same as the list it opens, so the two always agree.
    *  Busiest first, and it honours the lavozim / ism filters like the old list did. */
   const journalPeople = computed(() => {
      const byId = new Map(s.workers.map((w) => [w.telegram_id, w]))
      const counts = new Map<number, any>()
      for (const r of s.requests) {
         for (const rec of (r.recipients || [])) {
            let p = counts.get(rec.telegram_id)
            if (!p) {
               const w = byId.get(rec.telegram_id)
               p = {
                  telegram_id: rec.telegram_id,
                  name: (w && personLabel(w)) || rec.username || ('ID ' + rec.telegram_id),
                  role: rec.role,
                  job: w ? jobLabel(w) : (rec.role === 'ellikboshi' ? 'Ellikboshi' : 'Xodim'),
                  count: 0,
               }
               counts.set(rec.telegram_id, p)
            }
            p.count++
         }
      }
      return [...counts.values()]
         .filter((p) => !s.filterRole || p.role === s.filterRole)
         .filter((p) => !s.filterName || p.name === s.filterName)
         .sort((a, b) => b.count - a.count)
   })

   /** The needs behind «Javobsiz qolgan», each with the people it reached who never took
    *  it — and the JOB each of them holds, which explains why they were asked. */
   const unansweredNeeds = computed(() => {
      const byId = new Map(s.workers.map((w) => [w.telegram_id, w]))
      const out: any[] = []
      for (const r of s.requests) {
         const ignored = (r.recipients || []).filter((rec: any) =>
            rec.delivered && !rec.accepted_at && !rec.flagged_at && !rec.released_at)
         if (!ignored.length) continue
         out.push({
            id: r.id, text: r.text, created_at: r.created_at,
            group_label: r.group_title || `Guruh ${r.chat_id}`,
            city: r.location, room_no: r.room_no, pilgrim_username: r.pilgrim_username,
            message_link: r.message_link,
            ignored: ignored.map((rec: any) => {
               const w = byId.get(rec.telegram_id)
               return {
                  telegram_id: rec.telegram_id,
                  name: (w && personLabel(w)) || rec.username || ('ID ' + rec.telegram_id),
                  role: rec.role,
                  job: w ? jobLabel(w) : (rec.role === 'ellikboshi' ? 'Ellikboshi' : 'Xodim'),
               }
            }),
         })
      }
      return out
   })

   /** One request turned into a plain Uzbek sentence, plus the colour of its outcome.
    *  Still used on a PERSON's own screen, where the question really is "what did THIS
    *  person do about it" and a released card is a real answer. */
   function entrySummary(e: any): { text: string; rail: string; ink: string } {
      const sent = fmtTime(e.dm_sent_at)
      const who = personWord.value
      // TWO colours per outcome: `rail` is the MARK (a 2px bar, which only has to be
      // seen) and `ink` is the TEXT (which has to be READ). The bucket amber is 2.15:1
      // on this surface — legible as a bar, not as a sentence.
      const MUTED = '#9ca3af'
      const INK = '#4b5563'
      if (!e.delivered)
         return { text: `${who}ga yetib bormadi.`, rail: MUTED, ink: MUTED }
      if (e.flagged_at)
         return {
            text: `${sent} da yuborildi. ${who} «Xatolik» deb belgiladi`
               + (e.it_verdict ? ` (IT: ${e.it_verdict}).` : " (IT hali ko'rmagan)."),
            rail: '#6366f1', ink: '#4338ca',
         }
      if (e.released_at) {
         const c = e.claimed_by
         const verb = c && c.flagged ? '«Xatolik» deb belgiladi' : 'qabul qildi'
         return {
            text: `${sent} da yuborildi. Boshqa ${personWordLower.value} ${verb}${c ? ` (${c.name})` : ''}.`,
            rail: MUTED, ink: MUTED,
         }
      }
      if (!e.accepted_at)   // delivered but never taken
         return {
            text: `${sent} da yuborildi. ${who} hali qabul qilmadi (javobsiz: ${durBetween(e.dm_sent_at, null)}).`,
            rail: BUCKETS[3].color, ink: '#1d4ed8',
         }
      const acc = fmtTime(e.accepted_at)
      const wait = durBetween(e.dm_sent_at, e.accepted_at)
      if (e.reopened_count > 0)   // accepted, but the pilgrim came back -> false completion
         return {
            text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}), LEKIN ziyoratchi qayta so'radi — bajarilmagan.`,
            rail: BUCKETS[2].color, ink: '#b91c1c',
         }
      if (e.parent_request_id && !e.reopen_dismissed)   // accepted follow-up
         return {
            text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}) — takroriy so'rov, bajarildi.`,
            rail: BUCKETS[1].color, ink: INK,
         }
      return {   // clean single-pass completion
         text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}) — bajarildi.`,
         rail: BUCKETS[0].color, ink: INK,
      }
   }

   /** Every request ONE person was DM'd about, newest first — the evidence behind their
    *  row. Built for the person screen, so it takes the id rather than filters. */
   function entriesFor(telegramId: number) {
      const nameById = new Map(s.workers.map((w) => [w.telegram_id, w.name]))
      const out: any[] = []
      for (const r of s.requests) {
         const rec = (r.recipients || []).find((x: any) => x.telegram_id === telegramId)
         if (!rec) continue
         // For a released row, name the colleague who actually took (or flagged) the need.
         const sib = r.recipients.find((o: any) =>
            o.telegram_id !== telegramId && (o.accepted_at || o.flagged_at))
         const e = {
            id: r.id, text: r.text, parent_request_id: r.parent_request_id,
            reopen_dismissed: r.reopen_dismissed, message_link: r.message_link,
            group_label: r.group_title || `Guruh ${r.chat_id}`,
            city: r.location, room_no: r.room_no, pilgrim_username: r.pilgrim_username,
            created_at: r.created_at, delivered: rec.delivered, it_verdict: rec.it_verdict,
            dm_sent_at: rec.dm_sent_at, accepted_at: rec.accepted_at,
            flagged_at: rec.flagged_at, released_at: rec.released_at,
            reopened_count: rec.reopened_count,
            claimed_by: sib
               ? {
                  name: nameById.get(sib.telegram_id) || sib.username || ('ID ' + sib.telegram_id),
                  flagged: !sib.accepted_at && !!sib.flagged_at,
               }
               : null,
         }
         out.push({ ...e, sum: entrySummary(e) })
      }
      return out.sort((a, b) =>
         new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   }

   return {
      personWord, personWordLower, scopeTitle, isStaffScope, isLeaderScope,
      groupChoices, filteredWorkers, workerNameOptions,
      problems, bucketRows, bucketTotal, bucketSegments, contextStats, errorKinds,
      rankSort, rankGroups, hasRanking,
      feed, journalPeople, unansweredNeeds, entriesFor,
   }
}

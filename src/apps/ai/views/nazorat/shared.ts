import { computed, ref } from 'vue'
import { useNazoratStore, type GroupOption, type Worker } from '../../stores/nazorat'

/** The vocabulary of the Nazorat panel — colours, labels and the small pure helpers —
 *  defined ONCE so the three screens can never drift from each other. */

/** THREE outcomes since 2026-08-07, not four. «Takroriy so'rov» was the fourth and was
 *  never an outcome: green, amber and blue all answer "what did the worker do", while it
 *  answered "which message is this" — which is why no rewording ever told it apart from
 *  Bajarilmagan. One repeat wrote two graded cards for one event, and the second landed
 *  on whoever picked the complaint up and fixed it. A repeat is now counted once, as
 *  Bajarilmagan on the accept that turned out to be false, and the takroriy count rides
 *  under Bajarildi as a subset. `is_repeat` still badges the row in the jurnal.
 *
 *  Bajarilmagan is AMBER, not red (owner's call, same day). Red is no longer an outcome
 *  colour at all — see ALARM_RED, which now belongs to the angry pilgrim and the
 *  confirmed bot mistake, the two things that are not somebody's daily grade.
 *
 *  Palette: validated with the dataviz skill's checker against a white surface. All
 *  pairs PASS — lightness band, chroma floor, CVD separation (worst pair ΔE 13.0 protan,
 *  target ≥8) and the normal-vision floor (24.0, floor 15). Amber sits below 3:1
 *  contrast, so it is never the only carrier of meaning: every use is paired with a
 *  visible label, and table VALUES are ink with the colour reduced to a header dot. */
export const BUCKETS = [
   {
      key: 'completed', label: 'Bajarildi', short: 'Bajarildi', color: '#059669',
      hint: "qabul qilingan, ziyoratchi qayta so'ramagan",
   },
   {
      key: 'reopened', label: 'Bajarilmagan', short: 'Bajarilmagan', color: '#f59e0b',
      hint: "qabul qilingan, lekin ziyoratchi keyin yana so'ragan —"
         + ' demak aslida bajarilmagan',
   },
   {
      key: 'never_accepted', label: 'Javobsiz', short: 'Javobsiz', color: '#3b82f6',
      // No unit word: the same hint labels a complaint on the overview and one person's
      // card on the ranking, and naming one of them would be wrong on the other screen.
      hint: 'yetib bordi, lekin umuman qabul qilinmadi',
   },
] as const

/** By key, because a bucket's POSITION is not a fact about it. Every BUCKETS[2] in the
 *  panel silently meant something different the moment the fourth one was removed. */
export const BUCKET = Object.fromEntries(BUCKETS.map((b) => [b.key, b])) as
   Record<string, { key: string; label: string; short: string; color: string; hint: string }>

/** Red, reserved. Not an outcome — nobody's daily grade is red any more — so it is free
 *  to mean the two things that must never be read as routine: a pilgrim who is angry
 *  right now, and a bot mistake the office has confirmed. */
export const ALARM_RED = '#ef4444'

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

/** Whose BOARD a person belongs on — an owner decision (2026-08-04), and a presentation
 *  one only: the doctor is counted with the ellikboshilar, not with the crew.
 *
 *  The reason is the same one that already keeps the doctor out of the whole-crew tag:
 *  they receive ONLY health needs, so a handful of cards against a crew member's forty
 *  reads as neglect on a shared board when in fact they were never sent the other work.
 *  They stay a doctor everywhere it matters — the badge still says «Shifokor», the bot's
 *  routing and answers are untouched — this decides one thing, which list they are
 *  ranked in. */
export function isLeaderLevel(p: { role: string; staff_role?: string | null }): boolean {
   return p.role === 'ellikboshi' || p.staff_role === 'doctor'
}

/** The lavozim dropdown, honouring the same regrouping — picking «Ellikboshi» must
 *  return exactly the people the Ellikboshilar board holds, or the two disagree. */
export function matchesRoleFilter(
   p: { role: string; staff_role?: string | null }, filter: string,
): boolean {
   if (!filter) return true
   return filter === 'ellikboshi' ? isLeaderLevel(p) : !isLeaderLevel(p)
}

/** Up to two initials for the avatar disc. Falls back to the @username, and then to a
 *  dot rather than an empty circle — a row with no letters at all still needs an anchor. */
export function initials(name: string): string {
   const words = (name || '').replace(/^@/, '').trim().split(/[\s._-]+/).filter(Boolean)
   if (!words.length) return '•'
   const letters = words.slice(0, 2).map((w) => w[0]).join('')
   return letters.toUpperCase()
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

/** "Makka · 3 guruh" — where a worker's needs came from this period.
 *
 *  PERIOD-SCOPED, and the only group figure on this screen: it counts the groups whose
 *  needs reached this person inside the selected window, so it moves with the Kunlik /
 *  Haftalik / Oylik selector. The standing "how many groups does this leader hold" total
 *  lives on the Guruhlar screen instead — it does not depend on the period, and a list
 *  that drops people for being quiet is the wrong place to read it (owner, 2026-08-05). */
export function whereLabel(w: Worker): string {
   const cities = (w.cities || []).map(cityLabel).filter(Boolean).join(', ')
   const groups = w.group_count ? `${w.group_count} guruhdan` : ''
   return [cities, groups].filter(Boolean).join(' · ') || '—'
}

/** Group name for the filter dropdown; falls back to the raw id when a group has no
 *  title saved (never show an empty option — an unnamed group is still a real one). */
function groupLabel(g: GroupOption): string {
   const name = g.title || `Guruh ${g.chat_id}`
   const cities = (g.cities || []).map(cityLabel).filter(Boolean)
   return cities.length ? `${name} · ${cities.join(', ')}` : name
}

/** Reyting is one pie per outcome, sliced by person (owner, 2026-08-07) — «who are the
 *  javobsiz ones» rather than a table to read down. Six segments is the readable ceiling
 *  for a pie, so five people are drawn and the rest fold into «Boshqalar».
 *
 *  Each pie is a ramp of its OWN category's colour, light→dark by share. Slices are
 *  people, which normally calls for a categorical palette — but this panel has no hues
 *  spare (the outcomes hold green/amber/blue and red is the alarm), and nine per-person
 *  hues would collide with the vocabulary the reader has just learned. A single-hue ramp
 *  keeps every pie unmistakably its own category, and identity comes from the legend
 *  beside each slice, never from the colour.
 *
 *  Ramps validated with the dataviz skill's checker (--ordinal, light surface): all three
 *  PASS monotone lightness, adjacent ΔL ≥ 0.06, and a light end clearing 2:1 on white.
 *  Amber has the least room — its lightest legal step IS the bucket colour — so it runs
 *  amber → brown rather than starting pale. */
export const PIE_MAX = 5
export const RATING_RAMPS: Record<string, string[]> = {
   completed: ['#34c79a', '#0aa87c', '#058560', '#046a4c', '#035038', '#023626'],
   reopened: ['#f59e0b', '#d3870a', '#b06f08', '#8d5807', '#6b4205', '#492c03'],
   never_accepted: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281', '#0b2d59'],
}

// Module-level so the chosen tab survives a screen switch — Reyting is unmounted while
// the reader is in the Jurnal, and coming back to a silently reset board reads as "the
// numbers changed".
export const ratingTab = ref<'ellikboshi' | 'staff'>('ellikboshi')

/** Percentages -> stroke dasharray/offset for one ring, so the panel's rings are all
 *  drawn by the same arithmetic. A dash is a length along the circumference, which is
 *  exactly what a share of a whole is — no arc-sweep maths to get wrong at 0% and 100%.
 *
 *  `gap` separates neighbours (a colour change alone is not reliable at these widths); a
 *  lone 100% slice gets none, since a gap with no neighbour reads as a nick. The 1-unit
 *  floor keeps a one-in-three-hundred slice visible, losing under a pixel. */
/** The radius every ring on the panel is drawn at, inside a 120×120 viewBox. The SIZE
 *  differences between screens are done in CSS on the wrapper, so the geometry stays one
 *  number and the two rings can never drift apart. */
export const PIE_R = 46

export function ringDashes(pcts: number[], radius: number, gap = 3) {
   const C = 2 * Math.PI * radius
   const g = pcts.length > 1 ? gap : 0
   let start = 0
   return pcts.map((p) => {
      const len = (p / 100) * C
      const dash = Math.max(len - g, 1)
      const seg = { dash: `${dash} ${C - dash}`, offset: -start }
      start += len
      return seg
   })
}

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
      isStaffScope.value ? 'Nazorat, Xodimlar'
         : isLeaderScope.value ? 'Nazorat, Ellikboshilar'
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

   /** Workers filtered by the lavozim (role) dropdown and the chosen name. The lavozim
    *  test goes through matchesRoleFilter so it agrees with the boards below — where the
    *  doctor is ranked with the ellikboshilar. */
   const filteredWorkers = computed(() =>
      s.workers.filter((w) => {
         if (!matchesRoleFilter(w, s.filterRole)) return false
         if (s.filterName && personLabel(w) !== s.filterName) return false
         return true
      }),
   )

   // The name dropdown that fed this is gone with the old ranking table (owner,
   // 2026-08-07). Finding one person is what the Jurnal's «Xodimlar» list is for, and
   // it lands on their own screen instead of narrowing a board to a single row.

   /** Everything on this panel that is a PROBLEM, biggest first, and nothing else.
    *  A clean period renders the calm state instead, never an empty red box.
    *
    *  The wording is deliberately as short as it can be while still saying the thing
    *  that makes each one actionable — these are notifications now, read in a panel and
    *  dismissed, not paragraphs read on the main screen. Each one keeps exactly one
    *  fact beyond its own label: what happened, or what to do about it. */
   const problems = computed(() => {
      const r = s.report
      if (!r) return [] as any[]
      const out: any[] = []
      // TWO things only, owner 2026-08-07: an angry pilgrim, and a job somebody said was
      // done and was not. Everything else this bell used to raise — «Javobsiz qolgan»,
      // «DM yuborib bo'lmaydi», «Asossiz Xatolik» — is a number on a screen, and a
      // notification that fires for every number is one nobody reads.
      //
      // The aggression alarm leads, and not because it is bigger: the other one is a
      // failure that already happened, this one is a pilgrim who is angry NOW.
      if (s.aggressive.total) out.push({
         key: 'aggressive', value: s.aggressive.total, label: 'Qattiq norozilik',
         color: ALARM_RED,
         hint: 'Ziyoratchi keskin yozdi — ellikboshi darhol hal qilishi kerak.',
      })
      if (r.reopened) out.push({
         key: 'reopened', value: r.reopened, label: 'Bajarilmagan',
         color: BUCKET.reopened.color,
         hint: "Qabul qilingan, lekin ziyoratchi keyin yana so'ragan.",
      })
      // Back on the bell by owner request (2026-08-07). It earns its place for the
      // opposite reason to the other two: nothing has failed YET. These people never
      // pressed start, so the bot cannot DM them at all — their cards simply never
      // arrive, and the panel would score that as «Yetib bormadi» rather than as the
      // one thing here that can be fixed before it costs anybody anything.
      if (s.staffReadiness.length) out.push({
         key: 'readiness', value: s.staffReadiness.length, label: "DM yuborib bo'lmadi",
         color: '#a16207',
         // Owner's wording, 2026-07-31. It reads as a label for the chips right under
         // it rather than as a sentence about them, which is why it ends in a colon.
         hint: 'Botga start bermaganlar:',
         people: s.staffReadiness.map((r2) =>
            (r2.username || r2.name || '—')
            + (r2.location ? ` · ${cityLabel(r2.location)}` : '')
            + (r2.group ? ` · ${r2.group}` : '')
            + (r2.role === 'ellikboshi' && r2.in_pool === false
               ? " · ro'yxatdan o'chirilgan" : '')),
      })
      return out
   })

   /** The needs behind «Bajarilmagan», newest first — the messages a worker accepted and
    *  the pilgrim then had to raise again. Graded through needOutcome so the list and the
    *  count above it can never be different sets of things. */
   const reopenedNeeds = computed(() =>
      [...s.requests]
         .filter((r) => needOutcome(r).key === 'reopened')
         .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .map((r) => ({
            id: r.id, text: r.text, created_at: r.created_at,
            group_label: r.group_title || `Guruh ${r.chat_id}`,
            city: r.location, room_no: r.room_no, pilgrim_username: r.pilgrim_username,
            message_link: r.message_link,
            taker: needOutcome(r).detail,
         })),
   )

   /** What the bell actually shows: the problems that have not been cleared AT THEIR
    *  CURRENT VALUE. A cleared notice returns by itself the moment its number moves. */
   const activeProblems = computed(() =>
      problems.value.filter((p: any) => s.dismissed[p.key] !== p.value))

   /** Cleared, and still true. Counted so the panel can say so rather than showing an
    *  empty list that reads as "nothing is wrong" — those are opposite things. */
   const clearedCount = computed(() =>
      problems.value.length - activeProblems.value.length)

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

   /** Context, not verdict: period-level facts that sit outside the colour buckets
    *  because they are not outcomes — the total, how long an answer took, and what the
    *  bot got wrong. They are in the buckets' own unit (one complaint) since 2026-08-07;
    *  the one card-unit number left on this screen is «N ta kartochka yetib bordi», which
    *  says its unit out loud because it is the fan-out: 11 murojaat, 15 kartochka.
    *
    *  Their icons carry colour (owner, 2026-08-06: an all-ink overview read as flat).
    *  The hues are chosen to sit OUTSIDE the outcome vocabulary rather than picked for
    *  variety: violet and cyan are nowhere near the green / amber / red / blue of
    *  BUCKETS, so a tinted disc up here can never be mistaken for a grade. The bot
    *  mistake is the deliberate exception - it is an error, so it belongs in the red
    *  family, and it is drawn in the buckets' own red rather than a second, nearly
    *  identical one. */
   const contextStats = computed(() => {
      const r = s.report
      if (!r) return []
      return [
         // «Murojaatlar» is deliberately NOT here any more (owner, 2026-08-07). The
         // period's total is the number in the ring's hole, and this tile was the last
         // place a CARD count appeared on the overview — its hint read «N ta kartochka
         // yetib bordi». The office reads this panel in complaints; how many people one
         // complaint was DM'd to belongs on that complaint's own jurnal card, not in a
         // headline over the whole day.
         // «O'rtacha javob vaqti» is no longer a tile either (owner, 2026-08-07): it now
         // leads its own card, with the same figure per person underneath it. A tile
         // repeating the number two cards above it would be the third place on one screen
         // claiming to be the period's headline.
         {
            key: 'mistakes', label: 'Bot xatosi (tasdiqlangan)', value: r.bot_mistakes,
            icon: 'triangle-exclamation', color: ALARM_RED,
            // Only when there IS a queue. «IT tasdiqlagan» used to fill this line
            // otherwise, which restated the label's own «(tasdiqlangan)» — the hint slot
            // is for a number the tile would not otherwise carry, not for prose.
            hint: r.flags_pending ? `${r.flags_pending} ta kutilmoqda` : '',
         },
      ]
   })

   /** Response time per person, SLOWEST FIRST — the same rule the ranking follows: the
    *  person the reader is looking for is at the top.
    *
    *  Deliberately a ranked bar list and not a second ring (owner asked for a donut,
    *  2026-08-07). Two reasons, both measured rather than felt:
    *
    *    * A donut is parts of a whole, and average response times are not parts of
    *      anything — they don't sum. The only real part-to-whole here is each person's
    *      share of the TOTAL wait, which would make the arc mean one quantity while the
    *      number printed beside it means another: a fat slice labelled «4 daq» next to a
    *      thin one labelled «20 daq». In a bar, the length IS the number beside it.
    *    * Slices would need one hue per person, and this panel has no hues left to give.
    *      The four grades own green / amber / red / blue, and the accent violet #7c5cfc
    *      sits ΔE 2.5 from the Javobsiz blue under deuteranopia — a violet slice reads as
    *      «Javobsiz» to a deutan reader, one card below a ring where blue means exactly
    *      that. One hue for all bars, with the name as the label, has no such problem.
    *
    *  `share` is against the SLOWEST person, not against the total: the bar answers "how
    *  much longer than the worst" — which is the comparison a reader actually makes —
    *  and it guarantees the top bar is full rather than 8% of a meaningless whole.
    *
    *  Only people who actually answered something appear: an average over no accepts is
    *  not a fast worker, it is no data, and drawing them at 0 would put whoever ignored
    *  everything at the top of a list of the best. */
   const responseRows = computed(() => {
      const rows = filteredWorkers.value
         .filter((w) => w.avg_response_seconds !== null && w.avg_response_seconds !== undefined)
         .map((w) => ({
            telegram_id: w.telegram_id,
            name: personLabel(w),
            initials: initials(personLabel(w)),
            job: jobLabel(w),
            leaderLevel: isLeaderLevel(w),
            seconds: w.avg_response_seconds as number,
            answered: w.accepted || 0,
            label: dur(w.avg_response_seconds),
         }))
         .sort((a, b) => b.seconds - a.seconds)
      // Scaled against the slowest ACROSS BOTH groups, not per group: two sections each
      // with a full-width top bar would say the slowest ellikboshi and the slowest xodim
      // waited the same, which is the one comparison the card exists to make.
      const worst = rows.length ? rows[0].seconds : 0
      const withShare = rows.map((r) => ({
         ...r,
         // Floor of 4%: somebody who answered in seconds still gets a visible mark, and
         // an invisible bar reads as missing data rather than as "very fast".
         share: worst > 0 ? Math.max((r.seconds / worst) * 100, 4) : 4,
      }))
      // Ellikboshilar first, then the crew (owner, 2026-08-07). Same split and the same
      // doctor-rides-with-the-leaders rule as the ranking boards, so a person is never in
      // one group here and the other one there.
      return [
         { key: 'ellikboshi', title: 'Ellikboshilar', rows: withShare.filter((r) => r.leaderLevel) },
         { key: 'staff', title: 'Ishchi guruh', rows: withShare.filter((r) => !r.leaderLevel) },
      ].filter((g) => g.rows.length)
   })

   /** The confirmed-mistake breakdown as [{label, count}], biggest first. */
   const errorKinds = computed(() => {
      const e = s.report?.error_kinds
      if (!e) return [] as { label: string; count: number }[]
      return Object.entries(e)
         .map(([code, count]) => ({ label: KIND_LABELS[code] || code, count }))
         .sort((a, b) => b.count - a.count)
   })

   // ── Reyting: one pie per outcome, sliced by person ───────────────────────

   /** Two boards, ellikboshilar first, and NEVER a mixed one: a crew member and a leader
    *  do not receive comparable work — the crew get every room/service need for their
    *  city, a leader only their own group's questions — so one ranking across both would
    *  say nothing. The doctor rides with the leaders, same rule as everywhere else
    *  (isLeaderLevel), because they only ever receive health needs.
    *
    *  This replaced a sortable table with a lavozim filter and a name filter (owner,
    *  2026-08-07). The tabs ARE the lavozim filter, and a pie answers the question the
    *  table made you read for: not "rank these people" but "who are the javobsiz ones". */
   function pies(rows: Worker[]) {
      return BUCKETS.map((b) => {
         const ramp = RATING_RAMPS[b.key]
         const people = rows
            .map((w) => ({
               telegram_id: w.telegram_id,
               name: personLabel(w),
               initials: initials(personLabel(w)),
               job: jobLabel(w),
               value: ((w as any)[b.key] as number) || 0,
            }))
            .filter((p) => p.value > 0)
            .sort((a, c) => c.value - a.value)
         const total = people.reduce((sum, p) => sum + p.value, 0)
         const head = people.slice(0, PIE_MAX)
         const tail = people.slice(PIE_MAX)
         const slices = head.map((p, i) => ({
            ...p, color: ramp[i], pct: total ? (p.value / total) * 100 : 0,
         }))
         if (tail.length) {
            // Not a person, so deliberately NOT tappable: telegram_id 0 opens nothing.
            // The count is still honest — silently dropping the tail would make five
            // people look like the whole board.
            const rest = tail.reduce((sum, p) => sum + p.value, 0)
            slices.push({
               telegram_id: 0, name: `Yana ${tail.length} kishi`, initials: '+',
               job: '', value: rest, color: ramp[PIE_MAX],
               pct: total ? (rest / total) * 100 : 0,
            })
         }
         // Geometry attached here rather than called from the template: the template
         // needs two values per slice, and a helper called per binding would rebuild the
         // whole ring's arithmetic once for every arc it draws.
         const geo = ringDashes(slices.map((sl) => sl.pct), PIE_R)
         return {
            key: b.key, label: b.label, color: b.color, hint: b.hint, total,
            slices: slices.map((sl, i) => ({ ...sl, ...geo[i] })),
         }
      })
   }

   const ratingBoards = computed(() => [
      {
         key: 'ellikboshi', title: 'Ellikboshilar',
         people: filteredWorkers.value.filter((w) => isLeaderLevel(w)),
      },
      {
         key: 'staff', title: 'Ishchi guruh',
         people: filteredWorkers.value.filter((w) => !isLeaderLevel(w)),
      },
   ].filter((b) => b.people.length).map((b) => ({ ...b, pies: pies(b.people) })))

   /** The board actually shown. A scoped controller only ever has one, and the tab they
    *  last chose may not exist in it — falling back rather than rendering nothing. */
   const ratingBoard = computed(() =>
      ratingBoards.value.find((b) => b.key === ratingTab.value) || ratingBoards.value[0] || null)

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
      // The EARLIEST accept, not whichever row came back first: accepting a staff card
      // releases the colleagues so a need normally has one taker, but a leader card
      // releases nobody and two ellikboshilar can both claim one need. Taking the first
      // means this and the server's _need_outcome grade off the same row — the overview's
      // counts ARE this list counted, so they cannot classify a need differently.
      const taker = recs.filter((rec) => rec.accepted_at)
         .sort((a, b) => new Date(a.accepted_at).getTime() - new Date(b.accepted_at).getTime())[0]
      const flagger = recs.find((rec) => rec.flagged_at && !rec.accepted_at)
      const reached = recs.filter((rec) => rec.delivered)

      if (!reached.length) {
         return { key: 'undelivered', label: 'Yetib bormadi', color: '#9ca3af',
            icon: 'plane-arrival',
            detail: `${recs.length} ta ${personWordLower.value}ga yuborib bo'lmadi` }
      }
      if (taker) {
         const wait = durBetween(taker.dm_sent_at, taker.accepted_at)
         if (taker.reopened_count > 0) {
            return { key: 'reopened', label: 'Bajarilmagan', color: BUCKET.reopened.color,
               icon: 'circle-exclamation',
               detail: `${nameOf(taker)} qabul qildi, ziyoratchi keyin yana so'radi` }
         }
         // A repeat is NOT a separate outcome — it is done, by whoever took it. The row
         // still says so, in the detail and in the «Takroriy» badge the jurnal prints
         // before the text, but the GRADE is the same green a first-time need gets.
         return { key: 'completed', label: 'Bajarildi', color: BUCKET.completed.color,
            icon: 'circle-check',
            detail: `${nameOf(taker)} · ${wait}`
               + (r.parent_request_id && !r.reopen_dismissed ? " · oldin ham so'ralgan" : '') }
      }
      if (flagger) {
         // Slate, deliberately outside the four-colour vocabulary. A card marked
         // «Xatolik» is a statement about the BOT, not an outcome the person is
         // accountable for, so it must not read as a fifth grade next to the four that
         // are. The old indigo sat close enough to the panel's former violet chrome to
         // look like decoration.
         return { key: 'flagged', label: 'Xatolik', color: '#64748b',
            icon: 'triangle-exclamation',
            detail: `${nameOf(flagger)} belgiladi`
               + (flagger.it_verdict ? ` · IT: ${flagger.it_verdict}` : " · IT hali ko'rmagan") }
      }
      // Delivered to somebody, taken by nobody.
      const oldest = reached.reduce((a, b) =>
         new Date(a.dm_sent_at || 0) < new Date(b.dm_sent_at || 0) ? a : b)
      return { key: 'never_accepted', label: 'Javobsiz', color: BUCKET.never_accepted.color,
         icon: 'clock',
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
               const name = (w && personLabel(w)) || rec.username || ('ID ' + rec.telegram_id)
               p = {
                  telegram_id: rec.telegram_id,
                  name,
                  initials: initials(name),
                  role: rec.role,
                  // The recipient row only knows staff-vs-leader; the JOB (and therefore
                  // whether this is the doctor) lives on the worker row.
                  leaderLevel: w ? isLeaderLevel(w) : rec.role === 'ellikboshi',
                  job: w ? jobLabel(w) : (rec.role === 'ellikboshi' ? 'Ellikboshi' : 'Xodim'),
                  count: 0,
               }
               counts.set(rec.telegram_id, p)
            }
            p.count++
         }
      }
      return [...counts.values()]
         .filter((p) => matchesRoleFilter(
            { role: p.leaderLevel ? 'ellikboshi' : p.role }, s.filterRole))
         .filter((p) => !s.filterName || p.name === s.filterName)
         .sort((a, b) => b.count - a.count)
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
            rail: '#64748b', ink: '#475569',
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
            rail: BUCKET.never_accepted.color, ink: '#1d4ed8',
         }
      const acc = fmtTime(e.accepted_at)
      const wait = durBetween(e.dm_sent_at, e.accepted_at)
      // The two ends of one event again — see BUCKETS. On this screen the sentences are
      // long enough to say which ask the card is outright, so they do.
      if (e.reopened_count > 0)   // accepted, but the pilgrim came back -> false completion
         return {
            text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}), LEKIN ziyoratchi keyin yana so'radi. Bajarilmagan.`,
            rail: BUCKET.reopened.color, ink: '#a16207',
         }
      if (e.parent_request_id && !e.reopen_dismissed)   // accepted follow-up
         return {
            text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}). Ziyoratchi buni oldin ham so'ragan edi — takroriy so'rov.`,
            rail: BUCKET.completed.color, ink: INK,
         }
      return {   // clean single-pass completion
         text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}). Bajarildi.`,
         rail: BUCKET.completed.color, ink: INK,
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
      groupChoices, filteredWorkers,
      problems, activeProblems, clearedCount,
      bucketRows, bucketTotal, bucketSegments, contextStats, errorKinds, responseRows,
      reopenedNeeds,
      ratingBoards, ratingBoard,
      feed, journalPeople, entriesFor,
   }
}

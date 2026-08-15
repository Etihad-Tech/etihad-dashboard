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

/** What to CALL that group, which is not always «Ellikboshilar».
 *
 *  The staff controller's login never sees a leader — the API filters them out — but the
 *  doctor is a xodim, so they survive that filter and then land in the leader-level group
 *  by the rule above. That login was being shown a board headed «Ellikboshilar» holding
 *  one Shifokor and nobody else (owner asked whether the scoped accounts were affected,
 *  2026-08-08; they were).
 *
 *  So the group is named after who is in it. A heading is a claim about its contents, and
 *  this one was false for exactly the account that can never check it against the other
 *  population. */
export function leaderGroupTitle(people: { role: string }[]): string {
   return people.some((p) => p.role === 'ellikboshi') ? 'Ellikboshilar' : 'Shifokor'
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

/** The same duration, short enough to sit on top of a column ~60px wide on a phone:
 *  «5s 33d», «17d», «3d». The full wording stays in the column's title and on the
 *  person's own screen — this is the label, not the record. */
export function durCompact(s: number | null): string {
   if (s === null || s === undefined) return '—'
   if (s < 60) return `${Math.round(s)}s`
   const m = Math.floor(s / 60)
   if (m < 60) return `${m}d`
   const h = Math.floor(m / 60)
   const rem = m % 60
   return rem ? `${h}s ${rem}d` : `${h}s`
}

/** Below this many answers an average is not yet a fact about the person — one card of
 *  5 soat 33 daq is an incident, not a habit. Such columns are hatched rather than
 *  hidden, and they do not set the chart's scale: the number is real, its WEIGHT is what
 *  differs. The hatching and the answer count under each name carry that on their own —
 *  the sentence that used to explain it came off with the rest of the panel's prose. */
export const MIN_SAMPLE = 3

/** Candidate axis steps, in seconds — 1/5/10/15/30 min, then 1/2/3/6/12 h. The chart
 *  takes the first that fits the peak in four steps or fewer, so the gridlines always
 *  land on a duration a person would say out loud. */
export const AXIS_STEPS = [60, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200]

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
 *  javobsiz ones» rather than a table to read down.
 *
 *  DISTINCT HUES, not one ramp (owner, same day: the single-colour version was hard to
 *  read). A ramp passed the contrast checks and still failed the only job the colour has
 *  here — tying an arc to its row — because six steps of one hue are not six things a
 *  reader can tell apart at a glance.
 *
 *  THREE named people, then «Boshqalar». That cap is the price of the hues: a pie is an
 *  all-pairs form (any slice can be compared with any other), and the dataviz skill's own
 *  gate is that only three categorical slots clear all-pairs — past three, colours stop
 *  being reliably distinguishable and the palette is lying about how many things it can
 *  separate. Five faint steps of one hue was the same lie told differently.
 *
 *  The hues are deliberately NOT the panel's own: green, amber and blue mean an OUTCOME
 *  here, and a person's slice must never read as a grade. Chosen by measurement, not
 *  taste — validated all-pairs (light surface) against the three outcome colours, which
 *  are on this very screen as the pie-title dots:
 *
 *    violet #4a3aa7 · magenta #e87ba4 · rust #9a3412   →  ALL CHECKS PASS
 *
 *  Two candidates were rejected by the same run and are worth recording so nobody tries
 *  them again: aqua #1baf7a sits ΔE 7.4 from «Bajarildi» green at NORMAL vision (below
 *  the floor of 15 — a green-looking person), and a second violet #a21caf sits ΔE 2.1
 *  from this one under protanopia. The remaining sub-floor pair in the palette is magenta
 *  against ALARM_RED, at 13.3 — allowed only because red never appears on this screen at
 *  all; it belongs to the bell and the bot-mistake tile.
 *
 *  Magenta is under 3:1 on white, so the relief rule applies: every slice carries a
 *  visible label in the legend beside it, and the arcs are separated by a real gap.
 *
 *  Colour is assigned by rank WITHIN a pie, so the same person can be violet in one and
 *  magenta in another. That is deliberate: with three slots and three pies there are not
 *  enough hues to key them to people, and the colour here is doing a within-chart job —
 *  "this arc is that row" — with the name, never the hue, carrying who it is. */
export const PIE_MAX = 3
export const PIE_COLORS = ['#4a3aa7', '#e87ba4', '#9a3412']
/** Everybody else. Deliberately outside the palette and achromatic: it is not a person,
 *  it is the remainder, and giving it a hue would make it look like one more of them. */
export const PIE_REST = '#9ca3af'

// Module-level so the chosen tab survives a screen switch — Reyting is unmounted while
// the reader is in the Jurnal, and coming back to a silently reset board reads as "the
// numbers changed".
export const ratingTab = ref<'ellikboshi' | 'staff'>('ellikboshi')

// Same persistence rule as ratingTab — the KPI screen is unmounted while the reader is
// elsewhere, and coming back to a silently reset board reads as "the numbers changed".
export const kpiTab = ref<'ellikboshi' | 'staff'>('ellikboshi')

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
   /** A short, stable stand-in for a set of names — the readiness notice is a list of
    *  PEOPLE and has no ids to point at, and the stored signature is a short column.
    *  FNV-1a: tiny, deterministic, and all we need is "same set or not". */
   function fold(parts: string[]): string {
      let h = 0x811c9dc5
      for (const c of parts.join('|')) {
         h ^= c.charCodeAt(0)
         h = Math.imul(h, 0x01000193) >>> 0
      }
      return h.toString(36)
   }

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
         // The NEWEST complaint's id. Clearing at that id keeps the notice away while it
         // is still the newest, and the next angry message raises it again — including
         // when the total happens to fall back to the same number.
         sig: 'a:' + Math.max(0, ...s.aggressive.items.map((i) => i.id)),
         color: ALARM_RED,
         hint: 'Ziyoratchi keskin yozdi — ellikboshi darhol hal qilishi kerak.',
      })
      if (r.reopened) out.push({
         key: 'reopened', value: r.reopened, label: 'Bajarilmagan',
         sig: 'r:' + Math.max(0, ...reopenedNeeds.value.map((n) => n.id)),
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
         // No ids on this one — it names people. The signature is the SET, so it stays
         // cleared while the same people are missing and returns the moment a different
         // person cannot be reached, even though the count did not move.
         sig: 'p:' + fold([...s.staffReadiness]
            .map((r2) => `${r2.role}:${r2.username || r2.name || '—'}`).sort()),
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

   /** What the bell actually shows: the problems that have not been cleared AT THEIR
    *  CURRENT SIGNATURE. Cleared stays cleared — on every device that login opens — and
    *  a notice returns only when the items behind it change, not when the count does. */
   const activeProblems = computed(() =>
      problems.value.filter((p: any) => s.dismissed[p.key] !== p.sig))

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

   /** Response time as a COLUMN CHART per person — a value axis, a baseline, and one
    *  column each (owner, 2026-08-08, pointing at «Murojaatlar dinamikasi» as the shape).
    *
    *  NOT sorted by time. It was, and that made a ranking out of an average: a leader
    *  with ONE answer of 5 soat 33 daq stood above one who answered twelve times, as
    *  though a single card were a verdict. Ordered by how many answers the number is
    *  built from instead — the most-evidenced person first, the thinnest last, where a
    *  long bar reads as "we barely know" rather than as "the worst".
    *
    *  A column under MIN_SAMPLE answers is drawn hatched, and the answer count sits under
    *  every name — the two together say "this one is not settled yet" without a sentence
    *  explaining it (owner, 2026-08-08: the footnote came off with the rest of the prose).
    *  Nothing is hidden and nothing is dropped: an average over one card is real, it is
    *  just not yet a fact about the person.
    *
    *  One scale across BOTH groups. Two charts each scaled to their own worst would put a
    *  leader and a xodim at the same height while meaning different things, and comparing
    *  the two crews is most of why the card is split in the first place.
    *
    *  COLOUR PER COLUMN (owner, 2026-08-10) — the columns were all one violet. They cycle
    *  PIE_COLORS, the panel's existing person palette, rather than a new one: it was
    *  already measured all-pairs against the three outcome colours, so a column can never
    *  read as a GRADE, which is the rule the whole panel is built on (green/amber/blue mean
    *  an outcome; red is the alarm). Cycling — rather than the pie's hard cap of three — is
    *  safe HERE because a column is labelled directly beneath it: the name carries who it
    *  is, and the hue is only separating neighbours, so a repeat three columns away costs
    *  nothing. On a pie, with no label on the arc, it would. */
   const responseChart = computed(() => {
      const people = filteredWorkers.value
         .filter((w) => w.avg_response_seconds !== null && w.avg_response_seconds !== undefined)
         .map((w) => ({
            telegram_id: w.telegram_id,
            name: personLabel(w),
            // The axis label. Uzbek names are long and a column is ~60px on a phone, so
            // the first word goes under the bar and the whole name rides in the title.
            short: personLabel(w).split(/[\s]+/)[0],
            job: jobLabel(w),
            // Carried so the group can be NAMED after who is in it — a doctor is
            // leader-level but is not an ellikboshi. See leaderGroupTitle.
            role: w.role,
            leaderLevel: isLeaderLevel(w),
            seconds: w.avg_response_seconds as number,
            answered: w.accepted || 0,
            label: dur(w.avg_response_seconds),
            compact: durCompact(w.avg_response_seconds as number),
            thin: (w.accepted || 0) < MIN_SAMPLE,
         }))
         .sort((a, b) => b.answered - a.answered || a.seconds - b.seconds)

      // The scale is set by the averages we TRUST. A single 5 soat answer used to push
      // the axis to six hours and flatten every other column on both charts — one card
      // deciding what the whole card looks like. A thin column that runs past the top is
      // drawn cut off, with its real value above it, so it reads as "off the scale"
      // rather than being quietly rescaled away.
      const solid = people.filter((p) => !p.thin)
      const peak = (solid.length ? solid : people).reduce((m, p) => Math.max(m, p.seconds), 0)
      const step = AXIS_STEPS.find((v) => peak / v <= 4) || AXIS_STEPS[AXIS_STEPS.length - 1]
      const top = Math.max(Math.ceil(peak / step) * step, step)
      // Bottom-up, so the template can place each line by its own share of the height.
      const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => ({
         at: (i * step / top) * 100, label: i ? dur(i * step) : '0',
      }))

      const groups = [
         { key: 'ellikboshi', title: leaderGroupTitle(people.filter((p) => p.leaderLevel)) },
         { key: 'staff', title: 'Ishchi guruh' },
      ].map((g) => ({
         ...g,
         cols: people
            .filter((p) => (g.key === 'ellikboshi' ? p.leaderLevel : !p.leaderLevel))
            .map((p, i) => ({
               ...p,
               // Floor of 2%: somebody who answered in seconds still gets a visible mark
               // on the baseline, and an invisible column reads as missing data, not as
               // fast. Ceiling of 100%: past the top the column is cut, not scaled.
               height: Math.min(Math.max((p.seconds / top) * 100, 2), 100),
               over: p.seconds > top,
               // Cycled per GROUP, so each chart starts at the same first colour and the
               // two crews read as two charts of the same kind rather than one long run.
               color: PIE_COLORS[i % PIE_COLORS.length],
            })),
      })).filter((g) => g.cols.length)

      return { ticks, groups }
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
         const pct = (v: number) => (total ? (v / total) * 100 : 0)

         // EVERY person, named, counted and tappable (owner, 2026-08-08). The list used
         // to stop at three and roll the rest into «Yana N kishi» — which on a real day
         // put 42% of the javobsiz complaints into an anonymous grey row that opened
         // nothing. The cap was serving the palette instead of the reader, which is
         // backwards: a colour limit may decide how many ARCS are separable, never how
         // many people the office is allowed to see.
         const list = people.map((p, i) => ({
            ...p, pct: pct(p.value),
            // The first three carry the ring's hues; everyone after shares the grey of
            // the arc they are actually part of, which is the honest thing for the swatch
            // to say — "you are in that grey together" — rather than inventing a fourth
            // colour the ring cannot draw.
            color: i < PIE_MAX ? PIE_COLORS[i] : PIE_REST,
         }))

         // The RING still shows three plus a remainder, because three is the number of
         // arcs a reader can actually tell apart — see PIE_COLORS. The legend below is
         // what carries the detail now, so nothing is hidden by that limit.
         const tail = people.slice(PIE_MAX)
         const slices = list.slice(0, PIE_MAX).map((p) => ({ ...p }))
         if (tail.length) {
            const rest = tail.reduce((sum, p) => sum + p.value, 0)
            slices.push({
               telegram_id: 0, name: `Yana ${tail.length} kishi`, initials: '+',
               job: '', value: rest, color: PIE_REST, pct: pct(rest),
            })
         }
         // Geometry attached here rather than called from the template: the template
         // needs two values per slice, and a helper called per binding would rebuild the
         // whole ring's arithmetic once for every arc it draws.
         const geo = ringDashes(slices.map((sl) => sl.pct), PIE_R)
         return {
            key: b.key, label: b.label, color: b.color, hint: b.hint, total,
            slices: slices.map((sl, i) => ({ ...sl, ...geo[i] })),
            list,
         }
      })
   }

   const ratingBoards = computed(() => [
      {
         key: 'ellikboshi',
         title: leaderGroupTitle(filteredWorkers.value.filter((w) => isLeaderLevel(w))),
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

   // ── KPI: the reglament's score, one board per population ─────────────────

   /** Same two populations as the Reyting boards, same doctor rule (isLeaderLevel) —
    *  but only the leader-level board carries a BALL: the KPI reglament (v2.0, §4.3)
    *  covers the ellikboshilar, and the crew's motivation document does not exist yet,
    *  so their board shows the raw numbers and no score. The score itself arrives
    *  COMPUTED from the server (w.kpi) — pay maths lives in one place; this only
    *  decides order, who sits on which board, and who wears the §7 star. */
   const kpiBoards = computed(() => {
      const mk = (people: Worker[], scored: boolean) => {
         // «Oyning ellikboshisi» arrives DECIDED from the server (w.best) — the star
         // and its 1 mln sovrin must come from the same decision, and the sovrin is
         // composed into w.salary there. This only sorts.
         const rows = people.map((w) => ({
            w, name: personLabel(w), job: jobLabel(w), best: !!w.best,
         }))
         if (!scored) return rows
         rows.sort((a, b) => {
            const at = a.w.kpi ? a.w.kpi.total : -1
            const bt = b.w.kpi ? b.w.kpi.total : -1
            if (at !== bt) return bt - at
            const ad = a.w.day_avg_response_seconds ?? Infinity
            return ad - (b.w.day_avg_response_seconds ?? Infinity)
         })
         return rows
      }
      // The API already sends roster members only (owner, 2026-08-15: a deleted
      // worker's row is useless info) — no second filter here, one authority.
      const leaders = filteredWorkers.value.filter((w) => isLeaderLevel(w))
      const crew = filteredWorkers.value.filter((w) => !isLeaderLevel(w))
      return [
         { key: 'ellikboshi', title: leaderGroupTitle(leaders), scored: true,
           rows: mk(leaders, true) },
         { key: 'staff', title: 'Ishchi guruh', scored: false, rows: mk(crew, false) },
      ].filter((b) => b.rows.length)
   })

   const kpiBoard = computed(() =>
      kpiBoards.value.find((b) => b.key === kpiTab.value) || kpiBoards.value[0] || null)

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
      // "Reached" includes a FAULT failure (§4.2 footnote — blocked bot / stale
      // account): the worker chose not to be reachable, so the need grades as
      // ignored, not as undelivered. MUST stay identical to _need_outcome's gate.
      const reached = recs.filter((rec) => rec.delivered
         || rec.delivery_error === 'blocked' || rec.delivery_error === 'unreachable')

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
      bucketRows, bucketTotal, bucketSegments, contextStats, errorKinds, responseChart,
      reopenedNeeds,
      ratingBoards, ratingBoard,
      kpiBoards, kpiBoard,
      feed, journalPeople, entriesFor,
   }
}

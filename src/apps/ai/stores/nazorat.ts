import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api from '../../../api'

/** Everything the Nazorat panel reads, in one place.
 *
 *  It moved out of the view because the panel is now three screens (Holat / Reyting /
 *  Jurnal) that share one slice: switching tabs must never refetch, and the cards, the
 *  ranking and the journal must never end up describing different periods.
 */

export interface Report {
   // Per NEED — one murojaat, one grade. The same unit the Jurnal lists in, so a count
   // here and the list it opens are always the same set of things (they were not until
   // 2026-08-07: the buckets counted cards and «Javobsiz 6» opened a list of 2).
   requests: number; unassigned: number
   never_accepted: number; completed: number; re_requests: number; reopened: number
   avg_response_seconds: number | null
   // Per CARD — one row per worker the need was DM'd to. A need sent to the whole crew
   // is one murojaat and five kartochka; these are the only numbers in that unit, and
   // the screens that show them say «kartochka» out loud.
   dms: number; delivered: number; undelivered: number; accepted: number
   flagged: number; bot_mistakes: number; flags_neutral: number; flags_pending: number
   error_kinds: Record<string, number>
}

/** One person's Sifat reytingi — «KPI reglamenti» v2.0 §5, computed on the SERVER
 *  (bot/services/kpi.py) and only rendered here: the score decides salaries, and the
 *  payslip and the panel must be reading the same arithmetic. Null when the period
 *  holds nothing gradable for this person. `vaqt_measured` false = no daytime card was
 *  accepted, so the §5.4 component is an honest 0 and the screen shows «—», never a
 *  measured-looking zero. `min_sample` = under 10 gradable cards (§5.5), the reglament
 *  hands scoring to the Sifat nazorati by hand and the screen must say so. */
export interface WorkerKpi {
   base: number
   bajarilish_pct: number; javobsiz_pct: number; takroriy_pct: number
   bajarilish_ball: number; javobsiz_ball: number; takroriy_ball: number
   vaqt_ball: number; vaqt_measured: boolean
   total: number; min_sample: boolean
   // §8 — the month's Ziyoratchi bahosi (null: no survey / coverage under §10.3's bar)
   // and the COMBINED Sifat reytingi = op × 0.5 + survey × 0.5. With no survey,
   // combined == total — the document's own operational-only fallback. No money is
   // derived here: under v4.5 the ball becomes a sum in one place, `compose_salary`.
   survey_ball?: number | null
   combined?: number
}

export interface Worker {
   telegram_id: number; username: string | null; name: string | null; role: string
   dms: number; undelivered: number; accepted: number; never_accepted: number
   completed: number; re_requests: number; reopened: number; released: number
   flagged: number; flags_confirmed: number; flags_neutral: number
   avg_response_seconds: number | null
   // The §5.4 cut of the same average — needs raised 06:00–00:00 Makka time only.
   day_avg_response_seconds: number | null
   kpi: WorkerKpi | null
   // §3 — the ASSIGNED category code ('stajer' | 'katta' | 'yetakchi' | 'ekspert'),
   // which the fiks keys on. Null = nobody has placed this leader yet: the screen shows
   // «—» and pays nothing, because a default rung would be a decision nobody made.
   category: string | null
   // The unvon + so'm the SERVER resolves from that category and the current pay
   // table. Null when no category is assigned. Pay arithmetic lives on the server,
   // same rule as `kpi` — the panel renders it and never recomputes it.
   fiks_info: { code: string; unvon: string; fiks: number } | null
   // §8 row 3 — accepted 2× slower than the §6 window. Pure timestamps on cards the
   // worker PERSONALLY accepted, so a detector mistake can never become money.
   sla_breaches: number
   // §4.2 footnote — undelivered by the worker's OWN hand (blocked bot / stale
   // account). Already counted inside never_accepted; kept separately because §8
   // row 4 fines the act itself.
   blocked_cards: number
   // §5.4 — «Oyning ellikboshisi», decided on the SERVER (month, ≥10 gradable cards,
   // ≥1,0 SG, ≥90 ball, real ellikboshilar only). A TITLE under v4.5, not a payment.
   best?: boolean
   // §4 — Shartli guruh: the month's LOAD, summed over the city segments this leader
   // was assigned (guruh turi × shahar koeffitsienti). Null for the crew and the
   // doctor — §4 measures a leader's groups, and their own reglament does not exist
   // yet. `sg_units` is the same figure in hundredths, the unit the server does all
   // SG arithmetic in; the UI only ever displays `sg`.
   sg: number | null
   sg_units: number | null
   // ONE ENTRY PER CITY-LEG, not per group: a leader holding a whole trip appears twice
   // for the same chat_id, once for Makka and once for Madina. The field was typed
   // `cities: string[]` here and has always been `city: string` on the wire — harmless
   // while nothing rendered it, wrong the moment something counted it, so a reader
   // counting entries would report two groups for one. Merge by `chat_id` to count
   // GROUPS (Kpi.vue does).
   sg_segments: { chat_id: number; title: string | null; trip_start_date: string
                  hotel_tier: string | null; city: string; sg: number | null
                  assignment_type: string | null; override: boolean }[]
   // How many of those groups have NO Daraja set. Such a group is counted as a whole
   // group (neutral: K unaffected, no load payment) rather than guessed at from its
   // title — the screen asks somebody to set it instead of quietly paying half.
   sg_tier_unset: number
   // §4.3 — over 2,0 SG at once needs the CEO's written consent. Reported, not blocked.
   sg_over_ceiling: boolean
   // v4.5 — `fiks + KPI`, composed on the SERVER, one authority for pay. Null until a
   // category is assigned.
   //
   // THE FIKS TAKES NO INPUT. Every variable thing is inside `kpi`, which carries its
   // own sign and may be negative. `kpi` NULL (with `pending_manual`) is not zero: it
   // is a min-sample month waiting to be scored by hand (§8.2), and rendering it as 0
   // would read as a decision somebody made.
   //
   // The rest are the steps of that one number, sent so a payslip can be CHECKED:
   // «5 000 000 × 1,2 + 300 000» is arguable, a lone 6 300 000 is not.
   salary: { fiks: number; kpi: number | null; total: number
             mukofot_base: number; k: number; sg: number | null
             sovrin: number; best: boolean
             k_sg: number | null; yuklama: number
             earned: number
             jarima: number; bot_block: boolean
             sla_breaches: number; day_javobsiz: number; false_completions: number
             xatolik_abuse: boolean
             manual_adjust: number
             floor: number; floored: boolean; pending_manual: boolean } | null
   // Always true in practice: the API sends dashboard-roster members only (active
   // ellikboshilar pool / staff table; owner, 2026-08-15) and keeps the flag for
   // transparency. Deleted workers' names survive only inside Jurnal timelines.
   in_roster: boolean
   // Where this person actually worked, from the needs themselves — "7 murojaat" reads
   // very differently across nine groups than inside one.
   cities: string[]; group_count: number
   // The same cards split by city, and their CITY-WEIGHTED total (Makka 0.6 /
   // Madina 0.4 — owner, 2026-08-16: more work is done in Makka). A workload
   // figure shown BESIDE the ball, never inside it: the §5 score is percentage-
   // based, and weighting a percentage would make one city's mistakes cost more
   // than another's — a management decision, not a rounding.
   city_cards: Record<string, number>; weighted_load: number
   // Their JOB from the staff table (ishchi_guruh / doctor / airport), NOT the
   // control-system role. A doctor only ever receives health needs.
   staff_role: string | null
   // What was written by hand on THIS month, or null. Present on the row whether or not
   // it applied: a ball entered for a month that has since risen above ten cards is not
   // being used, and the screen has to be able to say so rather than leave it a mystery.
   manual?: ManualEntry | null
}

// One leader's standing assignment — every group pinned to them, with no period at all.
// It is NOT on Worker any more (owner, 2026-08-05): a Worker row only exists for someone
// who got a DM inside the selected window, so on "Kunlik" a leader with a quiet day drops
// off the page and their group total goes with them. A fact that does not depend on the
// period cannot live in a list that does.
export interface LeaderGroups {
   username: string; name: string | null
   // Always true: the API sends pool members only (owner, 2026-08-15). A group still
   // pinned to a deleted leader is not thereby hidden — the readiness bell names it.
   in_pool: boolean
   // A leader holds a group-LEG, not a group (owner, 2026-08-16): one group can be led
   // by different people in Makka and Madina, so it appears under both. `group_count`
   // counts legs; `weighted_units` weights them (Makka 0.6 / Madina 0.4), so a group is
   // exactly 1.0 however it is split and a leader holding both legs is unchanged.
   group_count: number
   weighted_units: number
   // §4.1 — the same figure the KPI payslip pays on: guruh turi × shahar koeffitsienti.
   // `weighted_units` splits a group between its two city leaders and stops there; `sg`
   // additionally applies the Daraja, so two PREMIUM groups are 2 · 2,0 · 1,0 across the
   // three fields. Both are shown (owner, 2026-08-26): until then this screen sent only
   // the first two and the payslip only the third, and the panel answered «how many
   // groups does this ellikboshi have» two different ways depending on the tab.
   sg: number
   // How many of those groups have NO Daraja set. Counted as WHOLE groups, the same
   // rule the payslip follows — an unanswered question is not a premium group.
   tier_unset: number
   groups: { telegram_id: number; title: string | null
             cities: string[]; weight: number
             tier: string | null; tier_set: boolean; sg: number }[]
}

/** One ellikboshi's WORKLOAD in an arbitrary window — how many of their groups were on
 *  the road during it. A different question from LeaderGroups above, which is the
 *  standing roster and answers to no period at all; both live on the Guruhlar screen and
 *  the screen has to say which is which. */
export interface LeaderPeriodCount {
   username: string; name: string | null
   in_pool: boolean
   group_count: number
   // City-weighted workload for the window, and its counterpart in the compared one.
   // Two leaders can hold the same NUMBER of legs and not the same amount of work.
   weighted_units: number
   previous_count?: number; delta?: number
   previous_weighted?: number; weighted_delta?: number
   groups: { telegram_id: number; title: string | null
             cities: string[]; weight: number
             trip_start_date: string; trip_end_date: string }[]
}

/** §3 — one rung of the ellikboshi ladder and what it currently pays. The ladder is
 *  the reglament's and changes with its version; the SUM is the office's and is revised
 *  without any document being reissued, which is why it is data and not a constant.
 *  `stored` false = the row is the seed default, never yet edited in the dashboard. */
export interface KpiCategory {
   code: string; title: string; fiks: number; sort_order: number; stored: boolean
}

/** v4.5 — the four numbers that shape the KPI line, all editable by the full
 *  nazoratchi. The reglament owns the ratios, the office owns the sums. */
export interface KpiSettings {
   // §5's two tiers — the ball each opens at and what each pays. Seeded at the
   // document's own numbers; settings because the office may lower a threshold without
   // reissuing the reglament. The SHAPE (two tiers, a hard edge) is not a setting.
   bonus_high_ball: number; bonus_high_sum: number
   bonus_base_ball: number; bonus_base_sum: number
   //  §5.4 — the month's best leader's prize. Outside the deduction floor.
   sovrin_sum: number
   load_rate: number; max_deduction_pct: number
   // The load treated as the ordinary job; above it every extra group is paid.
   load_free_units: number
   k_min_units: number; k_max_units: number
   // §4.4 — the coefficient tables, in hundredths. Data rather than constants because
   // they describe the company's own tariffs, which move without the reglament
   // changing version.
   city_makka_units: number; city_madina_units: number
   pkg_comfort_units: number; pkg_premium_units: number
   // §11's unit prices, READ-ONLY. Constants on the server — the reglament names each
   // sum in its own table — served here so a screen explaining a jarima line never
   // keeps its own copy of the numbers.
   fines: {
      day_javobsiz: number; sla_breach: number; bot_block: number
      false_completion: number; xatolik_abuse: number
   }
}

/** TZ 5 — one reason a card may be taken out of the §8.1 base. Served by the API
 *  rather than duplicated here: a client-side copy is how the dropdown and the
 *  validator drift apart, and the one that loses is the controller staring at a
 *  rejected save. */
/** TZ 1 — one closed revision of one month, as the history screen lists it. */
/** The two numbers a human writes on a payslip: the hand score for a month under the
 *  ten-card minimum, and the office's ± on the KPI line. Null on a row nobody wrote. */
export interface ManualEntry {
   ball: number | null; ball_note: string | null
   adjust: number; adjust_reason: string | null
   updated_by: string | null; updated_at: string | null
}

export interface SnapshotRevision {
   period: string; revision: number
   frozen_at: string | null; frozen_by: string | null
   comment: string | null; rows: number; payout_total: number
}

export interface ExclusionReason { code: string; title: string }

export interface GroupOption { chat_id: number; title: string | null; cities: string[] }

/** One complaint that carried real hostility, and the ellikboshi who has to settle it.
 *  Detected off the owner's own keyword list (server/AGGRESSION-KEYWORDS.md).
 *
 *  The leader comes from the GROUP, not from whoever was DM'd: staff are never named
 *  here even when the complaint is about something the crew did, because an aggressive
 *  complaint has to be settled at once and the leader is who answers for it. */
export interface AggressiveItem {
   id: number; created_at: string | null; text: string | null
   chat_id: number | null; group_title: string | null
   ellikboshi: string | null; pilgrim_username: string | null
}
export interface Aggressive { total: number; items: AggressiveItem[] }

/** The three controller logins that may talk to each other. Mirrors CHAT_ROLES on the
 *  server, which is the authority — this copy only decides whether to render the tab, and
 *  the API refuses anything it disagrees with. `admin` is deliberately absent: it reads
 *  the panel, it is not one of the three watchers the chat exists for, and the API
 *  answers it an empty inbox. */
export const CHAT_ROLES = ['nazoratchi', 'nazoratchi_staff', 'nazoratchi_ellikboshi']

export interface ChatPeer {
   role: string; label: string; unread: number
   last_text: string | null; last_at: string | null; last_from_me: boolean
}
export interface ChatMessage {
   id: number; text: string; from_me: boolean
   sender_role: string; sender_label: string
   created_at: string | null; read_at: string | null
}

// `location` is null for an ellikboshi — a leader belongs to a GROUP, not a city, and
// `group` is that group's title (null for crew). Which group still assigns them is the
// one fact that makes the warning actionable: the fix is on the Guruhlar page.
export interface StaffReady {
   role: string; location: string | null; username: string | null; name: string | null
   group?: string | null
   // false = this group still names a leader who is no longer in the Ellikboshilar
   // pool. Deleting them there does not clear the group's assignment, so the bot
   // would still be DMing a removed person.
   in_pool?: boolean
}

/** One OPEN card past its §6 acceptance window — the bell's chase list. Health needs
 *  carry the 10-minute window (the doctor's cards are the «tibbiy shoshilinch» class
 *  by routing, no detector involved); everything else 15 min by day / 45 by night. */
export interface SlaOverdueItem {
   recipient_id: number; request_id: number
   role: string; username: string | null
   chat_id: number | null; group_title: string | null
   need_type: string | null
   window_minutes: number; overdue_minutes: number
}

// Drill-down paging. The journal is built from these rows, so a silent cap would make a
// truncated log look like the worker's whole period.
export const REQ_PAGE = 200
export const MAX_REQ_LIMIT = 500          // the API's own ceiling

export const useNazoratStore = defineStore('nazorat', () => {
   const period = ref('day')
   const loading = ref(false)
   const loadError = ref(false)
   const saving = ref(false)
   const savedMsg = ref('')

   const report = ref<Report | null>(null)
   const workers = ref<Worker[]>([])
   const groupOptions = ref<GroupOption[]>([])
   // Deliberately NOT role-scoped by the API: it is an alarm, not an accountability
   // statistic, and hiding an angry pilgrim from one controller is the worse failure.
   const aggressive = ref<Aggressive>({ total: 0, items: [] })
   // People the bot CANNOT DM at all, because they never pressed start. Back on the bell
   // by owner request (2026-08-07) after a few hours off it: it is the one warning where
   // nothing is failing yet — the cards simply never arrive, silently.
   const staffReadiness = ref<StaffReady[]>([])
   // The bell's SLA chase list — cards still acceptable, past their §6 window.
   const slaOverdue = ref<SlaOverdueItem[]>([])

   // ── The controllers' 1:1 chat ─────────────────────────────────────────────
   // Kept OUT of load(): it answers to no period and no group/city slice, and re-pulling
   // a conversation because the reader changed the date filter would be both wasteful and
   // misleading — it would imply the messages belong to that window.
   const chatPeers = ref<ChatPeer[]>([])
   const chatThread = ref<ChatMessage[]>([])
   const chatUnread = ref(0)
   const chatLoading = ref(false)
   const chatSending = ref(false)
   // The roster screen. Kept OUT of load(): it takes no period and no group/city slice,
   // so re-pulling it whenever the window changes would be pure waste — and worse, it
   // would imply to the reader that it answers to the selector like everything else does.
   const leaderGroups = ref<LeaderGroups[]>([])
   const leaderGroupsLoading = ref(false)
   const leaderGroupsError = ref<'' | 'forbidden' | 'failed'>('')

   // The PERIOD workload on the same screen (owner, 2026-08-10: "number of groups per
   // ellikboshi weekly and monthly"). It has its OWN week/month switch rather than
   // reading the panel's Kunlik/Haftalik/Oylik selector: the roster above it is
   // deliberately period-free and says so, and one screen answering to two different
   // period controls at once is how a reader ends up misreading both numbers. Also kept
   // out of load() for the same reason as the roster.
   const groupPeriod = ref<'week' | 'month'>('week')
   const periodCounts = ref<LeaderPeriodCount[]>([])
   const periodRange = ref<{ from: string; to: string }>({ from: '', to: '' })
   const periodUnscheduled = ref(0)
   const periodCountsLoading = ref(false)
   const periodCountsError = ref<'' | 'forbidden' | 'failed'>('')

   // Which population this LOGIN may see: 'staff' | 'ellikboshi' | 'all'. Comes from the
   // API (the token decides it), never from a dropdown — a scoped controller cannot
   // widen their own view, and the page must not label itself as something it is not.
   const scope = ref<'staff' | 'ellikboshi' | 'all'>('all')

   // Slice filters — sent to the SERVER, so every number on the page moves together.
   const filterGroup = ref('')         // '' = all groups, else the chat_id as a string
   const filterCity = ref('')          // '' = both, else 'makka' | 'madina'
   // Client-side, applied to the worker lists only.
   const filterRole = ref('')          // '' = all, else 'staff' | 'ellikboshi'
   const filterName = ref('')          // matches the display label

   /** The per-request drill-down. Deliberately SEPARATE from load(): it is by far the
    *  heaviest response (~55 KB for 60 needs, ~170 KB at the default limit) and only
    *  the Jurnal screen, the person detail and the «Javobsiz» drill-down ever read it.
    *  Fetching it with the summary made every first paint on a phone pay for a screen
    *  nobody had opened yet. */
   const requests = ref<any[]>([])
   const requestsLoading = ref(false)
   const requestsLoaded = ref(false)
   const reqLimit = ref(REQ_PAGE)
   const requestsTruncated = computed(() => requests.value.length >= reqLimit.value)

   /** Cleared notifications, as `kind -> the SIGNATURE that was on screen`.
    *
    *  This used to live in localStorage keyed on the notification's COUNT, and the owner
    *  put it plainly: "there is no clear function, it just hides the notification". It
    *  cleared on one device only — the same controller opening the panel on a phone saw
    *  everything again — and it came back whenever the number moved, even when nothing
    *  new had happened.
    *
    *  So a clear is stored on the SERVER, per controller login, against a signature of
    *  the exact items behind the notice (see problemSignature in nazorat/shared.ts): the
    *  newest complaint's id, the newest unfinished need's id, the set of people the bot
    *  cannot DM. Same signature -> stays cleared, everywhere that login opens. A new
    *  complaint changes the signature and the bell rings again — which is the one thing
    *  a "cleared forever" must never swallow. */
   const dismissed = ref<Record<string, string>>({})

   async function loadSeen() {
      try {
         const { data } = await api.get('/control/seen')
         dismissed.value = data || {}
      } catch { /* leave what we have: failing to READ a bookmark must not un-clear one */ }
   }

   async function dismissProblems(items: { key: string; sig: string }[]) {
      // Optimistic: the sheet closes on the same tap. A failed write is put back, so a
      // notice can never LOOK cleared while the server still has it — which on this panel
      // would mean an angry pilgrim silently disappearing from one person's bell.
      const before = { ...dismissed.value }
      const next = { ...dismissed.value }
      for (const i of items) next[i.key] = i.sig
      dismissed.value = next
      try {
         await Promise.all(items.map((i) =>
            api.post('/control/seen', { kind: i.key, signature: i.sig })))
      } catch {
         dismissed.value = before
      }
   }

   async function restoreProblems() {
      const before = { ...dismissed.value }
      dismissed.value = {}
      try {
         await api.delete('/control/seen')
      } catch {
         dismissed.value = before
      }
   }

   const form = ref({
      staff_repeat_window_hours: 6,
      ellikboshi_repeat_window_hours: 0,
      it_group_id: null as number | null,
      it_topic_id: null as number | null,
      is_enabled: true,
   })

   /** The chosen slice as a query string — appended to every read so the whole panel
    *  always describes the same group / city. */
   const sliceQuery = computed(() => {
      const parts = [`period=${period.value}`]
      if (filterGroup.value) parts.push(`chat_id=${encodeURIComponent(filterGroup.value)}`)
      if (filterCity.value) parts.push(`city=${encodeURIComponent(filterCity.value)}`)
      return parts.join('&')
   })

   // ── THE KPI TAB RUNS ON A CALENDAR MONTH, NOT THE ROLLING WINDOW ────────────────
   // Owner, 2026-08-27: «i freeze… then all statistics goes to 0 and new month starts
   // fresh?» — it did not. The panel's «Oylik» is the last 30 DAYS, so on the 3rd of
   // September the KPI tab still carried ~28 days of August: a salary made of two
   // months, which could never agree with the August snapshot frozen days earlier.
   //
   // Its own state, and its own fetch, because `workers` is shared with Reyting — which
   // KEEPS the rolling selector. A monitoring board that empties itself at midnight on
   // the 1st is a worse board; a payslip that does not is a wrong payslip.
   const thisMonth = () => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
   }
   const kpiMonth = ref<string>(thisMonth())
   const kpiWorkers = ref<Worker[]>([])
   const kpiLoading = ref(false)
   const kpiError = ref(false)

   async function loadKpiWorkers() {
      kpiLoading.value = true
      kpiError.value = false
      try {
         // The group/city slice is deliberately NOT applied: §5.4's «Oyning ellikboshisi»
         // is decided server-side on the UNSLICED month, and a board narrowed to one
         // group would show a star its own rows cannot explain.
         const { data } = await api.get(
            `/control/workers?month=${encodeURIComponent(kpiMonth.value)}`)
         kpiWorkers.value = data || []
      } catch {
         kpiWorkers.value = []
         kpiError.value = true
      } finally {
         kpiLoading.value = false
      }
   }

   function setKpiMonth(m: string) {
      if (kpiMonth.value === m && kpiWorkers.value.length) return
      kpiMonth.value = m
      void loadKpiWorkers()
   }

   async function load() {
      loading.value = true
      loadError.value = false
      // The slice changed, so anything already pulled describes the old one.
      requestsLoaded.value = false
      requests.value = []
      try {
         const q = sliceQuery.value
         const [rep, wrk, agg, sr, st, sc, grp, sla] = await Promise.all([
            api.get(`/control/report?${q}`),
            api.get(`/control/workers?${q}`),
            // No city: a message records no location, only the need behind one does —
            // see get_aggressive_complaints. The GROUP filter is exact and is honoured.
            api.get(`/control/aggressive?period=${period.value}`
               + (filterGroup.value ? `&chat_id=${encodeURIComponent(filterGroup.value)}` : '')),
            // No period: "has this person ever started the bot" is true now or it is not.
            api.get('/control/staff-readiness'),
            api.get('/control/settings'),
            api.get('/control/scope'),
            // Deliberately NOT sliced: the group list must keep offering the other
            // groups, otherwise picking one would leave you unable to pick a different one.
            api.get(`/control/groups?period=${period.value}`),
            // No period either: an SLA alarm is about NOW.
            api.get('/control/sla-overdue'),
         ])
         // Which notices this login has already cleared. Read on every load so a clear
         // made on the phone is already in force when the laptop opens the panel.
         void loadSeen()
         report.value = rep.data
         workers.value = wrk.data
         aggressive.value = agg.data || { total: 0, items: [] }
         staffReadiness.value = sr.data
         slaOverdue.value = sla.data || []
         scope.value = sc.data?.scope || 'all'
         groupOptions.value = grp.data
         form.value = {
            staff_repeat_window_hours: st.data.staff_repeat_window_hours,
            ellikboshi_repeat_window_hours: st.data.ellikboshi_repeat_window_hours,
            it_group_id: st.data.it_group_id,
            it_topic_id: st.data.it_topic_id,
            is_enabled: st.data.is_enabled,
         }
      } catch {
         // Surfaced, not swallowed: an empty page that means "the request failed" reads
         // exactly like one that means "nothing happened this period" — and on an
         // evidence panel those two are opposites.
         loadError.value = true
         report.value = null
         workers.value = []
         aggressive.value = { total: 0, items: [] }
         staffReadiness.value = []
         slaOverdue.value = []
         groupOptions.value = []
      } finally {
         loading.value = false
      }
   }

   /** Pull the drill-down. Called by whichever screen actually needs it; a second call
    *  for the same slice is a no-op unless `force` (used by «Ko'proq yuklash»). */
   async function loadRequests(force = false) {
      if (requestsLoaded.value && !force) return
      requestsLoading.value = true
      try {
         const { data } = await api.get(
            `/control/requests?${sliceQuery.value}&limit=${reqLimit.value}`)
         requests.value = data
         requestsLoaded.value = true
      } catch {
         loadError.value = true
      } finally {
         requestsLoading.value = false
      }
   }

   function loadMoreRequests() {
      reqLimit.value = Math.min(MAX_REQ_LIMIT, reqLimit.value + REQ_PAGE)
      return loadRequests(true)
   }

   /** The leader roster — every ellikboshi and how many groups they hold. No period.
    *  A nazoratchi_staff token is refused by the API (their scope is the crew), which is
    *  told apart from a real failure so the screen can say which happened. */
   async function loadLeaderGroups() {
      leaderGroupsLoading.value = true
      leaderGroupsError.value = ''
      try {
         const { data } = await api.get('/control/leader-groups')
         leaderGroups.value = data
      } catch (e: any) {
         leaderGroups.value = []
         leaderGroupsError.value = e?.response?.status === 403 ? 'forbidden' : 'failed'
      } finally {
         leaderGroupsLoading.value = false
      }
   }

   /** YYYY-MM-DD in the READER's own day, which is what they mean by "this week". The
    *  server counts trips by calendar date, so a day either side of midnight is the whole
    *  error — not worth a timezone conversion that would then disagree with the date the
    *  reader sees on their phone. */
   function isoDay(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
   }

   /** The window's per-ellikboshi group count. WORKLOAD, not activity: the server counts
    *  every group whose trip RAN inside the window, whether or not it produced a single
    *  message — counting only groups that generated needs would pay a leader LESS when
    *  their groups went well. The dates come back in the response, so the screen always
    *  states the window it actually got rather than the one it asked for. */
   async function loadPeriodCounts() {
      const days = groupPeriod.value === 'week' ? 7 : 30
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - (days - 1))
      periodCountsLoading.value = true
      periodCountsError.value = ''
      try {
         const { data } = await api.get('/ellikboshilar/group-counts', {
            params: { date_from: isoDay(from), date_to: isoDay(to) },
         })
         periodCounts.value = data?.leaders || []
         periodUnscheduled.value = data?.unscheduled_groups || 0
         periodRange.value = { from: data?.date_from || '', to: data?.date_to || '' }
      } catch (e: any) {
         periodCounts.value = []
         periodUnscheduled.value = 0
         periodCountsError.value = e?.response?.status === 403 ? 'forbidden' : 'failed'
      } finally {
         periodCountsLoading.value = false
      }
   }

   function setGroupPeriod(p: 'week' | 'month') {
      if (groupPeriod.value === p && periodCounts.value.length) return
      groupPeriod.value = p
      loadPeriodCounts()
   }

   /** A slice change invalidates everything, so both reads restart. */
   function setSlice() {
      reqLimit.value = REQ_PAGE
      return load()
   }

   function setPeriod(p: string) {
      period.value = p
      return setSlice()
   }

   function clearSlice() {
      filterGroup.value = ''
      filterCity.value = ''
      return setSlice()
   }

   // ─── TZ 1 — CLOSING THE MONTH ────────────────────────────────────────────────────
   // Deliberately NOT part of load(): the freeze screen is opened a few times a month by
   // two accounts, and putting its history into every panel refresh would make every
   // controller pay for it on every period change.
   const snapshots = ref<SnapshotRevision[]>([])
   const snapshotsLoading = ref(false)

   /** Every frozen revision, newest first. */
   async function loadSnapshots(period?: string) {
      snapshotsLoading.value = true
      try {
         snapshots.value = (await api.get('/control/snapshots',
            { params: period ? { period } : {} })).data
      } catch {
         snapshots.value = []
      } finally {
         snapshotsLoading.value = false
      }
   }

   /** One revision's rows — the payslips as they were written down. */
   async function loadSnapshotRows(period: string, revision?: number) {
      const { data } = await api.get(`/control/snapshot/${period}`,
         { params: revision ? { revision } : {} })
      return data
   }

   /** Close the month. Returns the server's own message on refusal, because every one of
    *  them is a rule the reader has to know about — the month is not over, a re-freeze
    *  needs a reason — and «Xato» would hide which. */
   async function freezeMonth(period: string, comment?: string):
      Promise<{ ok: boolean; revision?: number; rows?: number; error?: string }> {
      try {
         const { data } = await api.post(`/control/snapshot/${period}/freeze`,
            { comment: comment || null })
         await loadSnapshots()
         return { ok: true, revision: data.revision, rows: data.rows }
      } catch (e: any) {
         return { ok: false, error: e?.response?.data?.detail || 'Yopilmadi' }
      }
   }

   /** The accountant's file. Fetched as a blob rather than linked: the export needs the
    *  JWT, and a plain href carries no Authorization header. */
   async function exportSnapshot(period: string, revision?: number): Promise<string> {
      const { data } = await api.get(`/control/snapshot/${period}/export`, {
         params: revision ? { revision } : {}, responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `kpi-${period}${revision ? `-r${revision}` : ''}.csv`
      a.click()
      URL.revokeObjectURL(url)
      return url
   }

   /** Write (or clear) one person's hand-written numbers for the CURRENT calendar
    *  month — the same month the server applies them to. Only the fields passed are
    *  touched; `null` clears one, which is how a hand score is taken back off a month.
    *
    *  Reloads the board: both numbers land straight on somebody's salary, and a screen
    *  still showing the old total after the save would be the panel disagreeing with
    *  the payslip it just wrote. */
   async function setManual(username: string, patch: Record<string, unknown>):
      Promise<string | null> {
      const now = new Date()
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const bare = (username || '').replace(/^@/, '')
      try {
         await api.put(`/control/manual/${period}/${bare}`, patch)
         await load()
         return null
      } catch (e: any) {
         return e?.response?.data?.detail || 'Saqlanmadi'
      }
   }

   /** Dismiss a falsely auto-detected repeat, then refresh the evidence. */
   /** TZ 5 — the fixed reason list, loaded once with the journal. */
   const exclusionReasons = ref<ExclusionReason[]>([])
   async function loadExclusionReasons() {
      if (exclusionReasons.value.length) return
      try {
         exclusionReasons.value = (await api.get('/control/exclusion-reasons')).data
      } catch { /* the control hides itself with no reasons to offer */ }
   }

   /** TZ 5 — take ONE card out of the §8.1 base, or put it back (`reason` null).
    *
    *  Reloads the board as well as the journal: an exclusion changes somebody's ball
    *  and therefore their KPI line, and a journal that showed the card as excluded
    *  while the ball still counted it would be the panel disagreeing with itself. */
   async function setCardExclusion(recipientId: number, reason: string | null,
                                   note?: string): Promise<boolean> {
      try {
         await api.put(`/control/cards/${recipientId}/exclusion`, { reason, note })
         await load()
         await loadRequests(true)
         return true
      } catch {
         return false
      }
   }

   /** The same exclusion for a WHOLE murojaat (owner, 2026-08-20): «xato edi» is a fact
    *  about the message, so the reason is stated once and the server applies it to every
    *  graded card in one transaction. Looping the single-card call from here would be
    *  the same request, except it can stop halfway. */
   async function setRequestExclusion(requestId: number, reason: string | null,
                                      note?: string): Promise<boolean> {
      try {
         await api.put(`/control/requests/${requestId}/exclusion`, { reason, note })
         await load()
         await loadRequests(true)
         return true
      } catch {
         return false
      }
   }

   async function dismissReopen(id: number) {
      try {
         await api.post(`/control/requests/${id}/dismiss-reopen`)
         await load()
         await loadRequests(true)
      } catch { /* ignore — the row just stays as-is */ }
   }

   async function save() {
      saving.value = true
      savedMsg.value = ''
      try {
         // A CLEARED number input is an empty string, not null — `v-model.number`
         // leaves it as typed when it cannot parse. Sent as it stands, the IT topic
         // field refused the whole save with a bare «Saqlashda xatolik», which is
         // exactly what an IT group that is not a forum needs to do: leave it blank.
         const body: Record<string, unknown> = { ...form.value }
         for (const k of Object.keys(body)) {
            if (typeof body[k] === 'string' && !(body[k] as string).trim()) body[k] = null
         }
         await api.put('/control/settings', body)
         savedMsg.value = 'Saqlandi'
         setTimeout(() => (savedMsg.value = ''), 2500)
      } catch {
         savedMsg.value = 'Saqlashda xatolik'
      } finally {
         saving.value = false
      }
   }

   /** The badge only. Polled on a timer while the panel is open, so it is its own tiny
    *  read rather than a side effect of the heavier ones. */
   async function loadChatUnread() {
      try {
         const { data } = await api.get('/control/chat/unread')
         chatUnread.value = data?.unread || 0
      } catch { /* a dead poll must never surface as a page error */ }
   }

   async function loadChatPeers() {
      try {
         const { data } = await api.get('/control/chat/peers')
         chatPeers.value = data || []
      } catch { chatPeers.value = [] }
   }

   /** One conversation. `silent` is the polling path: it refreshes the messages without
    *  the skeleton, so a thread the reader is looking at does not blink every few seconds. */
   async function loadChatThread(peer: string, silent = false) {
      if (!silent) chatLoading.value = true
      try {
         const { data } = await api.get(`/control/chat/${peer}`)
         chatThread.value = data || []
      } catch {
         if (!silent) chatThread.value = []
      } finally {
         chatLoading.value = false
      }
   }

   async function sendChat(peer: string, text: string): Promise<boolean> {
      const body = (text || '').trim()
      if (!body || chatSending.value) return false
      chatSending.value = true
      try {
         await api.post(`/control/chat/${peer}`, { text: body })
         await loadChatThread(peer, true)
         return true
      } catch {
         return false
      } finally {
         chatSending.value = false
      }
   }

   /** The reader opened the thread. Marks THEIR incoming messages and refreshes the
    *  badge, so the tab stops shouting the moment they have actually looked. */
   async function markChatRead(peer: string) {
      try {
         await api.post(`/control/chat/${peer}/read`)
         await loadChatUnread()
      } catch { /* the badge is not worth an error toast */ }
   }

   /** §3 — the four category rungs and what each currently pays. Loaded once; the
    *  KPI board needs the titles to render an unvon whoever is looking. */
   const categories = ref<KpiCategory[]>([])
   async function loadCategories() {
      try {
         categories.value = (await api.get('/control/categories')).data
      } catch { /* the board still renders; fiks_info carries its own unvon */ }
   }

   /** §3 — place a leader on a rung. The API allows the full nazoratchi AND the
    *  ellikboshi-scoped one (owner, 2026-08-18): they run the leaders and know who is
    *  where. Patches the row for instant feedback, then reloads the slice — the
    *  composed salary lives on the server, and recomputing it here would be a second
    *  pay authority. */
   async function setCategory(w: Worker, category: string | null): Promise<boolean> {
      try {
         const { data } = await api.put('/control/ellikboshi-category',
            { username: w.username, category })
         w.category = data.category
         w.fiks_info = data.fiks_info
         await load()
         return true
      } catch {
         return false
      }
   }

   /** v4.5 — the KPI scheme's own four numbers. Loaded beside the categories because
    *  the payslip needs both to explain itself, and always complete: the server fills
    *  any missing one from its seeds rather than answering with a blank tier. */
   const kpiSettings = ref<KpiSettings | null>(null)
   async function loadKpiSettings() {
      try {
         kpiSettings.value = (await api.get('/control/kpi-settings')).data
      } catch { /* the board still renders; the salary arrives composed either way */ }
   }

   /** Write ONE setting. Sent alone rather than as the whole object, so a stale value
    *  sitting in this tab cannot overwrite a change somebody made in another. Reloads
    *  the slice afterwards: every payslip on screen just changed. */
   async function setKpiSetting(field: keyof KpiSettings, value: number): Promise<boolean> {
      try {
         const { data } = await api.put('/control/kpi-settings', { [field]: value })
         kpiSettings.value = data
         await load()
         return true
      } catch {
         return false
      }
   }

   /** §3 — what a rung PAYS. Full nazoratchi + admin only: this moves every leader on
    *  that rung at once, which is why it is a different endpoint from the one above. */
   async function setCategoryFiks(code: string, fiks: number): Promise<boolean> {
      try {
         const { data } = await api.put('/control/categories', { code, fiks })
         const row = categories.value.find((c) => c.code === code)
         if (row) row.fiks = data.fiks
         await load()
         return true
      } catch {
         return false
      }
   }

   return {
      period, loading, loadError, saving, savedMsg,
      categories, loadCategories, setCategory, setCategoryFiks,
      kpiSettings, loadKpiSettings, setKpiSetting,
      report, workers, groupOptions, aggressive, staffReadiness, slaOverdue, scope,
      // The KPI tab's own calendar-month slice — see loadKpiWorkers.
      kpiMonth, kpiWorkers, kpiLoading, kpiError, loadKpiWorkers, setKpiMonth,
      leaderGroups, leaderGroupsLoading, leaderGroupsError, loadLeaderGroups,
      groupPeriod, periodCounts, periodRange, periodUnscheduled,
      periodCountsLoading, periodCountsError, loadPeriodCounts, setGroupPeriod,
      filterGroup, filterCity, filterRole, filterName,
      requests, requestsLoading, requestsLoaded, reqLimit, requestsTruncated,
      form, sliceQuery, dismissed,
      load, loadRequests, loadMoreRequests, setSlice, setPeriod, clearSlice,
      dismissProblems, restoreProblems, dismissReopen, save,
      exclusionReasons, loadExclusionReasons, setCardExclusion, setRequestExclusion,
      snapshots, snapshotsLoading, loadSnapshots, loadSnapshotRows, freezeMonth,
      setManual,
      exportSnapshot,
      chatPeers, chatThread, chatUnread, chatLoading, chatSending,
      loadChatUnread, loadChatPeers, loadChatThread, sendChat, markChatRead,
   }
})

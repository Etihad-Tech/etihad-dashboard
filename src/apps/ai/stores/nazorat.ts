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
   total: number; bonus: number; min_sample: boolean
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
   // §1 — years of service (a real ellikboshi only; null for crew, the doctor, or
   // simply not entered yet) and the unvon+fiks the server derives from it. Pay
   // arithmetic lives on the server, same rule as `kpi`.
   staj_years: number | null
   fiks_info: { unvon: string; fiks: number } | null
   // §8 row 3 — accepted 2× slower than the §6 window. Pure timestamps on cards the
   // worker PERSONALLY accepted, so a detector mistake can never become money.
   sla_breaches: number
   // §4.2 footnote — undelivered by the worker's OWN hand (blocked bot / stale
   // account). Already counted inside never_accepted; kept separately because §8
   // row 4 fines the act itself.
   blocked_cards: number
   // §7 — «Oyning ellikboshisi», decided on the SERVER (month, ≥20 cards, real
   // ellikboshilar only) so the star and its sovrin come from one decision.
   best?: boolean
   // §1 + §2 + §7 − §8 composed on the SERVER, one authority for pay. Null without
   // a staj. The sovrin sits OUTSIDE the 30% deduction cap.
   salary: { fiks: number; mukofot: number; sovrin: number
             jarima: number; jarima_capped: boolean
             sla_breaches: number; bot_block: boolean; total: number } | null
   // Always true in practice: the API sends dashboard-roster members only (active
   // ellikboshilar pool / staff table; owner, 2026-08-15) and keeps the flag for
   // transparency. Deleted workers' names survive only inside Jurnal timelines.
   in_roster: boolean
   // Where this person actually worked, from the needs themselves — "7 murojaat" reads
   // very differently across nine groups than inside one.
   cities: string[]; group_count: number
   // Their JOB from the staff table (ishchi_guruh / doctor / airport), NOT the
   // control-system role. A doctor only ever receives health needs.
   staff_role: string | null
}

// One leader's standing assignment — every group pinned to them, with no period at all.
// It is NOT on Worker any more (owner, 2026-08-05): a Worker row only exists for someone
// who got a DM inside the selected window, so on "Kunlik" a leader with a quiet day drops
// off the page and their group total goes with them. A fact that does not depend on the
// period cannot live in a list that does.
export interface LeaderGroups {
   username: string; name: string | null
   // false = still holds groups but has been removed from the Ellikboshilar pool. Listed
   // anyway, or the totals stop reconciling with the Guruhlar page.
   in_pool: boolean
   group_count: number
   groups: { telegram_id: number; title: string | null }[]
}

/** One ellikboshi's WORKLOAD in an arbitrary window — how many of their groups were on
 *  the road during it. A different question from LeaderGroups above, which is the
 *  standing roster and answers to no period at all; both live on the Guruhlar screen and
 *  the screen has to say which is which. */
export interface LeaderPeriodCount {
   username: string; name: string | null
   in_pool: boolean
   group_count: number
   groups: { telegram_id: number; title: string | null
             trip_start_date: string; trip_end_date: string }[]
}

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

   /** Dismiss a falsely auto-detected repeat, then refresh the evidence. */
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
         await api.put('/control/settings', form.value)
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

   /** §1 staj write — the API allows only the admin. Patches the row for instant
    *  feedback, then reloads the slice: the composed salary (fiks + mukofot − jarima)
    *  lives on the server, and recomputing it here would be a second pay authority. */
   async function setStaj(w: Worker, staj_years: number | null): Promise<boolean> {
      try {
         const { data } = await api.put('/control/ellikboshi-staj',
            { username: w.username, staj_years })
         w.staj_years = data.staj_years
         w.fiks_info = data.fiks_info
         await load()
         return true
      } catch {
         return false
      }
   }

   return {
      period, loading, loadError, saving, savedMsg, setStaj,
      report, workers, groupOptions, aggressive, staffReadiness, slaOverdue, scope,
      leaderGroups, leaderGroupsLoading, leaderGroupsError, loadLeaderGroups,
      groupPeriod, periodCounts, periodRange, periodUnscheduled,
      periodCountsLoading, periodCountsError, loadPeriodCounts, setGroupPeriod,
      filterGroup, filterCity, filterRole, filterName,
      requests, requestsLoading, requestsLoaded, reqLimit, requestsTruncated,
      form, sliceQuery, dismissed,
      load, loadRequests, loadMoreRequests, setSlice, setPeriod, clearSlice,
      dismissProblems, restoreProblems, dismissReopen, save,
      chatPeers, chatThread, chatUnread, chatLoading, chatSending,
      loadChatUnread, loadChatPeers, loadChatThread, sendChat, markChatRead,
   }
})

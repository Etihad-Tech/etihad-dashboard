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

export interface Worker {
   telegram_id: number; username: string | null; name: string | null; role: string
   dms: number; undelivered: number; accepted: number; never_accepted: number
   completed: number; re_requests: number; reopened: number; released: number
   flagged: number; flags_confirmed: number; flags_neutral: number
   avg_response_seconds: number | null
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
   // The roster screen. Kept OUT of load(): it takes no period and no group/city slice,
   // so re-pulling it whenever the window changes would be pure waste — and worse, it
   // would imply to the reader that it answers to the selector like everything else does.
   const leaderGroups = ref<LeaderGroups[]>([])
   const leaderGroupsLoading = ref(false)
   const leaderGroupsError = ref<'' | 'forbidden' | 'failed'>('')

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

   /** Cleared notifications, as `key -> the value it held when it was cleared`.
    *
    *  Storing the VALUE and not just the key is the whole safeguard. These are live
    *  counts, not messages: «36 Javobsiz qolgan» is a fact about the period, and a
    *  «clear» that hid it permanently would let a worsening situation sit invisible
    *  behind a calm bell. Cleared at 36, it stays hidden while it is still 36 and comes
    *  straight back at 37 — or when the period or the slice changes the number.
    *
    *  Kept in localStorage so it survives a reload, the way a phone app's badge does. */
   const DISMISS_KEY = 'nazorat_dismissed'
   function readDismissed(): Record<string, number> {
      try {
         const raw = localStorage.getItem(DISMISS_KEY)
         return raw ? JSON.parse(raw) : {}
      } catch { return {} }
   }
   const dismissed = ref<Record<string, number>>(readDismissed())

   function persistDismissed() {
      try { localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed.value)) } catch { /* private mode */ }
   }
   function dismissProblems(items: { key: string; value: number }[]) {
      const next = { ...dismissed.value }
      for (const i of items) next[i.key] = i.value
      dismissed.value = next
      persistDismissed()
   }
   function restoreProblems() {
      dismissed.value = {}
      persistDismissed()
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
         const [rep, wrk, agg, sr, st, sc, grp] = await Promise.all([
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
         ])
         report.value = rep.data
         workers.value = wrk.data
         aggressive.value = agg.data || { total: 0, items: [] }
         staffReadiness.value = sr.data
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

   return {
      period, loading, loadError, saving, savedMsg,
      report, workers, groupOptions, aggressive, staffReadiness, scope,
      leaderGroups, leaderGroupsLoading, leaderGroupsError, loadLeaderGroups,
      filterGroup, filterCity, filterRole, filterName,
      requests, requestsLoading, requestsLoaded, reqLimit, requestsTruncated,
      form, sliceQuery, dismissed,
      load, loadRequests, loadMoreRequests, setSlice, setPeriod, clearSlice,
      dismissProblems, restoreProblems, dismissReopen, save,
   }
})

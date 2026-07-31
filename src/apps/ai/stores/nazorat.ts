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
   // per NEED
   requests: number; unassigned: number
   // per RECIPIENT ROW (one per worker the need was DM'd to)
   dms: number; delivered: number; undelivered: number
   accepted: number; never_accepted: number; completed: number; re_requests: number
   reopened: number; avg_response_seconds: number | null
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

export interface GroupOption { chat_id: number; title: string | null; cities: string[] }

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
   const staffReadiness = ref<StaffReady[]>([])

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
         const [rep, wrk, sr, st, sc, grp] = await Promise.all([
            api.get(`/control/report?${q}`),
            api.get(`/control/workers?${q}`),
            api.get('/control/staff-readiness'),
            api.get('/control/settings'),
            api.get('/control/scope'),
            // Deliberately NOT sliced: the group list must keep offering the other
            // groups, otherwise picking one would leave you unable to pick a different one.
            api.get(`/control/groups?period=${period.value}`),
         ])
         report.value = rep.data
         workers.value = wrk.data
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
      report, workers, groupOptions, staffReadiness, scope,
      filterGroup, filterCity, filterRole, filterName,
      requests, requestsLoading, requestsLoaded, reqLimit, requestsTruncated,
      form, sliceQuery,
      load, loadRequests, loadMoreRequests, setSlice, setPeriod, clearSlice,
      dismissReopen, save,
   }
})

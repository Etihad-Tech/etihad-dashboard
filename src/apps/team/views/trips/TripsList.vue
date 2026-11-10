<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Safarlar</h1>
        <div class="relative w-full sm:w-64 order-last sm:order-none">
          <font-awesome-icon icon="magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input v-model="search" type="search" class="input pl-9" placeholder="Nomi yoki ID" />
        </div>
        <button class="btn btn-primary" @click="formOpen = true">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />Yangi safar
        </button>
      </div>

      <div class="seg scroll-x">
        <button v-for="t in TABS" :key="t.value" type="button" class="seg-btn whitespace-nowrap" :class="{ 'seg-btn-on': tab === t.value }" @click="tab = t.value">
          {{ t.label }} <span class="ml-1 text-xs tabular-nums text-gray-400">{{ tabCount[t.value] }}</span>
        </button>
      </div>

      <div v-if="loading" class="card divide-y divide-gray-100">
        <div v-for="i in 6" :key="i" class="flex items-center gap-4 px-4 py-4">
          <div class="w-4 h-4 rounded bg-gray-100"></div>
          <div class="h-3.5 w-40 rounded bg-gray-100"></div>
          <div class="h-3.5 w-24 rounded bg-gray-100 ml-auto"></div>
        </div>
      </div>
      <p v-else-if="loadError" class="card empty text-rose-600">{{ loadError }}</p>
      <div v-else-if="shown.length === 0" class="card empty">
        {{ search ? 'Topilmadi' : EMPTY[tab] }}
      </div>

      <div v-else class="card overflow-x-auto">
        <table class="table sm:min-w-[720px]">
          <thead>
            <tr>
              <th class="w-10 !pr-0"><TickBox :state="sel.groupState(shownIds)" label="Hammasini tanlash" @tick="sel.toggleGroup(shownIds)" /></th>
              <th>Safar</th>
              <th>Uchish</th>
              <th class="hidden sm:table-cell">Qaytish</th>
              <th class="text-right hidden sm:table-cell">Ishtirokchi</th>
              <th class="text-right hidden sm:table-cell">Postlar</th>
              <th class="hidden sm:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in shown" :key="t.trip_id" class="cursor-pointer" :class="{ '!bg-amber-50/70': sel.has(t.trip_id) }"
              @click="router.push(`/team/trips/${t.trip_id}`)">
              <td class="!pr-0"><TickBox :state="sel.has(t.trip_id) ? 'all' : 'none'" label="Tanlash" @tick="sel.toggle(t.trip_id, $event)" /></td>
              <td class="max-w-72">
                <p class="font-medium text-gray-900 truncate">{{ t.name }}</p>
                <p class="text-xs text-gray-400 font-mono">{{ t.trip_id }}<span v-if="!t.group_chat_id" class="sm:hidden font-sans text-rose-600"> · guruh yo'q</span></p>
              </td>
              <td class="whitespace-nowrap">
                <p class="text-gray-900 tabular-nums">{{ fmtDate(parseDate(t.start_date), true) }}</p>
                <p class="text-xs" :class="phaseClass(t)">{{ phaseNote(t) }}</p>
              </td>
              <td class="whitespace-nowrap text-gray-500 tabular-nums hidden sm:table-cell">{{ fmtDate(parseDate(t.end_date)) }}</td>
              <td class="text-right tabular-nums text-gray-700 hidden sm:table-cell">{{ counts[t.trip_id]?.participants ?? 0 }}</td>
              <td class="text-right whitespace-nowrap tabular-nums hidden sm:table-cell">
                <span class="text-gray-700">{{ counts[t.trip_id]?.posts ?? 0 }}</span>
                <span v-if="counts[t.trip_id]?.pending" class="text-xs text-gray-400"> · {{ counts[t.trip_id].pending }} navbatda</span>
              </td>
              <td class="text-right whitespace-nowrap hidden sm:table-cell">
                <span v-if="!t.group_chat_id" class="chip chip-red">Guruh yo'q</span>
                <span v-else-if="t.registration_open" class="chip chip-green">Ro'yxat ochiq</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SelectionBar :count="sel.count.value" @clear="sel.clear()">
        <button v-if="tab !== 'archived'" type="button" :class="BAR_BTN" @click="importOpen = true">
          <font-awesome-icon icon="clone" class="w-3 h-3" />Shablon<span class="hidden sm:inline">&nbsp;qo'shish</span>
        </button>
        <Dropdown up :button-class="BAR_BTN">
          <template #button><font-awesome-icon icon="user-plus" class="w-3 h-3" />Ro'yxat</template>
          <button type="button" class="menu-item" data-close @click="bulk(t => tripsApi.setRegistration(t, true), 'Ro\'yxat ochildi')">Ochish</button>
          <button type="button" class="menu-item" data-close @click="bulk(t => tripsApi.setRegistration(t, false), 'Ro\'yxat yopildi')">Yopish</button>
        </Dropdown>
        <button v-if="tab === 'archived'" type="button" :class="BAR_BTN" @click="bulk(t => tripsApi.setActive(t, true), 'Aktivga qaytdi')">
          <font-awesome-icon icon="rotate-left" class="w-3 h-3" />Aktivga qaytarish
        </button>
        <button v-else type="button" :class="BAR_BTN" @click="archive">
          <font-awesome-icon icon="box-archive" class="w-3 h-3" />Arxivga
        </button>
      </SelectionBar>
    </div>

    <TripForm :open="formOpen" @close="formOpen = false" @saved="t => router.push(`/team/trips/${t.trip_id}`)" />
    <ImportDialog :open="importOpen" mode="template" :trip-ids="sel.ids.value" @close="importOpen = false" @done="load" />
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import { useConfirm } from '../../../../composables/useConfirm'
import { useToast } from '../../../../composables/useToast'
import { errorText, trips as tripsApi, type Trip, type TripCounts } from '../../api'
import Dropdown from '../../components/Dropdown.vue'
import ImportDialog from '../../components/ImportDialog.vue'
import SelectionBar from '../../components/SelectionBar.vue'
import TickBox from '../../components/TickBox.vue'
import TripForm from '../../components/TripForm.vue'
import { fmtDate, parseDate, phaseNote, tripPhase, type TripPhase } from '../../format'
import { useSelection } from '../../selection'

// The trips, split by where they stand today — the four questions the office asks every
// day: who leaves next, who is on the road, who is back and still open, what is archived.
const router = useRouter()
const toast = useToast()
const { confirm } = useConfirm()
const BAR_BTN = 'btn btn-sm text-gray-100 hover:bg-white/10'

type Tab = 'all' | TripPhase
const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'Hammasi' },
  { value: 'upcoming', label: 'Kelgusi' },
  { value: 'ontrip', label: 'Safarda' },
  { value: 'over', label: 'Qaytgan' },
  { value: 'archived', label: 'Arxiv' },
]
const EMPTY: Record<Tab, string> = {
  all: "Aktiv safarlar yo'q", upcoming: "Kelgusi safarlar yo'q", ontrip: "Hozir safarda hech kim yo'q",
  over: "Qaytib, arxivga o'tmagan safar yo'q", archived: "Arxiv bo'sh",
}

const tab = ref<Tab>('all')
const search = ref('')
const active = ref<Trip[]>([])
const archived = ref<Trip[]>([])
const counts = ref<Record<string, TripCounts>>({})
const loading = ref(true)
const loadError = ref('')
const formOpen = ref(false)
const importOpen = ref(false)

async function load() {
  loadError.value = ''
  try {
    const [a, z, c] = await Promise.all([tripsApi.active(), tripsApi.archived(), tripsApi.counts().catch(() => ({}))])
    active.value = a
    archived.value = z
    counts.value = c
  } catch (e) {
    loadError.value = errorText(e, "Safarlarni yuklab bo'lmadi")
  } finally {
    loading.value = false
  }
}
onMounted(load)

const matches = (t: Trip) => {
  const q = search.value.trim().toLowerCase()
  return !q || t.name.toLowerCase().includes(q) || t.trip_id.toLowerCase().includes(q)
}
const time = (iso: string | null, empty: number) => parseDate(iso)?.getTime() ?? empty

const inTab = (t: Trip, which: Tab) => (which === 'all' ? t.is_active : tripPhase(t) === which)

const PHASE_ORDER: Record<TripPhase, number> = { ontrip: 0, upcoming: 1, over: 2, archived: 3 }

/** The rows of a tab, in the order that tab is read: on the road, then the next
 *  departures soonest first, then the trips back home and the archive, latest first. */
function rowsOf(which: Tab): Trip[] {
  const pool = which === 'archived' ? archived.value : active.value
  return pool.filter(t => inTab(t, which) && matches(t)).sort((a, b) => {
    const pa = tripPhase(a)
    const pb = tripPhase(b)
    if (pa !== pb) return PHASE_ORDER[pa] - PHASE_ORDER[pb]
    return pa === 'over' || pa === 'archived'
      ? time(b.start_date, 0) - time(a.start_date, 0)
      : time(a.start_date, Infinity) - time(b.start_date, Infinity)
  })
}

const shown = computed(() => rowsOf(tab.value))
const tabCount = computed(() => Object.fromEntries(TABS.map(t => [t.value, rowsOf(t.value).length])) as Record<Tab, number>)
const shownIds = computed(() => shown.value.map(t => t.trip_id))
const sel = useSelection(shownIds)
watch(tab, () => sel.clear())

const phaseClass = (t: Trip) => ({
  upcoming: 'text-gray-500', ontrip: 'text-emerald-600 font-medium', over: 'text-amber-700', archived: 'text-gray-400',
}[tripPhase(t)])

/** One call per ticked trip; the list is read again afterwards. */
async function bulk(action: (tripId: string) => Promise<unknown>, done: string) {
  const ids = sel.ids.value
  const failed: string[] = []
  for (const id of ids) {
    try {
      await action(id)
    } catch {
      failed.push(id)
    }
  }
  if (ids.length > failed.length) toast.success(`${ids.length - failed.length} ta safar: ${done.toLowerCase()}`)
  if (failed.length) toast.error(`O'zgarmadi: ${failed.join(', ')}`)
  sel.clear()
  await load()
}

async function archive() {
  const n = sel.count.value
  if (!(await confirm({ title: `${n} ta safarni arxivga o'tkazish`, message: "Arxivdagi safarning postlari yuborilmaydi", confirmText: 'Arxivga' }))) return
  await bulk(t => tripsApi.setActive(t, false), 'Arxivga o\'tdi')
}
</script>

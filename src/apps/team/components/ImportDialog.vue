<template>
  <BaseModal :open="open" :title="title" width="sm:max-w-xl" @close="emit('close')">
    <input v-if="rows.length > 6" v-model="search" type="search" class="input" :placeholder="mode === 'template' ? 'Shablon nomi' : 'Safar nomi yoki ID'" />

    <div v-if="loading" class="flex justify-center py-8"><div class="spinner"></div></div>
    <div v-else-if="shownRows.length === 0" class="empty py-8">{{ search ? 'Topilmadi' : mode === 'template' ? "Shablonlar yo'q" : "Aktiv safarlar yo'q" }}</div>

    <div v-else class="-mx-5 max-h-[52vh] overflow-y-auto border-y border-gray-100">
      <label v-if="mode === 'trips'" class="flex items-center gap-3 px-5 h-10 bg-gray-50/80 border-b border-gray-100 text-sm font-medium text-gray-700">
        <TickBox :state="sel.groupState(shownIds)" label="Hammasini tanlash" @tick="sel.toggleGroup(shownIds)" />
        Hammasi
        <span class="ml-auto text-xs text-gray-400 tabular-nums">{{ shownRows.length }}</span>
      </label>
      <label v-for="r in shownRows" :key="r.key"
        class="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
        :class="isPicked(r.key) ? 'bg-amber-50/70' : 'hover:bg-gray-50'">
        <input v-if="mode === 'template'" v-model="templateId" type="radio" :value="r.key" class="checkbox rounded-full" />
        <TickBox v-else :state="sel.has(r.key as string) ? 'all' : 'none'" label="Tanlash" @tick="sel.toggle(r.key as string, $event)" />
        <span class="flex-1 min-w-0">
          <span class="block text-sm text-gray-900 truncate">{{ r.title }}</span>
          <span class="block text-xs text-gray-400 truncate">{{ r.note }}</span>
        </span>
        <span v-if="r.warn" class="chip chip-amber shrink-0">{{ r.warn }}</span>
      </label>
    </div>

    <p v-if="duplicates" class="text-xs text-amber-700">
      <font-awesome-icon icon="triangle-exclamation" class="w-3 h-3 mr-1" />{{ duplicates }} ta safarda postlar allaqachon bor — shablon postlari yana qo'shiladi
    </p>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="emit('close')">Bekor qilish</button>
      <button type="button" class="btn btn-primary" :disabled="!ready || busy" @click="run">
        {{ busy ? `Qo'shilmoqda… ${progress}` : actionLabel }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '../../../components/BaseModal.vue'
import { useToast } from '../../../composables/useToast'
import { errorText, templates as templatesApi, trips as tripsApi, type Template, type Trip, type TripCounts } from '../api'
import { fmtDate, parseDate, phaseNote, tripPhase } from '../format'
import { useSelection } from '../selection'
import TickBox from './TickBox.vue'

// Putting a template's posts into trips, from either side (owner, 2026-11-10):
//   mode 'template' — the trips are chosen (a trip page, or several ticked trips); pick the template;
//   mode 'trips'    — the template is chosen (its page); tick the trips.
// A trip that already has posts is marked: the import adds the template's posts again.
const props = defineProps<{
  open: boolean
  mode: 'template' | 'trips'
  /** mode 'template': the trips that get the posts. */
  tripIds?: string[]
  /** mode 'trips': the template whose posts go in. */
  template?: Template | null
}>()
const emit = defineEmits<{ close: []; done: [] }>()
const toast = useToast()

const loading = ref(false)
const busy = ref(false)
const progress = ref('')
const search = ref('')
const templateList = ref<Template[]>([])
const tripList = ref<Trip[]>([])
const counts = ref<Record<string, TripCounts>>({})
const templateId = ref<number | null>(null)

const shownIds = computed(() => shownRows.value.map(r => r.key as string))
const sel = useSelection(shownIds)

watch(() => props.open, async (v) => {
  if (!v) return
  search.value = ''
  templateId.value = null
  sel.clear()
  loading.value = true
  try {
    const [c, list] = await Promise.all([
      tripsApi.counts().catch(() => ({})),
      props.mode === 'template' ? templatesApi.list() : tripsApi.active(),
    ])
    counts.value = c
    if (props.mode === 'template') templateList.value = list as Template[]
    else {
      // The next departures first — the trips a template is put into are about to leave —
      // then the ones on the road, and the ones back home last.
      const rank = { upcoming: 0, ontrip: 1, over: 2, archived: 3 }
      tripList.value = (list as Trip[]).slice().sort((a, b) =>
        rank[tripPhase(a)] - rank[tripPhase(b)]
        || (parseDate(a.start_date)?.getTime() ?? Infinity) - (parseDate(b.start_date)?.getTime() ?? Infinity))
    }
  } catch (e) {
    toast.error(errorText(e))
  } finally {
    loading.value = false
  }
})

interface Row { key: number | string; title: string; note: string; warn: string }

const rows = computed<Row[]>(() => props.mode === 'template'
  ? templateList.value.map(t => ({
      key: t.id, title: t.name,
      note: [t.description, `${t.post_count ?? 0} post`].filter(Boolean).join(' · '), warn: '',
    }))
  : tripList.value.map(t => ({
      key: t.trip_id, title: t.name,
      note: `${t.trip_id} · ${fmtDate(parseDate(t.start_date))} · ${phaseNote(t)}`,
      warn: counts.value[t.trip_id]?.posts ? `${counts.value[t.trip_id].posts} post bor` : '',
    })))

const shownRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? rows.value.filter(r => r.title.toLowerCase().includes(q) || String(r.key).toLowerCase().includes(q)) : rows.value
})

const isPicked = (key: number | string) => (props.mode === 'template' ? templateId.value === key : sel.has(key as string))
const targetTrips = computed(() => (props.mode === 'template' ? props.tripIds ?? [] : sel.ids.value))
const ready = computed(() => targetTrips.value.length > 0 && (props.mode === 'trips' || templateId.value !== null))
const duplicates = computed(() => targetTrips.value.filter(id => counts.value[id]?.posts).length)

const title = computed(() => (props.mode === 'template'
  ? (props.tripIds?.length === 1 ? 'Shablondan postlar qo\'shish' : `${props.tripIds?.length ?? 0} ta safarga shablon`)
  : `«${props.template?.name ?? ''}» — safarlarga qo'shish`))
const actionLabel = computed(() => (targetTrips.value.length > 1 ? `${targetTrips.value.length} ta safarga qo'shish` : "Qo'shish"))

async function run() {
  const tplId = props.mode === 'template' ? templateId.value : props.template?.id
  if (!tplId) return
  busy.value = true
  const failed: string[] = []
  const list = targetTrips.value
  for (const [i, tripId] of list.entries()) {
    progress.value = list.length > 1 ? `${i + 1}/${list.length}` : ''
    try {
      await templatesApi.importTo(tplId, tripId)
    } catch {
      failed.push(tripId)
    }
  }
  busy.value = false
  progress.value = ''
  const ok = list.length - failed.length
  if (ok) toast.success(list.length > 1 ? `${ok} ta safarga qo'shildi` : "Postlar qo'shildi")
  if (failed.length) toast.error(`Qo'shilmadi: ${failed.join(', ')}`)
  emit('done')
  emit('close')
}
</script>

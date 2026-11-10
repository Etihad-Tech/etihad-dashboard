<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <div v-if="kind === 'trip'" class="seg scroll-x">
        <button v-for="f in STATUS_FILTERS" :key="f.value" type="button" class="seg-btn" :class="{ 'seg-btn-on': status === f.value }"
          @click="pickStatus(f.value)">
          {{ f.label }} <span class="ml-1 text-xs tabular-nums text-gray-400">{{ statusCount[f.value] }}</span>
        </button>
      </div>
      <div v-if="days.length > 1" class="flex items-center gap-1 scroll-x py-0.5">
        <button type="button" class="filter-chip" :class="{ 'filter-chip-on': day === null }" @click="day = null">Barcha kunlar</button>
        <button v-for="d in days" :key="d" type="button" class="filter-chip tabular-nums relative" :class="{ 'filter-chip-on': day === d }"
          :title="dayTitle(d)" @click="day = day === d ? null : d">
          {{ d }}
          <span v-if="d === currentDay" class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        </button>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="loading" class="card divide-y divide-gray-100">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-4 py-3.5">
        <div class="w-4 h-4 rounded bg-gray-100"></div>
        <div class="w-10 h-3.5 rounded bg-gray-100"></div>
        <div class="h-3.5 rounded bg-gray-100" :style="{ width: 30 + (i * 13) % 50 + '%' }"></div>
      </div>
    </div>

    <div v-else-if="posts.length === 0" class="card empty">
      <slot name="empty">Postlar yo'q</slot>
    </div>

    <div v-else-if="groups.length === 0" class="card empty">
      Bu tanlovda post yo'q
      <button type="button" class="btn btn-sm btn-ghost ml-1" @click="resetFilters">Filtrni tozalash</button>
    </div>

    <div v-else class="card overflow-hidden">
      <section v-for="g in groups" :key="g.day">
        <div class="flex items-center gap-3 px-4 h-10 bg-gray-50/80 border-b border-gray-100" :class="{ 'border-t': g !== groups[0] }">
          <TickBox :state="sel.groupState(g.ids)" :label="`${g.day}-kun postlarini tanlash`" @tick="sel.toggleGroup(g.ids)" />
          <span class="text-sm font-semibold text-gray-900 tabular-nums">{{ g.day }}-kun</span>
          <span v-if="g.date" class="text-xs text-gray-500">{{ g.date }}</span>
          <span v-if="g.day === currentDay" class="chip chip-amber h-5">Bugun</span>
          <span class="ml-auto text-xs text-gray-400 tabular-nums">{{ g.posts.length }}</span>
        </div>
        <div
          v-for="p in g.posts"
          :key="p.id"
          class="group flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 cursor-pointer transition-colors"
          :class="sel.has(p.id) ? 'bg-amber-50/70' : 'hover:bg-gray-50/80'"
          @click="emit('open', p)"
        >
          <TickBox class="mt-0.5" :state="sel.has(p.id) ? 'all' : 'none'" :label="'Tanlash'" @tick="sel.toggle(p.id, $event)" />
          <div class="w-[4.25rem] shrink-0 leading-tight">
            <span class="text-sm tabular-nums" :class="dim(p) ? 'text-gray-400' : 'text-gray-900'">{{ effectiveTime(p).time }}</span>
            <span v-if="p.delay_minutes" class="block text-[11px] font-medium text-amber-700 tabular-nums" :title="`Asl vaqti ${p.scheduled_time.slice(0, 5)}`">
              {{ fmtDelay(p.delay_minutes) }}<template v-if="effectiveTime(p).dayShift"> · {{ effectiveTime(p).dayShift > 0 ? '+' : '' }}{{ effectiveTime(p).dayShift }} kun</template>
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm line-clamp-2 break-words" :class="dim(p) ? 'text-gray-400' : 'text-gray-800'">
              <font-awesome-icon v-if="isPoll(p)" icon="square-poll-horizontal" class="w-3.5 h-3.5 mr-1 text-gray-400" />
              {{ plainText(p.message_text) || '—' }}
            </p>
            <p v-if="isPoll(p)" class="text-xs text-gray-400 truncate mt-0.5">{{ pollOptions(p).join(' · ') }}</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0 pt-px text-gray-400">
            <span v-if="mediaInfo(p)" class="inline-flex items-center gap-1 text-xs" :title="mediaInfo(p)!.label">
              <font-awesome-icon :icon="mediaInfo(p)!.icon" class="w-3.5 h-3.5" />
              <span v-if="mediaInfo(p)!.count > 1" class="tabular-nums">{{ mediaInfo(p)!.count }}</span>
            </span>
            <font-awesome-icon v-if="p.pin_message && p.topic_slot !== 0" icon="thumbtack" class="w-3 h-3" title="Guruhda qadaladi" />
            <font-awesome-icon v-if="p.send_mode === 'now'" icon="bolt" class="w-3 h-3" title="Hoziroq — botlar ishga tushganda" />
            <span v-if="topicMark(p.topic_slot)" class="chip h-5 hidden sm:inline-flex" :class="topicMark(p.topic_slot)!.cls">{{ topicMark(p.topic_slot)!.text }}</span>
            <span v-if="alsoCabinet(p)" class="chip chip-violet h-5 hidden sm:inline-flex" title="Guruhga va kabinetga">+ Kabinet</span>
            <span v-if="!p.is_sent && !p.is_active" class="chip chip-gray h-5">Nofaol</span>
            <font-awesome-icon v-if="p.is_sent" icon="check" class="w-3.5 h-3.5 text-emerald-600" title="Yuborildi" />
          </div>
        </div>
      </section>
    </div>

    <SelectionBar :count="sel.count.value" @clear="sel.clear()">
      <Dropdown v-if="kind === 'trip'" up :button-class="BAR_BTN">
        <template #button><font-awesome-icon icon="clock" class="w-3 h-3" /><span class="hidden sm:inline">Kechiktirish</span></template>
        <div class="p-1.5 space-y-2 w-64">
          <div class="grid grid-cols-3 gap-1">
            <button v-for="m in SHIFTS" :key="m" type="button" class="btn btn-sm btn-secondary tabular-nums" data-close @click="shift(m)">{{ fmtDelay(m) }}</button>
          </div>
          <form class="flex items-center gap-1.5" @submit.prevent="shiftCustom">
            <input v-model.number="customShift" type="number" step="5" class="input input-sm" placeholder="Daqiqa, masalan 45 yoki −20" />
            <button type="submit" class="btn btn-sm btn-primary" :disabled="!customShift" data-close>OK</button>
          </form>
          <button type="button" class="menu-item" data-close @click="resetDelay">
            <font-awesome-icon icon="rotate-left" class="w-3 h-3 text-gray-400" />Asl vaqtiga qaytarish
          </button>
        </div>
      </Dropdown>

      <Dropdown up :button-class="BAR_BTN">
        <template #button><font-awesome-icon icon="location-arrow" class="w-3 h-3" /><span class="hidden sm:inline">Qayerga</span></template>
        <p class="menu-head">Guruhda</p>
        <button v-for="o in topicChoices" :key="String(o.slot)" type="button" class="menu-item" data-close @click="setFields({ topic_slot: o.slot })">
          {{ o.label }}
        </button>
        <button type="button" class="menu-item" data-close @click="setFields({ topic_slot: 0 })">
          <span class="w-1.5 h-1.5 rounded-full bg-violet-500"></span>Faqat kabinetga
        </button>
        <p class="menu-head">Kabinetga ham</p>
        <div class="flex gap-1 px-1 pb-1">
          <button v-if="kind === 'template'" type="button" class="btn btn-sm btn-secondary flex-1" data-close @click="setFields({ to_cabinet: null })">Shablon bo'yicha</button>
          <button type="button" class="btn btn-sm btn-secondary flex-1" data-close @click="setFields({ to_cabinet: true })">Ha</button>
          <button type="button" class="btn btn-sm btn-secondary flex-1" data-close @click="setFields({ to_cabinet: false })">Yo'q</button>
        </div>
      </Dropdown>

      <button type="button" :class="BAR_BTN" title="Faol qilish" @click="setFields({ is_active: true })">
        <font-awesome-icon icon="toggle-on" class="w-3.5 h-3.5" /><span class="hidden sm:inline">Faol</span>
      </button>
      <button type="button" :class="BAR_BTN" title="Nofaol qilish" @click="setFields({ is_active: false })">
        <font-awesome-icon icon="toggle-off" class="w-3.5 h-3.5" /><span class="hidden sm:inline">Nofaol</span>
      </button>
      <button type="button" class="btn btn-sm text-rose-300 hover:text-white hover:bg-rose-600" title="O'chirish" @click="removeSelected">
        <font-awesome-icon icon="trash" class="w-3 h-3" /><span class="hidden sm:inline">O'chirish</span>
      </button>
    </SelectionBar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'
import { errorText, posts as postsApi, type BulkResult, type Post, type PostFields, type PostKind, type Trip } from '../api'
import {
  dayDate, daysBetween, effectiveTime, fmtDate, fmtDelay, mediaInfo, parseDate, plainText,
  pollOptions, today, topicLabel, topicMark, tripTopics,
} from '../format'
import { useSelection } from '../selection'
import Dropdown from './Dropdown.vue'
import SelectionBar from './SelectionBar.vue'
import TickBox from './TickBox.vue'

// One list for a trip's posts and a template's posts (owner, 2026-11-10): grouped by day,
// filtered by day and — for a trip — by what is still to go out, ticked for one action on
// many. A row opens the post; everything else happens from the bar at the bottom.
const props = defineProps<{
  kind: PostKind
  posts: Post[]
  /** The trip whose posts these are: its dates name the days, its topics the choices. */
  trip?: Trip | null
  /** A template's own «Kabinetga yuborish»: what a post left on «shablon bo'yicha» does. */
  templateCabinet?: boolean | null
  loading?: boolean
}>()
const emit = defineEmits<{ open: [post: Post]; changed: [] }>()
const toast = useToast()
const { confirm } = useConfirm()

const BAR_BTN = 'btn btn-sm text-gray-100 hover:bg-white/10'
const SHIFTS = [-30, 15, 30, 60, 120, 180]

type Status = 'all' | 'pending' | 'sent'
const STATUS_FILTERS: { value: Status; label: string }[] = [
  { value: 'all', label: 'Hammasi' },
  { value: 'pending', label: 'Navbatda' },
  { value: 'sent', label: 'Yuborilgan' },
]
const status = ref<Status>('all')
// A trip under way opens on what is still ahead; «Hammasi» is one tap away.
let statusChosen = false
watch(() => props.posts, (list) => {
  if (statusChosen || props.kind !== 'trip' || !list.length) return
  statusChosen = true
  if (list.some(p => p.is_sent) && list.some(isPending)) status.value = 'pending'
}, { immediate: true })
function pickStatus(v: Status) {
  statusChosen = true
  status.value = v
}
const day = ref<number | null>(null)
const customShift = ref<number | null>(null)

function isPoll(p: Post) { return pollOptions(p).length > 0 }
function isPending(p: Post) { return !p.is_sent && p.is_active }
const dim = (p: Post) => !!p.is_sent || !p.is_active
const alsoCabinet = (p: Post) => p.topic_slot !== 0 && !isPoll(p)
  && (p.to_cabinet === null ? !!props.templateCabinet : !!p.to_cabinet)

const days = computed(() => [...new Set(props.posts.map(p => p.day_number))].sort((a, b) => a - b))

/** Today's day of the trip, when it is on its way. */
const currentDay = computed(() => {
  const start = parseDate(props.trip?.start_date)
  if (props.kind !== 'trip' || !start) return null
  const n = daysBetween(start, today()) + 1
  return days.value.includes(n) ? n : null
})
const dayTitle = (d: number) => {
  const date = props.trip ? dayDate(props.trip.start_date, d) : null
  return date ? fmtDate(date, true) : `${d}-kun`
}

const statusCount = computed(() => ({
  all: props.posts.length,
  pending: props.posts.filter(isPending).length,
  sent: props.posts.filter(p => p.is_sent).length,
}))

const shown = computed(() => props.posts.filter(p =>
  (day.value === null || p.day_number === day.value)
  && (status.value === 'all' || (status.value === 'pending' ? isPending(p) : !!p.is_sent))))

const groups = computed(() => {
  const by = new Map<number, Post[]>()
  for (const p of shown.value) {
    if (!by.has(p.day_number)) by.set(p.day_number, [])
    by.get(p.day_number)!.push(p)
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([d, list]) => {
    const date = props.trip ? dayDate(props.trip.start_date, d) : null
    return { day: d, date: date ? fmtDate(date, true) : '', posts: list, ids: list.map(p => p.id) }
  })
})

const order = computed(() => groups.value.flatMap(g => g.ids))
const sel = useSelection(order)
watch(order, () => sel.prune())

function resetFilters() {
  day.value = null
  status.value = 'all'
}

/** The group's topics this list can choose between: the trip's own, or — for a template,
 *  which serves many groups — both slots by name. A trip without topics has one: the group. */
const topicChoices = computed(() => {
  if (props.kind === 'template') {
    return ([1, 2, null] as const).map(slot => ({ slot, label: topicLabel(slot) }))
  }
  const topics = tripTopics(props.trip ?? null)
  if (topics.length === 0) return [{ slot: 1 as const, label: 'Guruhga' }]
  const list: { slot: 1 | 2 | null; label: string }[] = topics.map(t => ({ slot: t.slot, label: topicLabel(t.slot) }))
  if (topics.length > 1) list.push({ slot: null, label: topicLabel(null) })
  return list
})

function report(r: BulkResult, verb: string) {
  if (r.done.length) toast.success(`${r.done.length} ta post ${verb}`)
  if (r.skipped.length) {
    const reasons = [...new Set(r.skipped.map(s => s.reason))].join('; ')
    toast.error(`${r.skipped.length} tasi o'zgarmadi: ${reasons}`)
  }
}

async function run(body: Parameters<typeof postsApi.bulk>[1], verb: string) {
  try {
    report(await postsApi.bulk(props.kind, body), verb)
  } catch (e) {
    toast.error(errorText(e))
  }
  emit('changed')
}

const setFields = (fields: PostFields) => run({ ids: sel.ids.value, action: 'set', fields }, "o'zgardi")
const shift = (minutes: number) => run({ ids: sel.ids.value, action: 'shift', minutes }, 'surildi')
const resetDelay = () => run({ ids: sel.ids.value, action: 'reset_delay' }, 'asl vaqtiga qaytdi')
function shiftCustom() {
  const m = Math.trunc(Number(customShift.value))
  if (!m) return
  customShift.value = null
  shift(m)
}

async function removeSelected() {
  const n = sel.count.value
  if (!(await confirm({ title: `${n} ta postni o'chirish` }))) return
  await run({ ids: sel.ids.value, action: 'delete' }, "o'chirildi")
  sel.clear()
}

defineExpose({ clearSelection: () => sel.clear() })
</script>


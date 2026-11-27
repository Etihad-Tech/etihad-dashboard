<template>
  <AppShell>
    <div class="page max-w-3xl">
      <div class="page-head">
        <h1 class="page-title">Shaxsiy kabinet</h1>
        <span v-if="!loading && !loadError" class="text-sm text-gray-400 tabular-nums">{{ items.length }}</span>
        <button class="icon-btn" title="Yangilash" :disabled="loading" @click="load">
          <font-awesome-icon icon="rotate-right" class="w-3.5 h-3.5" />
        </button>
      </div>

      <div v-if="loading" class="card divide-y divide-gray-100">
        <div v-for="i in 4" :key="i" class="px-4 py-4 space-y-2.5">
          <div class="h-3.5 w-40 rounded bg-gray-100"></div>
          <div class="h-3 rounded bg-gray-100" :style="{ width: 45 + (i * 17) % 45 + '%' }"></div>
          <div class="h-6 w-36 rounded-lg bg-gray-100"></div>
        </div>
      </div>
      <p v-else-if="loadError" class="card empty text-rose-600">{{ loadError }}</p>
      <div v-else-if="items.length === 0" class="card empty">Kabinetga yuborilgan e'lonlar yo'q</div>

      <template v-else>
      <div v-if="flights.length > 2 || dates.length > 1" class="space-y-2">
      <div v-if="flights.length > 2" class="seg scroll-x">
        <button v-for="f in flights" :key="f.value" type="button" class="seg-btn whitespace-nowrap" :class="{ 'seg-btn-on': flight === f.value }"
          @click="pickFlight(f.value)">
          {{ f.label }} <span class="ml-1 text-xs tabular-nums text-gray-400">{{ f.count }}</span>
        </button>
      </div>
      <div v-if="dates.length > 1" class="flex items-center gap-1 scroll-x py-0.5">
        <button type="button" class="filter-chip" :class="{ 'filter-chip-on': day === null }" @click="day = null">Barcha sanalar</button>
        <button v-for="d in dates" :key="d.iso" type="button" class="filter-chip tabular-nums" :class="{ 'filter-chip-on': day === d.iso }"
          :title="d.title" @click="day = day === d.iso ? null : d.iso">
          {{ d.label }} <span class="ml-0.5 opacity-60">{{ d.count }}</span>
        </button>
      </div>
      </div>

      <div class="card divide-y divide-gray-100">
        <article v-for="it in shown" :key="keyOf(it)" class="px-4 py-3.5">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span v-if="it.kind === 'broadcast'" class="chip chip-violet">Ommaviy post</span>
            <template v-else>
              <RouterLink :to="`/team/trips/${it.trip_id}`" class="text-sm font-semibold text-gray-900 hover:text-amber-700 transition-colors">
                {{ it.trip_name || it.trip_id }}
              </RouterLink>
              <span class="text-xs text-gray-500 tabular-nums">{{ it.day_number }}-kun</span>
            </template>
            <span v-if="it.also_group" class="chip chip-blue h-5">Guruhga ham</span>
            <span class="ml-auto text-xs text-gray-400 tabular-nums" :title="it.sent_at">{{ fmtMoment(it.sent_at) }}</span>
          </div>

          <p class="mt-1.5 text-sm text-gray-800 break-words whitespace-pre-line" :class="{ 'line-clamp-3': !expanded.has(keyOf(it)) }">
            {{ plainBlock(it.text) || '—' }}
          </p>
          <button v-if="isLong(it)" type="button" class="mt-0.5 text-xs font-medium text-amber-700 hover:text-amber-800" @click="toggle(it)">
            {{ expanded.has(keyOf(it)) ? "Yig'ish" : "To'liq ko'rish" }}
          </button>

          <div class="mt-2 flex items-center gap-3">
            <button type="button" class="btn btn-sm btn-ghost -ml-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              :disabled="busy === keyOf(it)" @click="remove(it)">
              <font-awesome-icon icon="trash" class="w-3 h-3" />{{ busy === keyOf(it) ? "O'chirilmoqda…" : "Kabinetdan o'chirish" }}
            </button>
            <span v-if="mediaOf(it.media_type, it.media_count)" class="ml-auto inline-flex items-center gap-1 text-xs text-gray-400"
              :title="mediaOf(it.media_type, it.media_count)!.label">
              <font-awesome-icon :icon="mediaOf(it.media_type, it.media_count)!.icon" class="w-3.5 h-3.5" />
              <span v-if="it.media_count > 1" class="tabular-nums">{{ it.media_count }}</span>
            </span>
          </div>
        </article>
      </div>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppShell from '../../../components/AppShell.vue'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'
import { cabinet, errorText, type CabinetItem, type CabinetRecall } from '../api'
import { fmtMoment, mediaOf, plainBlock } from '../format'

// «Shaxsiy kabinet» (user, 2026-11-14): «какие объявления и посты были отправлены к боту
// личного кабинета и внизу с кнопкой удалить который удаляет объявление отправленый в
// личный кабинет». What the pilgrim bot has now — a trip's posts and the mass posts — and
// each one taken out of it: the pilgrims' chats and the cabinet's list. The group's copy
// stays; taking a post out of the group is the bot's «↩️ … ўчириш».
const toast = useToast()
const { confirm } = useConfirm()

const items = ref<CabinetItem[]>([])
const loading = ref(true)
const loadError = ref('')
const busy = ref<string | null>(null)
const expanded = reactive(new Set<string>())

const keyOf = (it: CabinetItem) => `${it.kind}:${it.id}`

// Filter (user, 2026-11-27): «фильтр по рейсам четверг и суббота и по числам» — the
// trip's departure day: its weekday (the Payshanba and Shanba flights, as on the
// Guruhlar cards: getDay() 4 and 6) and the date itself. Only choices that have posts are
// offered, each with its count; a mass post went to everyone, so it is its own choice.
type Flight = 'all' | 'payshanba' | 'shanba' | 'other' | 'nodate' | 'broadcast'
const FLIGHT_LABEL: Record<Flight, string> = {
  all: 'Hammasi', payshanba: 'Payshanba', shanba: 'Shanba', other: 'Boshqa kunlar',
  nodate: 'Sanasiz', broadcast: 'Ommaviy',
}
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']

/** The date parts read as written, so the weekday is never shifted by the timezone. */
function startDay(it: CabinetItem): Date | null {
  const [y, m, d] = (it.trip_start_date || '').split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}

function flightOf(it: CabinetItem): Exclude<Flight, 'all'> {
  if (it.kind === 'broadcast') return 'broadcast'
  const d = startDay(it)
  if (!d) return 'nodate'
  return d.getDay() === 4 ? 'payshanba' : d.getDay() === 6 ? 'shanba' : 'other'
}

const flight = ref<Flight>('all')
const day = ref<string | null>(null)

const flights = computed(() => {
  const count: Partial<Record<Flight, number>> = { all: items.value.length }
  for (const it of items.value) count[flightOf(it)] = (count[flightOf(it)] || 0) + 1
  return (Object.keys(FLIGHT_LABEL) as Flight[])
    .filter(f => f === 'all' || count[f])
    .map(f => ({ value: f, label: FLIGHT_LABEL[f], count: count[f] || 0 }))
})

const inFlight = computed(() =>
  flight.value === 'all' ? items.value : items.value.filter(it => flightOf(it) === flight.value))

const dates = computed(() => {
  const count = new Map<string, number>()
  for (const it of inFlight.value) {
    if (startDay(it)) count.set(it.trip_start_date!, (count.get(it.trip_start_date!) || 0) + 1)
  }
  const p = (n: number) => String(n).padStart(2, '0')
  return [...count.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([iso, n]) => {
      const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
      return {
        iso, count: n,
        label: `${p(d.getDate())}.${p(d.getMonth() + 1)}`,
        title: `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${WEEKDAYS[d.getDay()]}`,
      }
    })
})

const shown = computed(() =>
  day.value === null ? inFlight.value : inFlight.value.filter(it => it.trip_start_date === day.value))

function pickFlight(f: Flight) {
  flight.value = f
  day.value = null
}

// A choice whose last post was just taken out of the cabinet is no longer offered.
watch(flights, fs => { if (!fs.some(f => f.value === flight.value)) pickFlight('all') })
watch(dates, ds => { if (day.value !== null && !ds.some(d => d.iso === day.value)) day.value = null })

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = (await cabinet.sent()).items
  } catch (e) {
    loadError.value = errorText(e, "Ro'yxatni yuklab bo'lmadi")
  } finally {
    loading.value = false
  }
}
onMounted(load)

function isLong(it: CabinetItem): boolean {
  const text = plainBlock(it.text)
  return text.length > 220 || text.split('\n').length > 3
}

function toggle(it: CabinetItem) {
  const k = keyOf(it)
  if (expanded.has(k)) expanded.delete(k)
  else expanded.add(k)
}

function whatGoes(it: CabinetItem): string {
  if (it.kind === 'broadcast') return "Barcha kabinet foydalanuvchilarining botidan va kabinetdan o'chiriladi."
  return it.also_group
    ? "Ziyoratchilarning botidan va kabinetdan o'chiriladi. Guruhdagi post qoladi."
    : "Ziyoratchilarning botidan va kabinetdan o'chiriladi."
}

function report(r: CabinetRecall): string {
  if (r.deleting) return `O'chirilmoqda: ${r.chats} ta foydalanuvchi`
  return `${r.chats} ta ziyoratchidan o'chirildi` + (r.failed ? ` · ${r.failed} ta xabar o'chmadi` : '')
}

async function remove(it: CabinetItem) {
  const ok = await confirm({ title: "Kabinetdan o'chirish", message: whatGoes(it), confirmText: "O'chirish" })
  if (!ok) return
  busy.value = keyOf(it)
  try {
    const r = await cabinet.remove(it.kind, it.id)
    items.value = items.value.filter(x => keyOf(x) !== keyOf(it))
    // The pilgrim bot restarted since: the cabinet's list dropped it, the chats keep it.
    if (r.known) toast.success(report(r))
    else toast.info("Kabinetdan olib tashlandi. Botdagi xabarlarni bot eslay olmadi — ular qoldi")
  } catch (e) {
    toast.error(errorText(e, "O'chirib bo'lmadi"))
  } finally {
    busy.value = null
  }
}
</script>

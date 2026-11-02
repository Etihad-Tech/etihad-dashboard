<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Reyslar</h1>
        <button class="btn" :class="adding ? 'btn-secondary' : 'btn-primary'" @click="adding ? cancelAdd() : openAdd()">
          <font-awesome-icon :icon="adding ? 'xmark' : 'plus'" class="w-3.5 h-3.5" />
          {{ adding ? 'Bekor qilish' : 'Yangi reys' }}
        </button>
      </div>

      <!-- Add a weekly flight -->
      <div v-if="adding" class="card p-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_1.5fr_6rem_auto] sm:items-end">
          <div>
            <label class="label">Hafta kuni</label>
            <select v-model.number="newWeekday" class="input">
              <option v-for="w in WEEKDAY_IDS" :key="w" :value="w">{{ weekdayLabel(w) }}{{ usedWeekdays.has(w) ? ' — reys bor' : '' }}</option>
            </select>
          </div>
          <div>
            <label class="label">Yo'nalish</label>
            <select v-model="newRoute" class="input">
              <option v-for="r in ROUTES" :key="r.key" :value="r.key" :disabled="routeTaken(newWeekday, r)">{{ r.label }}{{ routeTaken(newWeekday, r) ? ' — bor' : '' }}</option>
            </select>
          </div>
          <div>
            <label class="label">Tunlar</label>
            <input v-model.number="newNights" type="number" min="1" class="input" />
          </div>
          <button @click="createDay" :disabled="creating || newWeekday === null" class="btn btn-primary">
            {{ creating ? 'Saqlanmoqda...' : "Qo'shish" }}
          </button>
        </div>
        <p v-if="newWeekday !== null" class="text-xs text-gray-500 mt-2">Keyingi jo'nash: <b class="text-gray-700">{{ humanDate(nextISOForWeekday(newWeekday)) }}</b></p>
        <p v-if="addError" class="error-text mt-2">{{ addError }}</p>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="!schedules.length" class="card empty">Reyslar yo'q</div>

      <div v-else class="grid gap-4 xl:grid-cols-2">
        <div v-for="s in schedules" :key="s.id" class="card p-4 sm:p-5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <font-awesome-icon icon="plane" class="w-4 h-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 class="section-title truncate">{{ s.name }}</h3>
                <span class="chip chip-blue">{{ routeLabel(s.outbound_to, s.return_from) }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">Keyingi: {{ humanDate(nextISOForWeekday(s.departure_weekday)) }}</p>
            </div>
            <button @click="deleteDay(s)" :disabled="deletingId === s.id" title="O'chirish" class="icon-btn icon-btn-danger">
              <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
            </button>
          </div>

          <p v-if="routeTwin(s)" class="text-xs text-rose-700 bg-rose-50 rounded-lg px-3 py-2">
            «{{ routeTwin(s)?.name }}» bilan bir xil yo'nalish
          </p>

          <!-- Borish -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-auto">Borish</span>
              <input v-model="s.outbound_flight_no" type="text" maxlength="16" placeholder="Reys №" title="Reys raqami" class="input input-sm w-28" />
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-2">
              <label class="block">
                <span class="label">Qayerdan</span>
                <select v-model="s.outbound_from" class="input input-sm">
                  <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </label>
              <label class="block">
                <span class="label">Jo'nash</span>
                <input v-model="s.outbound_dep" type="time" class="input input-sm" />
              </label>
              <label class="block">
                <span class="label">Qayerga</span>
                <select v-model="s.outbound_to" class="input input-sm">
                  <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </label>
              <label class="block">
                <span class="label">Yetib borish</span>
                <input v-model="s.outbound_arr" type="time" class="input input-sm" />
              </label>
            </div>
          </div>

          <!-- Qaytish -->
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-auto">Qaytish</span>
              <label class="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input v-model="s.return_next_day" type="checkbox" class="checkbox" />
                Ertasi kuni yetadi (+1)
              </label>
              <input v-model="s.return_flight_no" type="text" maxlength="16" placeholder="Reys №" title="Reys raqami" class="input input-sm w-28" />
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-2">
              <label class="block">
                <span class="label">Qayerdan</span>
                <select v-model="s.return_from" class="input input-sm">
                  <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </label>
              <label class="block">
                <span class="label">Jo'nash</span>
                <input v-model="s.return_dep" type="time" class="input input-sm" />
              </label>
              <label class="block">
                <span class="label">Qayerga</span>
                <select v-model="s.return_to" class="input input-sm">
                  <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </label>
              <label class="block">
                <span class="label">Yetib borish</span>
                <input v-model="s.return_arr" type="time" class="input input-sm" />
              </label>
            </div>
          </div>

          <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
            <label class="block">
              <span class="label">Tunlar (zaxira)</span>
              <input v-model.number="s.nights" type="number" min="1" class="input input-sm" />
            </label>
            <label class="block">
              <span class="label">Aviakompaniya</span>
              <input v-model="s.airline" type="text" placeholder="CENTRUMAIR A330-300" class="input input-sm" />
            </label>
          </div>

          <!-- One-off changes (delays / moved days) — auto-notifies the group -->
          <div class="border-t border-gray-100 pt-3">
            <button @click="toggleExc(s)" class="w-full flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              <font-awesome-icon icon="calendar" class="w-3.5 h-3.5 text-amber-500" />
              Kechikish / o'zgarishlar
              <span v-if="(excs[s.id] || []).length" class="chip chip-amber h-5">{{ (excs[s.id] || []).length }}</span>
              <font-awesome-icon :icon="excOpen[s.id] ? 'chevron-down' : 'chevron-right'" class="w-3 h-3 ml-auto text-gray-400" />
            </button>

            <div v-if="excOpen[s.id]" class="mt-3 space-y-3">
              <div v-if="(excs[s.id] || []).length" class="space-y-1.5">
                <div v-for="e in excs[s.id]" :key="e.id" class="flex items-center gap-2 text-xs rounded-lg pl-3 pr-1 py-1 border"
                  :class="excEditId[s.id] === e.id ? 'bg-amber-100/80 border-amber-300' : 'bg-amber-50/60 border-amber-100'">
                  <span class="font-medium text-gray-800">{{ dmy(e.flight_date) }}</span>
                  <span class="text-gray-400">{{ legForDate(s, e.flight_date) }}</span>
                  <span class="text-gray-300">→</span>
                  <span class="text-amber-700 font-medium truncate">{{ changeSummary(e) }}</span>
                  <div class="ml-auto flex items-center shrink-0">
                    <button @click="startEditExc(s, e)" class="icon-btn w-7 h-7" title="Tahrirlash">
                      <font-awesome-icon icon="pen" class="w-3 h-3" />
                    </button>
                    <button @click="removeExc(s, e)" :disabled="excDeletingId === e.id" class="icon-btn icon-btn-danger w-7 h-7" title="O'chirish">
                      <font-awesome-icon icon="trash" class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="rounded-xl bg-gray-50 p-3 space-y-3">
                <div v-if="!excEditId[s.id]" class="flex flex-wrap items-center gap-2">
                  <div class="seg">
                    <button type="button" class="seg-btn" :class="{ 'seg-btn-on': excForm[s.id].leg === 'Borish' }" @click="setExcLeg(s, 'Borish')">Borish</button>
                    <button type="button" class="seg-btn" :class="{ 'seg-btn-on': excForm[s.id].leg === 'Qaytish' }" @click="setExcLeg(s, 'Qaytish')">Qaytish</button>
                  </div>
                  <select v-model="excForm[s.id].date" class="input input-sm flex-1 min-w-[10rem] w-auto">
                    <option value="">— sana —</option>
                    <option v-for="o in availableForLeg(s)" :key="o.iso" :value="o.iso">{{ dmy(o.iso) }} ({{ o.time }})</option>
                  </select>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span class="chip chip-amber">Tahrirlash: {{ dmy(excForm[s.id].date) }} · {{ excForm[s.id].leg }}</span>
                  <button type="button" @click="cancelEditExc(s)" class="btn btn-ghost btn-sm ml-auto">Bekor qilish</button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label class="block">
                    <span class="label truncate">
                      {{ excForm[s.id].leg === 'Qaytish' ? 'Qaytish' : "Jo'nash" }} · {{ excDepCity(s) }}<span v-if="selectedOccTime(s)" class="text-gray-400"> · {{ selectedOccTime(s) }}</span>
                    </span>
                    <input v-model="excForm[s.id].newDep" type="time" class="input input-sm" />
                  </label>
                  <label class="block">
                    <span class="label truncate">
                      Yetib borish · {{ excArrCity(s) }}<span v-if="excForm[s.id].leg === 'Qaytish'" class="text-rose-500"> *</span>
                    </span>
                    <input v-model="excForm[s.id].newArr" type="time" class="input input-sm" />
                  </label>
                  <label class="block col-span-2 sm:col-span-1">
                    <span class="label">Reys raqami</span>
                    <input v-model="excForm[s.id].newFlightNo" type="text" maxlength="16" placeholder="C8 501" class="input input-sm" />
                  </label>
                </div>

                <div>
                  <button type="button" @click="excForm[s.id].more = !excForm[s.id].more" class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                    <font-awesome-icon :icon="excForm[s.id].more ? 'xmark' : 'plus'" class="w-2.5 h-2.5" />
                    Boshqa kunga ko'chdi
                  </button>
                  <input v-if="excForm[s.id].more" v-model="excForm[s.id].newDate" type="date" :min="excForm[s.id].date || todayISO" class="input input-sm mt-2 max-w-[12rem]" />
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <label class="flex items-center gap-2 text-xs text-gray-600 cursor-pointer mr-auto">
                    <input v-model="excForm[s.id].notifyGroups" type="checkbox" class="checkbox" />
                    Guruhlarga xabar yuborilsin
                  </label>
                  <button @click="excEditId[s.id] ? saveEditExc(s) : addExc(s)" :disabled="excSavingId === s.id" class="btn btn-primary btn-sm">
                    {{ excSavingId === s.id ? '...' : (excEditId[s.id] ? 'Saqlash' : "Qo'shish") }}
                  </button>
                </div>
                <p v-if="!excForm[s.id].notifyGroups" class="text-xs text-amber-600">Xabar yuborilmaydi</p>
                <p v-if="excNotice[s.id]" class="text-xs text-emerald-600">{{ excNotice[s.id] }}</p>
                <p v-if="excError[s.id]" class="error-text">{{ excError[s.id] }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3">
            <span v-if="savedId === s.id" class="text-xs text-emerald-600 flex items-center gap-1 mr-auto">
              <font-awesome-icon icon="circle-check" class="w-3.5 h-3.5" /> Saqlandi
            </span>
            <button @click="save(s)" :disabled="savingId === s.id" class="btn btn-primary">
              {{ savingId === s.id ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import api from '../../../api'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

interface Flight {
  id: number
  name: string
  departure_weekday: number
  nights: number
  outbound_from: string
  outbound_dep: string
  outbound_to: string
  outbound_arr: string
  return_from: string
  return_dep: string
  return_to: string
  return_arr: string
  return_next_day: boolean
  airline: string | null
  outbound_flight_no: string | null
  return_flight_no: string | null
  is_active: boolean
}

interface Exc {
  id: number
  schedule_id: number
  flight_date: string
  new_date: string | null
  new_dep: string | null
  new_arr: string | null
  new_flight_no: string | null
  is_active: boolean
}

const CITIES = [
  { value: 'toshkent', label: 'Toshkent' },
  { value: 'jidda', label: 'Jidda' },
  { value: 'madina', label: 'Madina' },
  { value: 'makka', label: 'Makka' },
]

const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']
function weekdayLabel(w: number) { return WEEKDAYS[w] ?? `${w}` }
function cityLabel(token: string) { return CITIES.find(c => c.value === token)?.label || token }

function pad(n: number) { return String(n).padStart(2, '0') }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function parseISO(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
function todayLocal() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()) }
const todayISO = toISO(todayLocal())
function jsToPy(jsDow: number) { return (jsDow + 6) % 7 }
function pyToJs(w: number) { return (w + 1) % 7 }
function nextDateForWeekday(w: number) {
  const d = todayLocal()
  d.setDate(d.getDate() + ((pyToJs(w) - d.getDay() + 7) % 7))
  return d
}
function nextISOForWeekday(w: number) { return toISO(nextDateForWeekday(w)) }
function dmy(iso: string) { const d = parseISO(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` }
function humanDate(iso: string) { return `${dmy(iso)} (${weekdayLabel(jsToPy(parseISO(iso).getDay()))})` }

const schedules = ref<Flight[]>([])
const loading = ref(false)
const savingId = ref<number | null>(null)
const savedId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

// A weekday may carry a SECOND row — another route the same day (owner, 2026-10-15:
// Jidda → Makka → Jidda beside a classic route). The bot gives each group the row whose
// airports match the group's own nights (Guruhlar), so the two never mix.
const WEEKDAY_IDS = [0, 1, 2, 3, 4, 5, 6]
const usedWeekdays = computed(() => new Set(schedules.value.map(s => s.departure_weekday)))
const availableWeekdays = computed(() => WEEKDAY_IDS.filter(w => !usedWeekdays.value.has(w)))

// The route a row flies, read off the two Saudi airports the bot matches a group by:
// where the plane LANDS (borish → qayerga) and where it flies HOME from (qaytish →
// qayerdan). Shown on every card, so «Shanba» and «Shanba 2» are told apart at a glance.
const ROUTES = [
  { key: 'madina-jidda', land: 'madina', home: 'jidda', label: 'Madina → Makka → Jidda' },
  { key: 'jidda-madina', land: 'jidda', home: 'madina', label: 'Jidda → Makka → Madina' },
  { key: 'jidda-jidda', land: 'jidda', home: 'jidda', label: 'Jidda → Makka → Jidda' },
]
type Route = typeof ROUTES[number]
function routeLabel(land: string, home: string) {
  const r = ROUTES.find(x => x.land === land && x.home === home)
  return r ? r.label : `${cityLabel(land)} … ${cityLabel(home)}`
}
function routeTaken(w: number | null, r: Route) {
  return schedules.value.some(x => x.departure_weekday === w && x.outbound_to === r.land && x.return_from === r.home)
}
// Another row of the same weekday on the same airports: the bot cannot tell them apart
// and always takes the first one, so the second one's times would never be used.
function routeTwin(s: Flight) {
  return schedules.value.find(x => x.id !== s.id && x.departure_weekday === s.departure_weekday
    && x.outbound_to === s.outbound_to && x.return_from === s.return_from) || null
}

// --- Add a weekly flight ---
const adding = ref(false)
const creating = ref(false)
const addError = ref('')
const newWeekday = ref<number | null>(null)
const newNights = ref(9)
const newRoute = ref(ROUTES[0].key)

function firstFreeRoute(w: number | null) { return (ROUTES.find(r => !routeTaken(w, r)) || ROUTES[0]).key }
watch(newWeekday, w => { newRoute.value = firstFreeRoute(w) })

function openAdd() {
  addError.value = ''
  newWeekday.value = availableWeekdays.value[0] ?? WEEKDAY_IDS[0]
  newRoute.value = firstFreeRoute(newWeekday.value)
  newNights.value = 9
  adding.value = true
}
function cancelAdd() { adding.value = false; addError.value = '' }

async function createDay() {
  addError.value = ''
  if (newWeekday.value === null) { addError.value = 'Hafta kunini tanlang.'; return }
  const route = ROUTES.find(r => r.key === newRoute.value) || ROUTES[0]
  if (routeTaken(newWeekday.value, route)) {
    addError.value = `«${route.label}» allaqachon bor`
    return
  }
  creating.value = true
  try {
    // A second row on a weekday is named apart from the first one: «Shanba 2».
    const same = schedules.value.filter(x => x.departure_weekday === newWeekday.value).length
    const name = weekdayLabel(newWeekday.value) + (same ? ` ${same + 1}` : '')
    let { data } = await api.post('/flights', { name, departure_weekday: newWeekday.value, nights: newNights.value })
    // The server creates a row on fixed default airports; the chosen route is set right
    // away, so a second row of a weekday never starts on the first one's airports.
    if (data.outbound_to !== route.land || data.return_from !== route.home) {
      try {
        data = (await api.put(`/flights/${data.id}`, { outbound_to: route.land, return_from: route.home })).data
      } catch {
        toast.error("Yo'nalish saqlanmadi — qayta tanlang")
      }
    }
    schedules.value.push(data)
    schedules.value.sort((a, b) => a.departure_weekday - b.departure_weekday)
    excs.value[data.id] = []
    adding.value = false
  } catch (e: any) {
    addError.value = e?.response?.data?.detail || 'Saqlanmadi'
  } finally {
    creating.value = false
  }
}

const { confirm } = useConfirm()
const toast = useToast()

async function deleteDay(s: Flight) {
  if (!(await confirm({ title: `«${s.name}» reysini o'chirish` }))) return
  deletingId.value = s.id
  try {
    await api.delete(`/flights/${s.id}`)
    schedules.value = schedules.value.filter(x => x.id !== s.id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  } finally {
    deletingId.value = null
  }
}

// --- One-off date changes (delays / moved days) ---
const excs = ref<Record<number, Exc[]>>({})
const excOpen = ref<Record<number, boolean>>({})
const excForm = ref<Record<number, { leg: string; date: string; newDep: string; newDate: string; newArr: string; newFlightNo: string; notifyGroups: boolean; more: boolean }>>({})
const excError = ref<Record<number, string>>({})
const excNotice = ref<Record<number, string>>({})
const excSavingId = ref<number | null>(null)
const excDeletingId = ref<number | null>(null)
const excEditId = ref<Record<number, number | null>>({})  // exc id being edited, per schedule

function retWeekday(s: Flight) { return (s.departure_weekday + s.nights) % 7 }
function legForDate(s: Flight, iso: string) {
  const py = jsToPy(parseISO(iso).getDay())
  if (py === s.departure_weekday) return 'Borish'
  if (py === retWeekday(s)) return 'Qaytish'
  return '—'
}
function changeSummary(e: Exc) {
  const parts: string[] = []
  if (e.new_date) parts.push(dmy(e.new_date))
  if (e.new_dep) parts.push(e.new_dep)
  if (e.new_arr) parts.push('→ ' + e.new_arr)
  if (e.new_flight_no) parts.push('✈ ' + e.new_flight_no)
  return parts.join(' ') || '—'
}
function upcomingOccurrences(s: Flight) {
  const W = s.departure_weekday
  const R = retWeekday(s)
  const out: { iso: string; leg: string; time: string }[] = []
  const start = todayLocal()
  for (let i = 0; i < 400 && out.length < 30; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const py = jsToPy(d.getDay())
    if (py === W) out.push({ iso: toISO(d), leg: 'Borish', time: s.outbound_dep })
    else if (py === R) out.push({ iso: toISO(d), leg: 'Qaytish', time: s.return_dep })
  }
  return out
}
function availableOccurrences(s: Flight) {
  const taken = new Set((excs.value[s.id] || []).map(e => e.flight_date))
  return upcomingOccurrences(s).filter(o => !taken.has(o.iso))
}
function defaultExcDate(s: Flight, leg: string) { return availableOccurrences(s).find(o => o.leg === leg)?.iso || '' }
function availableForLeg(s: Flight) { return availableOccurrences(s).filter(o => o.leg === (excForm.value[s.id]?.leg || 'Borish')) }
function resetExcForm(s: Flight) { excForm.value[s.id] = { leg: 'Borish', date: defaultExcDate(s, 'Borish'), newDep: '', newDate: '', newArr: '', newFlightNo: '', notifyGroups: true, more: false } }
function setExcLeg(s: Flight, leg: string) { excForm.value[s.id].leg = leg; excForm.value[s.id].date = defaultExcDate(s, leg) }
function occCurrentTime(s: Flight, iso: string) {
  const leg = legForDate(s, iso)
  return leg === 'Borish' ? s.outbound_dep : leg === 'Qaytish' ? s.return_dep : ''
}
function selectedOccTime(s: Flight) { const iso = excForm.value[s.id]?.date; return iso ? occCurrentTime(s, iso) : '' }
// Departure city for the selected leg — its LOCAL time is what the group needs
// (return departs Jidda/Madina = Saudi local time, where the pilgrims are).
function excDepCity(s: Flight) { return cityLabel(excForm.value[s.id]?.leg === 'Qaytish' ? s.return_from : s.outbound_from) }
// Arrival city for the selected leg — its arrival time is what pilgrims ask about
// ("when do we land in Tashkent?"), stated in that city's OWN local time.
function excArrCity(s: Flight) { return cityLabel(excForm.value[s.id]?.leg === 'Qaytish' ? s.return_to : s.outbound_to) }

function toggleExc(s: Flight) {
  if (!excForm.value[s.id]) resetExcForm(s)
  excOpen.value[s.id] = !excOpen.value[s.id]
}

async function loadExcs(id: number) {
  try { const { data } = await api.get(`/flights/${id}/exceptions`); excs.value[id] = data }
  catch { excs.value[id] = [] }
}

async function addExc(s: Flight) {
  const f = excForm.value[s.id]
  excError.value[s.id] = ''
  excNotice.value[s.id] = ''
  if (!f.date) { excError.value[s.id] = 'Sanani tanlang'; return }
  if (!f.newDep && !f.newDate && !f.newFlightNo.trim()) { excError.value[s.id] = 'Vaqt, sana yoki raqam kiriting'; return }
  // Return leg lands in the home city — pilgrims always ask "when do we arrive?",
  // so the bot needs it. Require arrival whenever the TIME/DAY moved (a pure
  // reys-number swap keeps the schedule's own times, nothing to re-enter).
  if (f.leg === 'Qaytish' && (f.newDep || f.newDate) && !f.newArr) { excError.value[s.id] = 'Yetib borish vaqtini kiriting'; return }
  // Saving a one-off change (with the toggle ON) immediately NOTIFIES every group
  // flying that day on Telegram — an outward, hard-to-undo action — so confirm
  // first (mirrors removeExc). With the toggle OFF it saves silently; the confirm
  // says so, so the admin knows nobody will be told.
  if (!(await confirm({
    title: "O'zgarishni saqlash",
    message: f.notifyGroups
      ? 'Shu kuni uchadigan guruhlarga xabar boradi.'
      : 'Guruhlarga xabar yuborilmaydi.',
    confirmText: f.notifyGroups ? "Saqlash va xabar berish" : "Xabarsiz saqlash",
  }))) return
  excSavingId.value = s.id
  try {
    const { data } = await api.post(`/flights/${s.id}/exceptions`, {
      flight_date: f.date, new_dep: f.newDep || null, new_date: f.newDate || null, new_arr: f.newArr || null,
      new_flight_no: f.newFlightNo.trim() || null, notify: f.notifyGroups,
    })
    if (!excs.value[s.id]) excs.value[s.id] = []
    excs.value[s.id].push(data)
    excs.value[s.id].sort((a, b) => (a.flight_date < b.flight_date ? -1 : 1))
    const n = data.notified ?? 0
    excNotice.value[s.id] = !f.notifyGroups ? '✓ Saqlandi, xabarsiz'
      : n > 0 ? `✓ ${n} ta guruhga yuborildi` : "✓ Saqlandi, bu kuni guruh yo'q"
    setTimeout(() => { if (excNotice.value[s.id]) excNotice.value[s.id] = '' }, 6000)
    resetExcForm(s)
  } catch (e: any) {
    excError.value[s.id] = e?.response?.data?.detail || 'Saqlanmadi'
  } finally {
    excSavingId.value = null
  }
}

async function removeExc(s: Flight, e: Exc) {
  if (!(await confirm({
    title: "O'zgarishni o'chirish",
    // Deleting is silent (owner, 2026-10-08) — the server sends nothing to the groups.
    message: 'Guruhlarga xabar yuborilmaydi.',
  }))) return
  excDeletingId.value = e.id
  try {
    await api.delete(`/flights/exceptions/${e.id}`)
    excs.value[s.id] = (excs.value[s.id] || []).filter(x => x.id !== e.id)
    if (excEditId.value[s.id] === e.id) cancelEditExc(s)
    excNotice.value[s.id] = "✓ O'chirildi, xabarsiz"
    setTimeout(() => { if (excNotice.value[s.id]) excNotice.value[s.id] = '' }, 6000)
  } catch {
    toast.error("O'chirilmadi")
  } finally { excDeletingId.value = null }
}

// Load an existing change into the form for in-place editing. The anchor date +
// leg are fixed (identity of the occurrence) — only the new times/day are editable.
function startEditExc(s: Flight, e: Exc) {
  excEditId.value[s.id] = e.id
  excError.value[s.id] = ''
  excNotice.value[s.id] = ''
  excForm.value[s.id] = {
    leg: legForDate(s, e.flight_date),
    date: e.flight_date,
    newDep: e.new_dep || '',
    newDate: e.new_date || '',
    newArr: e.new_arr || '',
    newFlightNo: e.new_flight_no || '',
    notifyGroups: true,
    more: !!e.new_date,
  }
}

function cancelEditExc(s: Flight) {
  excEditId.value[s.id] = null
  excError.value[s.id] = ''
  resetExcForm(s)
}

async function saveEditExc(s: Flight) {
  const f = excForm.value[s.id]
  const id = excEditId.value[s.id]
  if (!id) return
  excError.value[s.id] = ''
  excNotice.value[s.id] = ''
  if (!f.newDep && !f.newDate && !f.newFlightNo.trim()) { excError.value[s.id] = 'Vaqt, sana yoki raqam kiriting'; return }
  if (f.leg === 'Qaytish' && (f.newDep || f.newDate) && !f.newArr) { excError.value[s.id] = 'Yetib borish vaqtini kiriting'; return }
  // Editing a one-off change re-NOTIFIES the affected groups on Telegram (same
  // outward side-effect as adding one) — confirm before re-blasting the update.
  // Toggle OFF = correct the record silently (e.g. a typo fix not worth a re-blast).
  if (!(await confirm({
    title: "O'zgarishni yangilash",
    message: f.notifyGroups
      ? 'Guruhlarga qayta xabar boradi.'
      : 'Guruhlarga xabar yuborilmaydi.',
    confirmText: f.notifyGroups ? "Yangilash va xabar berish" : "Xabarsiz yangilash",
  }))) return
  excSavingId.value = s.id
  try {
    const { data } = await api.patch(`/flights/exceptions/${id}`, {
      new_dep: f.newDep || null, new_date: f.newDate || null, new_arr: f.newArr || null,
      new_flight_no: f.newFlightNo.trim() || null, notify: f.notifyGroups,
    })
    const arr = excs.value[s.id] || []
    const idx = arr.findIndex(x => x.id === id)
    if (idx >= 0) arr[idx] = data
    const n = data.notified ?? 0
    excNotice.value[s.id] = !f.notifyGroups ? '✓ Yangilandi, xabarsiz'
      : n > 0 ? `✓ ${n} ta guruhga yuborildi` : "✓ Saqlandi, bu kuni guruh yo'q"
    setTimeout(() => { if (excNotice.value[s.id]) excNotice.value[s.id] = '' }, 6000)
    excEditId.value[s.id] = null
    resetExcForm(s)
  } catch (e: any) {
    excError.value[s.id] = e?.response?.data?.detail || 'Saqlanmadi'
  } finally {
    excSavingId.value = null
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/flights')
    schedules.value = data
    await Promise.all(schedules.value.map(s => loadExcs(s.id)))
  } catch {
    schedules.value = []
  } finally {
    loading.value = false
  }
}

async function save(s: Flight) {
  savingId.value = s.id
  savedId.value = null
  try {
    const { data } = await api.put(`/flights/${s.id}`, {
      name: s.name,
      nights: s.nights,
      outbound_from: s.outbound_from,
      outbound_dep: s.outbound_dep,
      outbound_to: s.outbound_to,
      outbound_arr: s.outbound_arr,
      return_from: s.return_from,
      return_dep: s.return_dep,
      return_to: s.return_to,
      return_arr: s.return_arr,
      return_next_day: s.return_next_day,
      airline: s.airline || null,
      outbound_flight_no: s.outbound_flight_no || null,
      return_flight_no: s.return_flight_no || null,
    })
    const idx = schedules.value.findIndex(x => x.id === s.id)
    if (idx !== -1) schedules.value[idx] = data
    savedId.value = s.id
    setTimeout(() => { if (savedId.value === s.id) savedId.value = null }, 2500)
  } catch (e: any) {
    // A swallowed failure here is the worst kind: the row keeps showing the times the
    // admin just typed, so the screen looks saved while the bot goes on quoting the old
    // ones to every group on this plane. Say so, and say it did NOT save.
    toast.error(e?.response?.data?.detail || 'Saqlanmadi')
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-3 animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Reyslar</h2>
          <p class="text-sm text-gray-500 mt-1">Haftalik reyslar — vaqt, yo'nalish va o'zgarishlarni shu yerdan boshqaring</p>
        </div>
        <button @click="adding ? cancelAdd() : openAdd()" :disabled="!adding && !availableWeekdays.length" class="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
          <font-awesome-icon :icon="adding ? 'xmark' : 'plus'" class="w-3.5 h-3.5" />
          {{ adding ? 'Bekor qilish' : 'Yangi reys' }}
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Har bir reys bitta <b>hafta kuni</b>ga biriktirilgan va har hafta takrorlanadi; aniq sanani bot guruhning
          jo'nash sanasidan hisoblaydi. Doimiy o'zgarish bo'lsa kartochkadagi vaqtni tahrirlang. <b>Bitta reys kechiksa
          yoki boshqa kunga ko'chsa</b>, "Kechikish / o'zgarishlar" bo'limidan qo'shing — bot o'sha kuni uchadigan
          guruhga <b>avtomatik xabar yuboradi</b>.
        </p>
      </div>

      <!-- Add a weekly flight -->
      <div v-if="adding" class="bg-white border border-amber-200 rounded-3xl p-5 animate-fade-up">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center">
            <font-awesome-icon icon="plane" class="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900">Yangi haftalik reys</h3>
            <p class="text-xs text-gray-400">Hafta kunini tanlang — har shu kuni takrorlanadi</p>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Hafta kuni</label>
            <select v-model.number="newWeekday" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option v-for="w in availableWeekdays" :key="w" :value="w">{{ weekdayLabel(w) }}</option>
            </select>
            <p class="text-xs text-gray-400 mt-1" v-if="newWeekday !== null">Keyingi jo'nash: <b>{{ humanDate(nextISOForWeekday(newWeekday)) }}</b></p>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Tunlar soni</label>
            <input v-model.number="newNights" type="number" min="1" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>

        <p v-if="addError" class="text-xs text-rose-600 mt-2">{{ addError }}</p>

        <div class="flex items-center justify-end gap-2 mt-4">
          <button @click="cancelAdd" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-2xl transition-colors">Bekor qilish</button>
          <button @click="createDay" :disabled="creating || newWeekday === null" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
            {{ creating ? 'Saqlanmoqda...' : "Qo'shish" }}
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-3">Qo'shilgandan so'ng yo'nalish va vaqtlarni shu reysning kartochkasida to'ldiring.</p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="!schedules.length" class="text-center py-12 text-sm text-gray-400 animate-fade-up">
        Hozircha reys yo'q. Yuqoridagi <b>"Yangi reys"</b> tugmasi orqali qo'shing.
      </div>

      <div v-else class="grid gap-5 lg:grid-cols-2">
        <div v-for="(s, i) in schedules" :key="s.id" class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up" :style="{ animationDelay: `${(i + 1) * 40}ms` }">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-9 h-9 rounded-2xl bg-sky-50 flex items-center justify-center">
              <font-awesome-icon icon="plane" class="w-4 h-4 text-sky-600" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-semibold text-gray-900 truncate">{{ s.name }}</h3>
              <p class="text-xs text-gray-400">Har {{ weekdayLabel(s.departure_weekday) }} kuni · {{ s.nights }} kecha</p>
            </div>
            <button @click="deleteDay(s)" :disabled="deletingId === s.id" title="O'chirish" class="shrink-0 w-8 h-8 rounded-xl text-gray-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
              <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="mb-4 flex items-center gap-2 bg-sky-50/60 border border-sky-100 rounded-2xl px-3 py-2">
            <font-awesome-icon icon="calendar" class="w-3.5 h-3.5 text-sky-500" />
            <span class="text-xs text-gray-500">Keyingi jo'nash:</span>
            <span class="text-xs font-semibold text-gray-700">{{ humanDate(nextISOForWeekday(s.departure_weekday)) }}</span>
          </div>

          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🛫 Borish</p>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Qayerdan</label>
              <select v-model="s.outbound_from" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Jo'nash vaqti</label>
              <input v-model="s.outbound_dep" type="time" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Qayerga</label>
              <select v-model="s.outbound_to" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Yetib borish vaqti</label>
              <input v-model="s.outbound_arr" type="time" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-xs text-gray-400 mb-1">Borish reys raqami (ixtiyoriy)</label>
            <input v-model="s.outbound_flight_no" type="text" maxlength="16" placeholder="masalan, C8 501" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🛬 Qaytish</p>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Qayerdan</label>
              <select v-model="s.return_from" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Jo'nash vaqti</label>
              <input v-model="s.return_dep" type="time" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Qayerga</label>
              <select v-model="s.return_to" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Yetib borish vaqti</label>
              <input v-model="s.return_arr" type="time" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div class="mb-3">
            <label class="block text-xs text-gray-400 mb-1">Qaytish reys raqami (ixtiyoriy)</label>
            <input v-model="s.return_flight_no" type="text" maxlength="16" placeholder="masalan, C8 502" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
            <input v-model="s.return_next_day" type="checkbox" class="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            Qaytish reysi ertasi kuni yetib boradi (+1)
          </label>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Tunlar soni</label>
              <input v-model.number="s.nights" type="number" min="1" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Aviakompaniya (ixtiyoriy)</label>
              <input v-model="s.airline" type="text" placeholder="CENTRUMAIR A330-300" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <!-- One-off changes (delays / moved days) — auto-notifies the group -->
          <div class="border-t border-gray-100 pt-3 mb-4">
            <button @click="toggleExc(s)" class="w-full flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <font-awesome-icon icon="calendar" class="w-3 h-3 text-amber-500" />
              Kechikish / o'zgarishlar
              <span v-if="(excs[s.id] || []).length" class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">{{ (excs[s.id] || []).length }}</span>
              <font-awesome-icon :icon="excOpen[s.id] ? 'xmark' : 'plus'" class="w-3 h-3 ml-auto" />
            </button>

            <div v-if="excOpen[s.id]" class="mt-3 space-y-3">
              <div v-if="(excs[s.id] || []).length" class="space-y-1.5">
                <div v-for="e in excs[s.id]" :key="e.id" class="flex items-center gap-2 text-xs rounded-xl px-3 py-2 border" :class="excEditId[s.id] === e.id ? 'bg-amber-100/80 border-amber-300' : 'bg-amber-50/70 border-amber-100'">
                  <span class="font-medium text-gray-700">{{ dmy(e.flight_date) }}</span>
                  <span class="text-gray-400">({{ legForDate(s, e.flight_date) }})</span>
                  <span class="text-gray-300">→</span>
                  <span class="text-amber-700 font-medium">{{ changeSummary(e) }}</span>
                  <div class="ml-auto flex items-center gap-2">
                    <button @click="startEditExc(s, e)" class="text-gray-300 hover:text-amber-600 transition-colors" title="Tahrirlash">
                      <font-awesome-icon icon="pen" class="w-3 h-3" />
                    </button>
                    <button @click="removeExc(s, e)" :disabled="excDeletingId === e.id" class="text-gray-300 hover:text-rose-600 disabled:opacity-40 transition-colors" title="O'chirish">
                      <font-awesome-icon icon="trash" class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400">Hozircha o'zgarish yo'q.</p>

              <div class="bg-gray-50/60 rounded-2xl p-3 space-y-2">
                <template v-if="!excEditId[s.id]">
                  <div>
                    <label class="block text-[11px] text-gray-400 mb-1">Qaysi reys o'zgardi?</label>
                    <div class="grid grid-cols-2 gap-2">
                      <button type="button" @click="setExcLeg(s, 'Borish')"
                        :class="excForm[s.id].leg === 'Borish' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'"
                        class="px-2 py-1.5 text-xs font-medium rounded-xl border transition-colors">🛫 Borish (ketish)</button>
                      <button type="button" @click="setExcLeg(s, 'Qaytish')"
                        :class="excForm[s.id].leg === 'Qaytish' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'"
                        class="px-2 py-1.5 text-xs font-medium rounded-xl border transition-colors">🛬 Qaytish (uyga)</button>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] text-gray-400 mb-1">Qaysi kuni?</label>
                    <select v-model="excForm[s.id].date" class="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="">— sanani tanlang —</option>
                      <option v-for="o in availableForLeg(s)" :key="o.iso" :value="o.iso">{{ dmy(o.iso) }} ({{ o.time }})</option>
                    </select>
                  </div>
                </template>
                <div v-else class="flex items-center gap-2 text-[11px]">
                  <span class="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 font-medium">✏️ Tahrirlash: {{ dmy(excForm[s.id].date) }} ({{ excForm[s.id].leg }})</span>
                  <button type="button" @click="cancelEditExc(s)" class="ml-auto text-gray-400 hover:text-gray-600 transition-colors">Bekor qilish</button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] text-gray-400 mb-1">
                      Yangi {{ excForm[s.id].leg === 'Qaytish' ? "qaytish" : "jo'nash" }} vaqti
                      <span class="text-amber-600">— {{ excDepCity(s) }}</span>
                      <span v-if="selectedOccTime(s)" class="text-gray-400">· hozirgi {{ selectedOccTime(s) }}</span>
                    </label>
                    <input v-model="excForm[s.id].newDep" type="time" class="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label class="block text-[11px] text-gray-400 mb-1">
                      Yetib borish vaqti<span v-if="excForm[s.id].leg === 'Qaytish'" class="text-rose-500"> *</span>
                      <span class="text-amber-600">— {{ excArrCity(s) }}</span>
                    </label>
                    <input v-model="excForm[s.id].newArr" type="time" class="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
                <p class="text-[11px] text-gray-400">Har ikki vaqt ham o'z shahrining mahalliy vaqti bilan. Yetib borish vaqti ziyoratchilar ko'p so'raydigan ma'lumot.</p>
                <div class="flex justify-end">
                  <button @click="excEditId[s.id] ? saveEditExc(s) : addExc(s)" :disabled="excSavingId === s.id" class="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-colors">
                    {{ excSavingId === s.id ? '...' : (excEditId[s.id] ? 'Saqlash' : "Qo'shish") }}
                  </button>
                </div>
                <button type="button" @click="excForm[s.id].more = !excForm[s.id].more" class="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                  <font-awesome-icon :icon="excForm[s.id].more ? 'xmark' : 'plus'" class="w-2.5 h-2.5" />
                  Qo'shimcha (boshqa kunga ko'chdi)
                </button>
                <div v-if="excForm[s.id].more">
                  <label class="block text-[11px] text-gray-400 mb-1">Boshqa kunga ko'chdi (sana)</label>
                  <input v-model="excForm[s.id].newDate" type="date" :min="excForm[s.id].date || todayISO" class="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <p class="text-[11px] text-gray-400">Qo'shilganda, o'sha sanada uchadigan guruhga avtomatik xabar yuboriladi.</p>
                <p v-if="excNotice[s.id]" class="text-xs text-emerald-600">{{ excNotice[s.id] }}</p>
                <p v-if="excError[s.id]" class="text-xs text-rose-600">{{ excError[s.id] }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span v-if="savedId === s.id" class="text-xs text-emerald-600 flex items-center gap-1">
              <font-awesome-icon icon="circle" class="w-2 h-2" /> Saqlandi
            </span>
            <span v-else></span>
            <button @click="save(s)" :disabled="savingId === s.id" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
              {{ savingId === s.id ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
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

const availableWeekdays = computed(() => {
  const used = new Set(schedules.value.map(s => s.departure_weekday))
  return [0, 1, 2, 3, 4, 5, 6].filter(w => !used.has(w))
})

// --- Add a weekly flight ---
const adding = ref(false)
const creating = ref(false)
const addError = ref('')
const newWeekday = ref<number | null>(null)
const newNights = ref(9)

function openAdd() { addError.value = ''; newWeekday.value = availableWeekdays.value[0] ?? null; newNights.value = 9; adding.value = true }
function cancelAdd() { adding.value = false; addError.value = '' }

async function createDay() {
  addError.value = ''
  if (newWeekday.value === null) { addError.value = 'Hafta kunini tanlang.'; return }
  creating.value = true
  try {
    const { data } = await api.post('/flights', { name: weekdayLabel(newWeekday.value), departure_weekday: newWeekday.value, nights: newNights.value })
    schedules.value.push(data)
    schedules.value.sort((a, b) => a.departure_weekday - b.departure_weekday)
    excs.value[data.id] = []
    adding.value = false
  } catch (e: any) {
    addError.value = e?.response?.data?.detail || "Saqlashda xatolik. Qayta urinib ko'ring."
  } finally {
    creating.value = false
  }
}

const { confirm } = useConfirm()
const toast = useToast()

async function deleteDay(s: Flight) {
  if (!(await confirm({ title: "Reysni o'chirish", message: `"${s.name}" reysini o'chirasizmi?` }))) return
  deletingId.value = s.id
  try {
    await api.delete(`/flights/${s.id}`)
    schedules.value = schedules.value.filter(x => x.id !== s.id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirishda xatolik yuz berdi")
  } finally {
    deletingId.value = null
  }
}

// --- One-off date changes (delays / moved days) ---
const excs = ref<Record<number, Exc[]>>({})
const excOpen = ref<Record<number, boolean>>({})
const excForm = ref<Record<number, { leg: string; date: string; newDep: string; newDate: string; newArr: string; more: boolean }>>({})
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
function resetExcForm(s: Flight) { excForm.value[s.id] = { leg: 'Borish', date: defaultExcDate(s, 'Borish'), newDep: '', newDate: '', newArr: '', more: false } }
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
  if (!f.date) { excError.value[s.id] = 'Reys sanasini tanlang.'; return }
  if (!f.newDep && !f.newDate) { excError.value[s.id] = 'Yangi vaqt yoki yangi sanani kiriting.'; return }
  // Return leg lands in the home city — pilgrims always ask "when do we arrive?",
  // so the bot needs it. Require arrival for any return-leg change.
  if (f.leg === 'Qaytish' && !f.newArr) { excError.value[s.id] = "Qaytish reysi uchun yetib borish vaqtini kiriting — ziyoratchilar buni ko'p so'raydi."; return }
  excSavingId.value = s.id
  try {
    const { data } = await api.post(`/flights/${s.id}/exceptions`, {
      flight_date: f.date, new_dep: f.newDep || null, new_date: f.newDate || null, new_arr: f.newArr || null,
    })
    if (!excs.value[s.id]) excs.value[s.id] = []
    excs.value[s.id].push(data)
    excs.value[s.id].sort((a, b) => (a.flight_date < b.flight_date ? -1 : 1))
    const n = data.notified ?? 0
    excNotice.value[s.id] = n > 0 ? `✓ ${n} ta guruhga xabar yuborildi` : "✓ Saqlandi. Bu kuni uchadigan guruh yo'q — xabar yuborilmadi."
    setTimeout(() => { if (excNotice.value[s.id]) excNotice.value[s.id] = '' }, 6000)
    resetExcForm(s)
  } catch (e: any) {
    excError.value[s.id] = e?.response?.data?.detail || 'Xatolik. Qayta urinib ko\'ring.'
  } finally {
    excSavingId.value = null
  }
}

async function removeExc(s: Flight, e: Exc) {
  if (!(await confirm({
    title: "O'zgarishni o'chirish",
    message: "Bu o'zgarish o'chiriladi. Guruhlarga jadval o'z holiga qaytgani haqida xabar yuborilishi mumkin.",
  }))) return
  excDeletingId.value = e.id
  try {
    const { data } = await api.delete(`/flights/exceptions/${e.id}`)
    excs.value[s.id] = (excs.value[s.id] || []).filter(x => x.id !== e.id)
    if (excEditId.value[s.id] === e.id) cancelEditExc(s)
    const n = data?.notified ?? 0
    excNotice.value[s.id] = n > 0 ? `✓ ${n} ta guruhga "jadval o'z holiga qaytdi" xabari yuborildi` : "✓ O'chirildi"
    setTimeout(() => { if (excNotice.value[s.id]) excNotice.value[s.id] = '' }, 6000)
  } catch {
    toast.error("O'chirishda xatolik yuz berdi")
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
  if (!f.newDep && !f.newDate) { excError.value[s.id] = 'Yangi vaqt yoki yangi sanani kiriting.'; return }
  if (f.leg === 'Qaytish' && !f.newArr) { excError.value[s.id] = "Qaytish reysi uchun yetib borish vaqtini kiriting — ziyoratchilar buni ko'p so'raydi."; return }
  excSavingId.value = s.id
  try {
    const { data } = await api.patch(`/flights/exceptions/${id}`, {
      new_dep: f.newDep || null, new_date: f.newDate || null, new_arr: f.newArr || null,
    })
    const arr = excs.value[s.id] || []
    const idx = arr.findIndex(x => x.id === id)
    if (idx >= 0) arr[idx] = data
    const n = data.notified ?? 0
    excNotice.value[s.id] = n > 0 ? `✓ ${n} ta guruhga yangilangan xabar yuborildi` : "✓ Saqlandi. Bu kuni uchadigan guruh yo'q — xabar yuborilmadi."
    setTimeout(() => { if (excNotice.value[s.id]) excNotice.value[s.id] = '' }, 6000)
    excEditId.value[s.id] = null
    resetExcForm(s)
  } catch (e: any) {
    excError.value[s.id] = e?.response?.data?.detail || 'Xatolik. Qayta urinib ko\'ring.'
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
  } catch {
    /* ignore */
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>

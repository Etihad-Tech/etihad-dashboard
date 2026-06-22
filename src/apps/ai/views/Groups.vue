<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Guruhlar</h2>
        <p class="text-sm text-gray-500 mt-1">
          Har bir guruh uchun safar kunlari (Madina / Makka), mehmonxona, paket va ellikboshini sozlang.
          Bot joriy shaharni shu kunlarga qarab aniqlaydi (kun = safar boshlanish sanasidan hisoblanadi).
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <div class="flex items-center gap-3 animate-fade-up">
          <font-awesome-icon icon="location-dot" class="w-4 h-4 text-amber-600" />
          <h3 class="text-base font-semibold text-gray-900">Guruhlar ({{ filtered.length }})</h3>
          <input v-model="search" type="text" placeholder="Guruhni qidirish..."
            class="ml-auto bg-white border border-gray-200 rounded-2xl px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        <div v-if="!filtered.length" class="text-center py-10 text-sm text-gray-400">Guruh topilmadi.</div>

        <div v-else class="grid gap-3">
          <div v-for="g in filtered" :key="g.id" class="bg-white rounded-2xl border border-gray-200 p-5 animate-fade-up">
            <div class="flex items-center gap-3 mb-4">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ g.title || g.id }}</p>
                <p class="text-[11px] text-gray-400">{{ g.id }}</p>
              </div>
              <span v-if="!hasLocation(g)" class="text-[11px] text-amber-600 shrink-0">Kunlar kiritilmagan — shahar sarlavhadan taxmin qilinadi</span>
              <span v-if="savedId === g.id" class="text-emerald-600 text-xs flex items-center gap-1 shrink-0">
                <font-awesome-icon icon="circle" class="w-2 h-2" /> Saqlandi
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] text-gray-400 mb-1">Safar boshlanish sanasi</label>
                <input v-model="g.trip_start_date" type="date" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] text-gray-400 mb-1">Paket (tier)</label>
                <select v-model="g.hotel_tier" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">— avtomatik —</option>
                  <option value="comfort">comfort</option>
                  <option value="premium">premium</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-gray-400 mb-1">Ellikboshi</label>
                <input v-model="g.ellikboshi_username" type="text" placeholder="@username" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div class="hidden sm:block"></div>

              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] text-gray-400 mb-1">Ketma-ketlik</label>
                <select v-model="g.order" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="madina_makka">Avval Madina, keyin Makka</option>
                  <option value="makka_madina">Avval Makka, keyin Madina</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-emerald-600 mb-1">Madina — necha kun</label>
                <input v-model="g.madina_days" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] text-sky-600 mb-1">Makka — necha kun</label>
                <input v-model="g.makka_days" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div class="hidden sm:flex items-end">
                <p class="text-[11px] text-gray-400 pb-2 truncate">{{ rangeHint(g) }}</p>
              </div>
              <div class="col-span-2 sm:hidden">
                <p class="text-[11px] text-gray-400">{{ rangeHint(g) }}</p>
              </div>

              <div class="col-span-2">
                <label class="block text-[11px] text-gray-400 mb-1">Madina mehmonxonasi</label>
                <select v-model="g.hotel_madina" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">—</option>
                  <option v-for="h in HOTELS" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block text-[11px] text-gray-400 mb-1">Makka mehmonxonasi</label>
                <select v-model="g.hotel_makka" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">—</option>
                  <option v-for="h in HOTELS" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <div v-if="isSaturday(g)" class="col-span-2">
                <label class="block text-[11px] text-gray-400 mb-1">
                  Kelish (Makka) mehmonxonasi
                  <span class="text-amber-600">— Shanba reysi (1-kun)</span>
                </label>
                <select v-model="g.hotel_jidda" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">—</option>
                  <option v-for="h in HOTELS" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 mt-4">
              <p v-if="errorId === g.id" class="text-xs text-rose-600 mr-auto">{{ errorMsg }}</p>
              <button @click="save(g)" :disabled="savingId === g.id"
                class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
                {{ savingId === g.id ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </div>
        </div>
        <p class="text-[11px] text-gray-400">
          Eslatma: faqat har bir shaharda necha kun turishini yozing — Misol: Madina 4 kun, Makka 6 kun.
          Bot kun raqamini safar boshlanish sanasidan o'zi hisoblaydi. Kunlarni o'chirib bo'lmaydi — faqat ustiga yangi qiymat yozish mumkin.
        </p>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'

const HOTELS = ['Swissotel Makka', 'Anjum', 'Jumeirah', 'Makkah Towers', 'Taj Park', 'Grand Al Shahba', 'Bosphorus', 'Saja Al Madina', 'Hawada']

type Order = 'madina_makka' | 'makka_madina'

interface Grp {
  id: number
  title: string | null
  trip_start_date: string
  order: Order
  madina_days: number | string | null
  makka_days: number | string | null
  hotel_tier: string
  ellikboshi_username: string
  hotel_makka: string
  hotel_madina: string
  hotel_jidda: string
}

const loading = ref(false)
const groups = ref<Grp[]>([])
const search = ref('')
const savingId = ref<number | null>(null)
const savedId = ref<number | null>(null)
const errorId = ref<number | null>(null)
const errorMsg = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q
    ? groups.value.filter(g => (g.title || '').toLowerCase().includes(q) || String(g.id).includes(q))
    : groups.value
})

function hasLocation(g: Grp) {
  return (g.madina_days != null && g.madina_days !== '') || (g.makka_days != null && g.makka_days !== '')
}

// The 3rd (arrival/Jidda) hotel only applies to Saturday (Shanba) flights — the
// same weekday the bot keys the 3-stage itinerary off. Parse the date parts
// explicitly so the weekday isn't shifted by timezone. JS getDay(): Sat = 6.
function isSaturday(g: Grp): boolean {
  if (!g.trip_start_date) return false
  const [y, m, d] = g.trip_start_date.split('-').map(Number)
  if (!y || !m || !d) return false
  return new Date(y, m - 1, d).getDay() === 6
}

function numOrNull(v: number | string | null): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Days entered per city -> the start/end day ranges the bot stores. The two
// stays are laid back-to-back from day 1 in the chosen order.
function computeRanges(g: Grp) {
  const md = numOrNull(g.madina_days)
  const mk = numOrNull(g.makka_days)
  const out: Record<string, number | null> = {
    madina_start_day: null, madina_end_day: null,
    makka_start_day: null, makka_end_day: null,
  }
  let cur = 1
  const place = (city: 'madina' | 'makka', days: number | null) => {
    if (!days) return
    out[`${city}_start_day`] = cur
    out[`${city}_end_day`] = cur + days - 1
    cur += days
  }
  if (g.order === 'makka_madina') {
    place('makka', mk)
    place('madina', md)
  } else {
    place('madina', md)
    place('makka', mk)
  }
  return out
}

function rangeHint(g: Grp): string {
  const r = computeRanges(g)
  const parts: string[] = []
  if (r.madina_start_day) parts.push(`Madina: ${r.madina_start_day}–${r.madina_end_day}-kun`)
  if (r.makka_start_day) parts.push(`Makka: ${r.makka_start_day}–${r.makka_end_day}-kun`)
  return parts.length ? parts.join(' · ') : 'Kun kiritilmagan'
}

// Stored ranges -> day-counts + order for the simplified inputs.
function daysFromRange(start: any, end: any): number | string {
  if (start == null || end == null) return ''
  const d = Number(end) - Number(start) + 1
  return Number.isFinite(d) && d > 0 ? d : ''
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/groups')
    groups.value = data.map((g: any): Grp => {
      const ms = g.madina_start_day, ks = g.makka_start_day
      const order: Order = (ms != null && ks != null && Number(ks) < Number(ms)) ? 'makka_madina' : 'madina_makka'
      return {
        id: g.id,
        title: g.title,
        trip_start_date: g.trip_start_date || '',
        order,
        madina_days: daysFromRange(g.madina_start_day, g.madina_end_day),
        makka_days: daysFromRange(g.makka_start_day, g.makka_end_day),
        hotel_tier: g.hotel_tier || '',
        ellikboshi_username: g.ellikboshi_username || '',
        hotel_makka: g.hotel_makka || '',
        hotel_madina: g.hotel_madina || '',
        hotel_jidda: g.hotel_jidda || '',
      }
    })
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

async function save(g: Grp) {
  savingId.value = g.id
  savedId.value = null
  errorId.value = null
  try {
    await api.put(`/groups/${g.id}/location/public`, {
      trip_start_date: g.trip_start_date || null,
      ...computeRanges(g),
      hotel_tier: g.hotel_tier ?? '',
      ellikboshi_username: g.ellikboshi_username ?? '',
      hotel_makka: g.hotel_makka ?? '',
      hotel_madina: g.hotel_madina ?? '',
      hotel_jidda: g.hotel_jidda ?? '',
    })
    savedId.value = g.id
    setTimeout(() => { if (savedId.value === g.id) savedId.value = null }, 2500)
  } catch (e: any) {
    errorId.value = g.id
    errorMsg.value = e?.response?.data?.detail || 'Saqlashda xatolik'
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>

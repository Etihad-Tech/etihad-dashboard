<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Guruhlar</h2>
        <p class="text-sm text-gray-500 mt-1">
          Har bir guruh uchun safar kechalari (Madina / Makka), mehmonxona, paket va ellikboshini sozlang.
          Bot joriy shaharni shu kechalar soniga qarab aniqlaydi (kun = safar boshlanish sanasidan hisoblanadi).
        </p>
        <p class="text-xs text-gray-400 mt-1">
          Faqat Turon tizimida ro'yxatdan o'tgan (safarga biriktirilgan) guruhlar ko'rsatiladi — botga tasodifan
          qo'shilgan begona guruhlar bu yerda chiqmaydi.
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
              <span v-if="!hasLocation(g)" class="text-[11px] text-rose-600 shrink-0">Kechalar kiritilmagan — bot shaharni bilmaydi</span>
              <span v-else-if="hotelGap(g)" class="text-[11px] text-amber-600 shrink-0">{{ hotelGap(g) }}</span>
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
                <label class="block text-[11px] text-amber-600 mb-1">Jidda — necha kecha</label>
                <input v-model="g.jidda_nights" type="number" min="0" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] text-emerald-600 mb-1">Madina — necha kecha</label>
                <input v-model="g.madina_nights" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] text-sky-600 mb-1">Makka — necha kecha</label>
                <input v-model="g.makka_nights" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div class="col-span-2">
                <p class="text-[11px] text-gray-400">{{ rangeHint(g) }}</p>
              </div>

              <div class="col-span-2">
                <label class="block text-[11px] text-gray-400 mb-1">Madina mehmonxonasi</label>
                <select v-model="g.hotel_madina" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">—</option>
                  <option v-for="h in hotelOptions('madina', g.hotel_madina)" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block text-[11px] text-gray-400 mb-1">Makka mehmonxonasi</label>
                <select v-model="g.hotel_makka" @change="applyHotelTier(g)" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">—</option>
                  <option v-for="h in hotelOptions('makka', g.hotel_makka)" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <div v-if="hasJidda(g)" class="col-span-2">
                <label class="block text-[11px] text-gray-400 mb-1">
                  Jidda (kelish) mehmonxonasi
                  <span class="text-amber-600">— {{ jiddaDayLabel(g) }}</span>
                </label>
                <select v-model="g.hotel_jidda" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">—</option>
                  <option v-for="h in hotelOptions('jidda', g.hotel_jidda)" :key="h" :value="h">{{ h }}</option>
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
          Eslatma: har bir shaharda necha <b>kecha</b> turishini yozing — <b>safar uzunligi shu uch raqamdan kelib chiqadi</b>,
          reys jadvalidan emas. Shuning uchun bir xil kunda uchadigan turli paketlar (masalan
          <b>ANJUM-6</b> → Jidda 1, Makka 2, Madina 2 = 5 kecha; <b>ANJUM-13</b> → 1 / 7 / 4 = 12 kecha;
          <b>TAJ-13</b> → 1 / 8 / 3 = 12 kecha) bir-biriga xalaqit bermaydi.
          Bot kun raqamini safar boshlanish sanasidan o'zi hisoblaydi (1 kecha = 1 kun), qaytish sanasini,
          shaharlar almashinuvini (Haramain poyezdi) va safar tugashini ham shundan biladi.
          Jidda kechasi yo'q bo'lsa <b>0</b> yozing. Madina/Makka qiymatini o'chirib bo'lmaydi — faqat ustiga yangi qiymat yozish mumkin.
        </p>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api, { teamApi } from '../../../api'
import { useAuthStore } from '../../../stores/auth'
import { useHotelsStore } from '../../../stores/hotels'
import { byGroupNumber } from '../../../utils/groupOrder'

// Dashboard-managed hotel list (Mehmonxonalar page), filtered by city slot.
// Keeps a group's already-saved hotel in the list even if it was later removed.
const hotelsStore = useHotelsStore()
const hotelOptions = (city: string, current?: string | null) => hotelsStore.optionsForCity(city, current)

// When a Makka hotel is picked, apply its default tier (Taj Park = comfort, etc.)
// to the group — this is what the hotel's `default_tier` is for. The admin can
// still override the tier select afterwards.
function applyHotelTier(g: Grp) {
  const h = hotelsStore.items.find(x => x.name === g.hotel_makka)
  if (h?.default_tier) g.hotel_tier = h.default_tier
}

type Order = 'madina_makka' | 'makka_madina'

interface Grp {
  id: number
  title: string | null
  trip_start_date: string
  order: Order
  jidda_nights: number | string | null
  madina_nights: number | string | null
  makka_nights: number | string | null
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
  const list = q
    ? groups.value.filter(g => (g.title || '').toLowerCase().includes(q) || String(g.id).includes(q))
    : groups.value
  // Order by the #NNN number in each group's title (see utils/groupOrder) so the
  // list always reads #001, #002, #003… instead of raw API order.
  return [...list].sort(byGroupNumber)
})

function hasLocation(g: Grp) {
  return (g.madina_nights != null && g.madina_nights !== '') || (g.makka_nights != null && g.makka_nights !== '')
}

// The arrival (Jidda) hotel slot shows whenever the group actually has a Jidda night.
// It used to show on Saturday departures only, back when the weekday identified the
// itinerary; it no longer does — several packages of different shapes fly the same
// Saturday plane, and the night count is what says whether there is a Jidda stay.
function hasJidda(g: Grp): boolean {
  return (numOrNull(g.jidda_nights) || 0) > 0
}

// A city with nights but no hotel, or a hotel with no nights. Worth surfacing on the
// card: the night counts now drive the trip's whole shape, so a leg that is half
// configured is the difference between the bot naming the right hotel and saying
// nothing. Returns '' when the group is consistent.
function hotelGap(g: Grp): string {
  const legs: [string, number | null, string][] = [
    ['Jidda', numOrNull(g.jidda_nights), g.hotel_jidda],
    ['Madina', numOrNull(g.madina_nights), g.hotel_madina],
    ['Makka', numOrNull(g.makka_nights), g.hotel_makka],
  ]
  const missingHotel = legs.filter(([, n, h]) => n && !h).map(([c]) => c)
  if (missingHotel.length) return `${missingHotel.join(', ')} — mehmonxona tanlanmagan`
  const missingNights = legs.filter(([, n, h]) => h && !n).map(([c]) => c)
  if (missingNights.length) return `${missingNights.join(', ')} — kecha soni yo'q`
  return ''
}

function jiddaDayLabel(g: Grp): string {
  const r = computeRanges(g)
  if (!r.jidda_start_day) return ''
  return r.jidda_start_day === r.jidda_end_day
    ? `${r.jidda_start_day}-kun`
    : `${r.jidda_start_day}–${r.jidda_end_day}-kun`
}

function numOrNull(v: number | string | null): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Nights entered per city -> the start/end day ranges the bot stores. 1 night = 1
// day-slot, so the stays are laid back-to-back from day 1: Jidda first when there is
// one (it is the arrival airport city), then the two holy cities in the chosen order.
// These three ranges ARE the trip's shape — the bot reads its length, its city-by-day
// map, its return date and its fly-home day off them, so a 6-day and a 13-day package
// on the same plane stay independent.
function computeRanges(g: Grp) {
  const jd = numOrNull(g.jidda_nights)
  const md = numOrNull(g.madina_nights)
  const mk = numOrNull(g.makka_nights)
  // 0 rather than null for Jidda: the API leaves a NULL field untouched, so a zeroed
  // range is the only way to CLEAR a Jidda leg that was set before.
  const out: Record<string, number | null> = {
    madina_start_day: null, madina_end_day: null,
    makka_start_day: null, makka_end_day: null,
    jidda_start_day: 0, jidda_end_day: 0,
  }
  let cur = 1
  const place = (city: 'jidda' | 'madina' | 'makka', days: number | null) => {
    if (!days) return
    out[`${city}_start_day`] = cur
    out[`${city}_end_day`] = cur + days - 1
    cur += days
  }
  place('jidda', jd)
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
  const span = (label: string, s: number | null, e: number | null) => {
    if (!s || !e) return
    parts.push(s === e ? `${label}: ${s}-kun` : `${label}: ${s}–${e}-kun`)
  }
  span('Jidda', r.jidda_start_day, r.jidda_end_day)
  span('Madina', r.madina_start_day, r.madina_end_day)
  span('Makka', r.makka_start_day, r.makka_end_day)
  const total = (numOrNull(g.jidda_nights) || 0)
    + (numOrNull(g.madina_nights) || 0)
    + (numOrNull(g.makka_nights) || 0)
  // Spell out the fly-home day: it is the number the bot derives everything else from
  // (return date, trip-end thanks), so a wrong night count is visible right here.
  if (total) parts.push(`Jami: ${total} kecha · uyga ${total + 1}-kun`)
  return parts.length ? parts.join(' · ') : 'Kecha kiritilmagan'
}

// Stored day-ranges -> per-city night-counts for the simplified inputs (1 night =
// 1 day-slot, so the count of day-slots a city spans is its number of nights).
// A zeroed 0/0 range means "no such leg" (that is how one is cleared), so it must read
// back as blank — day 0 is not a trip day, and `0 - 0 + 1` would otherwise say 1 night.
function nightsFromRange(start: any, end: any): number | string {
  if (!start || !end) return ''
  const d = Number(end) - Number(start) + 1
  return Number.isFinite(d) && d > 0 ? d : ''
}

async function load() {
  loading.value = true
  try {
    // Only company groups REGISTERED in the Turon (team) system should appear: a
    // trip's group_chat_id is the registry. Random groups the AI bot happens to be
    // added to have no trip, so they are filtered out. The team API needs a team
    // session (the admin login has one; qa/flight do not) — guard the call so a
    // missing/expired team token can never 401-logout a non-admin; in that case we
    // skip the filter and fall back to showing all AI groups.
    const auth = useAuthStore()
    const calls: Promise<any>[] = [api.get('/groups')]
    if (auth.teamToken) calls.push(teamApi.get('/api/trips'))
    const [aiRes, tripsRes] = await Promise.allSettled(calls)

    let registered: Set<string> | null = null
    if (tripsRes && tripsRes.status === 'fulfilled') {
      registered = new Set<string>(
        tripsRes.value.data
          .filter((t: any) => t.group_chat_id)
          .map((t: any) => String(t.group_chat_id)),
      )
    }

    const aiGroups: any[] = aiRes.status === 'fulfilled' ? aiRes.value.data : []
    const visible = registered ? aiGroups.filter(g => registered!.has(String(g.id))) : aiGroups
    groups.value = visible.map((g: any): Grp => {
      const ms = g.madina_start_day, ks = g.makka_start_day
      const order: Order = (ms != null && ks != null && Number(ks) < Number(ms)) ? 'makka_madina' : 'madina_makka'
      return {
        id: g.id,
        title: g.title,
        trip_start_date: g.trip_start_date || '',
        order,
        jidda_nights: nightsFromRange(g.jidda_start_day, g.jidda_end_day),
        madina_nights: nightsFromRange(g.madina_start_day, g.madina_end_day),
        makka_nights: nightsFromRange(g.makka_start_day, g.makka_end_day),
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

onMounted(() => { hotelsStore.fetch(); load() })
</script>

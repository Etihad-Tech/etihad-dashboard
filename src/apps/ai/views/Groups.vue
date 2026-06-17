<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Guruhlar</h2>
        <p class="text-sm text-gray-500 mt-1">
          Har bir guruh uchun safar kunlari (Makka / Madina), mehmonxona, paket va ellikboshini sozlang.
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

              <div>
                <label class="block text-[11px] text-emerald-600 mb-1">Madina — boshlanish kuni</label>
                <input v-model="g.madina_start_day" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] text-emerald-600 mb-1">Madina — tugash kuni</label>
                <input v-model="g.madina_end_day" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] text-sky-600 mb-1">Makka — boshlanish kuni</label>
                <input v-model="g.makka_start_day" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] text-sky-600 mb-1">Makka — tugash kuni</label>
                <input v-model="g.makka_end_day" type="number" min="1" placeholder="—" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
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
          Eslatma: kunlar bir marta to'g'ri kiritilsa kifoya. Misol: 10 kunlik safarda Madina 1–4, Makka 5–10.
          Kunni o'chirib bo'lmaydi — faqat ustiga yangi qiymat yozish mumkin.
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

interface Grp {
  id: number
  title: string | null
  trip_start_date: string
  madina_start_day: number | string | null
  madina_end_day: number | string | null
  makka_start_day: number | string | null
  makka_end_day: number | string | null
  hotel_tier: string
  ellikboshi_username: string
  hotel_makka: string
  hotel_madina: string
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
  return g.madina_start_day != null && g.madina_start_day !== '' || g.makka_start_day != null && g.makka_start_day !== ''
}

function numOrNull(v: number | string | null): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/groups')
    groups.value = data.map((g: any) => ({
      id: g.id,
      title: g.title,
      trip_start_date: g.trip_start_date || '',
      madina_start_day: g.madina_start_day ?? '',
      madina_end_day: g.madina_end_day ?? '',
      makka_start_day: g.makka_start_day ?? '',
      makka_end_day: g.makka_end_day ?? '',
      hotel_tier: g.hotel_tier || '',
      ellikboshi_username: g.ellikboshi_username || '',
      hotel_makka: g.hotel_makka || '',
      hotel_madina: g.hotel_madina || '',
    }))
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
      madina_start_day: numOrNull(g.madina_start_day),
      madina_end_day: numOrNull(g.madina_end_day),
      makka_start_day: numOrNull(g.makka_start_day),
      makka_end_day: numOrNull(g.makka_end_day),
      hotel_tier: g.hotel_tier ?? '',
      ellikboshi_username: g.ellikboshi_username ?? '',
      hotel_makka: g.hotel_makka ?? '',
      hotel_madina: g.hotel_madina ?? '',
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

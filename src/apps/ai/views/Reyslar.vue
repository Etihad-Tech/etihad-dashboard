<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Reyslar</h2>
        <p class="text-sm text-gray-500 mt-1">Borish va qaytish reyslari — vaqt va yo'nalishni shu yerdan o'zgartiring</p>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Mavsumda ikkita reys bor — har <b>Payshanba</b> va har <b>Shanba</b>. Bot guruhning jo'nash sanasi
          (Guruhlar sahifasida) qaysi haftaga to'g'ri kelishiga qarab reysni tanlaydi va "samolyot qachon uchadi?"
          degan savolga aniq sana + vaqt bilan javob beradi. Qaytish sanasi avtomatik hisoblanadi (jo'nash + tunlar
          soni), shuning uchun bu yerda faqat <b>vaqt va yo'nalish</b>ni kiritasiz.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else class="grid gap-5 lg:grid-cols-2">
        <div
          v-for="(s, i) in schedules"
          :key="s.id"
          class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 40}ms` }"
        >
          <div class="flex items-center gap-2 mb-4">
            <div class="w-9 h-9 rounded-2xl bg-sky-50 flex items-center justify-center">
              <font-awesome-icon icon="plane" class="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900">{{ s.name }}</h3>
              <p class="text-xs text-gray-400">{{ weekdayLabel(s.departure_weekday) }} · {{ s.nights }} kecha</p>
            </div>
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

          <div class="flex items-center justify-between">
            <span v-if="savedId === s.id" class="text-xs text-emerald-600 flex items-center gap-1">
              <font-awesome-icon icon="circle" class="w-2 h-2" /> Saqlandi
            </span>
            <span v-else></span>
            <button @click="save(s)" :disabled="savingId === s.id"
              class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
              {{ savingId === s.id ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'

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
  is_active: boolean
}

const CITIES = [
  { value: 'toshkent', label: 'Toshkent' },
  { value: 'jidda', label: 'Jidda' },
  { value: 'madina', label: 'Madina' },
  { value: 'makka', label: 'Makka' },
]

const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']
function weekdayLabel(w: number) {
  return WEEKDAYS[w] ?? `${w}`
}

const schedules = ref<Flight[]>([])
const loading = ref(false)
const savingId = ref<number | null>(null)
const savedId = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/flights')
    schedules.value = data
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

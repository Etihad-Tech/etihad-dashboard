<template>
  <AppLayout>
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900 animate-fade-up">Google Sheets Export</h2>

      <!-- Trip selector -->
      <div class="animate-fade-up" style="animation-delay: 30ms">
        <label class="block text-sm font-medium text-gray-700 mb-2">Safarni tanlang</label>
        <select
          v-model="selectedTrip"
          class="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full max-w-sm"
        >
          <option value="">Tanlang...</option>
          <option v-for="t in tripsStore.items" :key="t.trip_id" :value="t.trip_id">{{ t.name }}</option>
        </select>
      </div>

      <!-- Export buttons -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up" style="animation-delay: 60ms">
        <button
          v-for="action in exportActions"
          :key="action.key"
          @click="doExport(action.key)"
          :disabled="!selectedTrip || exporting === action.key"
          class="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-amber-300 disabled:opacity-50 transition-all group"
        >
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" :class="action.bg">
              <font-awesome-icon :icon="action.icon" class="w-4 h-4" :class="action.iconColor" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900">{{ action.label }}</h3>
          </div>
          <p class="text-xs text-gray-400">{{ action.desc }}</p>
          <p v-if="exporting === action.key" class="text-xs text-amber-600 mt-2">Eksport qilinmoqda...</p>
          <p v-if="exportSuccess === action.key" class="text-xs text-emerald-600 mt-2">Muvaffaqiyatli!</p>
        </button>
      </div>

      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { useTripsStore } from '../stores/trips'
import { teamApi as api } from '../../../api'

const tripsStore = useTripsStore()
const selectedTrip = ref('')
const exporting = ref('')
const exportSuccess = ref('')
const error = ref('')

const exportActions = [
  { key: 'trip-stats', label: 'Safarlar statistikasi', desc: 'Safarlar haqida umumiy ma\'lumotlar', icon: 'chart-line', bg: 'bg-blue-50', iconColor: 'text-blue-500' },
  { key: 'users', label: 'Foydalanuvchilar', desc: 'Ishtirokchilar ro\'yxati', icon: 'users', bg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  { key: 'responses', label: 'So\'rovnoma javoblari', desc: 'Poll javoblar jadvali', icon: 'chart-pie', bg: 'bg-amber-50', iconColor: 'text-amber-500' },
  { key: 'analytics', label: 'Analytics dashboard', desc: 'To\'liq analytics hisoboti', icon: 'file-export', bg: 'bg-purple-50', iconColor: 'text-purple-500' },
]

async function doExport(key: string) {
  if (!selectedTrip.value) return
  exporting.value = key
  exportSuccess.value = ''
  error.value = ''
  try {
    if (key === 'trip-stats') {
      await api.post('/api/export/trip-stats')
    } else if (key === 'users') {
      await api.post(`/api/export/users/${selectedTrip.value}`)
    } else if (key === 'responses') {
      await api.post(`/api/export/responses/${selectedTrip.value}`)
    } else if (key === 'analytics') {
      await api.post('/api/export/analytics')
    }
    exportSuccess.value = key
    setTimeout(() => (exportSuccess.value = ''), 3000)
  } catch {
    error.value = 'Eksport xatoligi'
  } finally {
    exporting.value = ''
  }
}

onMounted(() => tripsStore.fetchTrips())
</script>

<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Eksport</h1>
      </div>

      <div class="max-w-sm">
        <label class="label">Safar</label>
        <select v-model="selectedTrip" class="input">
          <option value="">Tanlang</option>
          <option v-for="t in tripsStore.items" :key="t.trip_id" :value="t.trip_id">{{ t.name }}</option>
        </select>
      </div>

      <div class="card divide-y divide-gray-100">
        <div v-for="action in exportActions" :key="action.key" class="flex items-center gap-3 px-4 py-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0" :class="action.tint">
            <font-awesome-icon :icon="action.icon" class="w-3.5 h-3.5" />
          </div>
          <span class="text-sm font-medium text-gray-900 flex-1 min-w-0">{{ action.label }}</span>
          <span v-if="exportSuccess === action.key" class="chip chip-green">
            <font-awesome-icon icon="check" class="w-3 h-3" /> Tayyor
          </span>
          <button class="btn btn-sm btn-secondary" :disabled="!selectedTrip || exporting === action.key"
            @click="doExport(action.key)">
            {{ exporting === action.key ? '...' : 'Eksport' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import { useTripsStore } from '../stores/trips'
import { teamApi as api } from '../../../api'

const tripsStore = useTripsStore()
const selectedTrip = ref('')
const exporting = ref('')
const exportSuccess = ref('')
const error = ref('')

const exportActions = [
  { key: 'trip-stats', label: 'Safarlar statistikasi', icon: 'chart-line', tint: 'bg-sky-50 text-sky-600' },
  { key: 'users', label: 'Foydalanuvchilar', icon: 'users', tint: 'bg-emerald-50 text-emerald-600' },
  { key: 'responses', label: "So'rovnoma javoblari", icon: 'chart-pie', tint: 'bg-amber-50 text-amber-600' },
  { key: 'analytics', label: 'Analitika', icon: 'file-export', tint: 'bg-violet-50 text-violet-600' },
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

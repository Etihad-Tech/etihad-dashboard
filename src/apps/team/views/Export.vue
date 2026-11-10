<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Eksport</h1>
      </div>

      <div class="card divide-y divide-gray-100 max-w-2xl">
        <div v-for="a in ACTIONS" :key="a.key" class="flex items-center gap-3 px-4 py-3">
          <font-awesome-icon :icon="a.icon" class="w-4 h-4 text-gray-400 shrink-0" />
          <span class="text-sm font-medium text-gray-900 flex-1 min-w-0">{{ a.label }}</span>
          <button class="btn btn-sm btn-secondary" :disabled="exporting === a.key" @click="run(a.key)">
            {{ exporting === a.key ? 'Eksport…' : "Sheets'ga" }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import { useToast } from '../../../composables/useToast'
import { errorText, exportSheet } from '../api'

// The exports over every trip. One trip's pilgrims and answers are exported from that
// trip's own page.
const toast = useToast()
const ACTIONS = [
  { key: 'trip-stats', label: 'Safarlar statistikasi', icon: 'chart-line' },
  { key: 'analytics', label: 'Analitika', icon: 'chart-pie' },
]
const exporting = ref('')

async function run(key: string) {
  exporting.value = key
  try {
    await exportSheet(key)
    toast.success("Google Sheets'ga yozildi")
  } catch (e) {
    toast.error(errorText(e, "Eksport qilib bo'lmadi"))
  } finally {
    exporting.value = ''
  }
}
</script>

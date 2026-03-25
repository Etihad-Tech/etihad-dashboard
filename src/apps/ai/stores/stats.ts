import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../../../api'

interface StatsData {
  total: number
  categories: Record<string, number>
  groups: Record<string, number>
  timeline: { period: string; count: number }[]
  category_timelines: Record<string, { period: string; count: number }[]>
}

export const useStatsStore = defineStore('stats', () => {
  const data = ref<StatsData | null>(null)
  const loading = ref(false)

  async function fetchStats(period: string = 'day') {
    loading.value = true
    try {
      const { data: result } = await api.get('/stats', { params: { period } })
      data.value = result
    } finally {
      loading.value = false
    }
  }

  return { data, loading, fetchStats }
})

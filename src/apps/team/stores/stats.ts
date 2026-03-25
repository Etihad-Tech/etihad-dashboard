import { defineStore } from 'pinia'
import { ref } from 'vue'
import { teamApi as api } from '../../../api'

export interface TeamStats {
  active_trips: number
  inactive_trips: number
  total_users: number
  total_posts: number
  pending_posts: number
  total_templates: number
  total_questions: number
}

export const useTeamStatsStore = defineStore('team-stats', () => {
  const data = ref<TeamStats | null>(null)
  const loading = ref(false)

  async function fetchStats() {
    loading.value = true
    try {
      const { data: result } = await api.get('/api/stats/dashboard')
      data.value = result
    } finally {
      loading.value = false
    }
  }

  return { data, loading, fetchStats }
})

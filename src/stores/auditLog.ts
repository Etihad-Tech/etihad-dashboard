import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api'

export interface AuditEntry {
  id: number
  actor: string
  actor_role: string | null
  action: string
  entity: string
  entity_id: string | null
  summary: string
  changes: any | null
  source: string
  created_at: string | null
}

export interface AuditFilters {
  actor?: string
  entity?: string
  action?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export const useAuditLogStore = defineStore('auditLog', () => {
  const items = ref<AuditEntry[]>([])
  const total = ref(0)
  const loading = ref(false)

  async function fetch(filters: AuditFilters = {}) {
    loading.value = true
    // Drop empty values so the API only filters on what was actually set.
    const params: Record<string, any> = {}
    for (const [k, v] of Object.entries(filters)) {
      if (v !== '' && v !== undefined && v !== null) params[k] = v
    }
    try {
      const { data } = await api.get('/audit-logs', { params })
      items.value = data.items
      total.value = data.total
    } catch {
      items.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  return { items, total, loading, fetch }
})

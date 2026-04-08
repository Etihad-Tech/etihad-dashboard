import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiApi, teamApi } from '../api'

export interface GroupInfo {
  chat_id: string
  title: string
  ai_bot: boolean
  turon_bot: boolean
  trip_id: string | null
  trip_name: string | null
  is_activated: boolean
}

export const useGroupsStore = defineStore('groups', () => {
  const items = ref<GroupInfo[]>([])
  const loading = ref(false)
  const sending = ref<string | null>(null)

  async function fetchGroups() {
    loading.value = true
    try {
      const [tripsResult, teamGroupsResult, aiGroupsResult] = await Promise.allSettled([
        teamApi.get('/api/trips'),
        teamApi.get('/api/group-chats'),
        aiApi.get('/messages/groups'),
      ])

      const turonGroupIds = new Set<string>()
      if (teamGroupsResult.status === 'fulfilled') {
        for (const g of teamGroupsResult.value.data) {
          turonGroupIds.add(String(g.chat_id))
        }
      }

      const aiGroupIds = new Set<string>()
      if (aiGroupsResult.status === 'fulfilled') {
        for (const g of aiGroupsResult.value.data) {
          aiGroupIds.add(String(g.id))
        }
      }

      const merged: GroupInfo[] = []
      if (tripsResult.status === 'fulfilled') {
        for (const trip of tripsResult.value.data) {
          if (!trip.group_chat_id) continue
          const chatId = String(trip.group_chat_id)
          merged.push({
            chat_id: chatId,
            title: trip.name,
            ai_bot: aiGroupIds.has(chatId),
            turon_bot: turonGroupIds.has(chatId),
            trip_id: trip.trip_id,
            trip_name: trip.name,
            is_activated: !!trip.is_activated,
          })
        }
      }

      items.value = merged
    } finally {
      loading.value = false
    }
  }

  async function sendNowPosts(tripId: string, chatId: string) {
    sending.value = chatId
    try {
      const { data } = await teamApi.post(`/api/trips/${tripId}/send-now-posts`)
      const { data: trip } = await teamApi.get(`/api/trips/${tripId}`)
      if (trip.madina_start_day || trip.makka_start_day) {
        await aiApi.put(`/groups/${chatId}/location/public`, {
          madina_start_day: trip.madina_start_day,
          madina_end_day: trip.madina_end_day,
          makka_start_day: trip.makka_start_day,
          makka_end_day: trip.makka_end_day,
        })
      }

      const idx = items.value.findIndex(g => g.chat_id === chatId)
      if (idx !== -1) items.value[idx].is_activated = true
      return data
    } finally {
      sending.value = null
    }
  }

  return { items, loading, sending, fetchGroups, sendNowPosts }
})

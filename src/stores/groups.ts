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
  hotel_tier: string | null  // '' = avtomatik (nomdan aniqlanadi) | 'comfort' | 'premium'
  ellikboshi_username: string | null  // group leader @username; DM'd on every staff mention
  trip_start_date: string | null  // 'YYYY-MM-DD' departure date; drives the exact flight answer
  hotel_makka: string | null  // this group's Makka hotel (per-hotel facility answers)
  hotel_madina: string | null  // this group's Madina hotel
}

export const useGroupsStore = defineStore('groups', () => {
  const items = ref<GroupInfo[]>([])
  const loading = ref(false)
  const sending = ref<string | null>(null)

  async function fetchGroups() {
    loading.value = true
    try {
      const [tripsResult, teamGroupsResult, aiGroupsResult, aiTiersResult] = await Promise.allSettled([
        teamApi.get('/api/trips'),
        teamApi.get('/api/group-chats'),
        aiApi.get('/messages/groups'),
        aiApi.get('/groups'),
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

      // hotel_tier override + ellikboshi + departure date per ai-bot group (empty/absent => default)
      const tierById = new Map<string, string>()
      const leaderById = new Map<string, string>()
      const dateById = new Map<string, string>()
      const makkaById = new Map<string, string>()
      const madinaById = new Map<string, string>()
      if (aiTiersResult.status === 'fulfilled') {
        for (const g of aiTiersResult.value.data) {
          tierById.set(String(g.id), g.hotel_tier || '')
          leaderById.set(String(g.id), g.ellikboshi_username || '')
          dateById.set(String(g.id), g.trip_start_date || '')
          makkaById.set(String(g.id), g.hotel_makka || '')
          madinaById.set(String(g.id), g.hotel_madina || '')
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
            hotel_tier: tierById.get(chatId) ?? '',
            ellikboshi_username: leaderById.get(chatId) ?? '',
            trip_start_date: dateById.get(chatId) ?? '',
            hotel_makka: makkaById.get(chatId) ?? '',
            hotel_madina: madinaById.get(chatId) ?? '',
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
          trip_start_date: trip.start_date,
        })
      }

      const idx = items.value.findIndex(g => g.chat_id === chatId)
      if (idx !== -1) items.value[idx].is_activated = true
      return data
    } finally {
      sending.value = null
    }
  }

  async function setHotelTier(chatId: string, tier: string) {
    // Push the override to the AI bot group ('' clears it -> bot infers from title).
    await aiApi.put(`/groups/${chatId}/location/public`, { hotel_tier: tier })
    const idx = items.value.findIndex(g => g.chat_id === chatId)
    if (idx !== -1) items.value[idx].hotel_tier = tier
  }

  async function setEllikboshi(chatId: string, username: string) {
    // The group leader DM'd whenever the bot mentions a staff member here
    // ('' clears it -> no leader DM).
    await aiApi.put(`/groups/${chatId}/location/public`, { ellikboshi_username: username })
    const idx = items.value.findIndex(g => g.chat_id === chatId)
    if (idx !== -1) items.value[idx].ellikboshi_username = username
  }

  async function setTripStartDate(chatId: string, date: string) {
    // Departure date ('YYYY-MM-DD'). The bot picks Payshanba/Shanba from its
    // weekday and answers flight questions with the exact date + time.
    await aiApi.put(`/groups/${chatId}/location/public`, { trip_start_date: date || null })
    const idx = items.value.findIndex(g => g.chat_id === chatId)
    if (idx !== -1) items.value[idx].trip_start_date = date
  }

  async function setHotel(chatId: string, city: 'makka' | 'madina', hotel: string) {
    // The group's hotel in that city — the bot answers hotel-specific facility
    // questions (WiFi, floors, dining hours) from the current-city hotel.
    const payload = city === 'madina' ? { hotel_madina: hotel } : { hotel_makka: hotel }
    await aiApi.put(`/groups/${chatId}/location/public`, payload)
    const idx = items.value.findIndex(g => g.chat_id === chatId)
    if (idx !== -1) {
      if (city === 'madina') items.value[idx].hotel_madina = hotel
      else items.value[idx].hotel_makka = hotel
    }
  }

  return { items, loading, sending, fetchGroups, sendNowPosts, setHotelTier, setEllikboshi, setTripStartDate, setHotel }
})

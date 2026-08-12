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
  preflight_majlis_time: string | null  // 'HH:MM' safar-oldi majlis time; day derives from trip date
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
        aiApi.get('/groups'),
      ])

      const turonGroupIds = new Set<string>()
      if (teamGroupsResult.status === 'fulfilled') {
        for (const g of teamGroupsResult.value.data) {
          turonGroupIds.add(String(g.chat_id))
        }
      }

      // AI-bot membership AND the per-group settings (tier/ellikboshi/date/hotels)
      // both come from /groups — the AI endpoint the qa role can call. (/messages/groups
      // is admin-only, so a qa login would get an empty ai_bot set and the Start button
      // would stay locked.) /groups is already Turon-filtered to trip-bound groups.
      const aiGroupIds = new Set<string>()
      const tierById = new Map<string, string>()
      const leaderById = new Map<string, string>()
      const dateById = new Map<string, string>()
      const makkaById = new Map<string, string>()
      const madinaById = new Map<string, string>()
      const majlisById = new Map<string, string>()
      if (aiGroupsResult.status === 'fulfilled') {
        for (const g of aiGroupsResult.value.data) {
          aiGroupIds.add(String(g.id))
          tierById.set(String(g.id), g.hotel_tier || '')
          leaderById.set(String(g.id), g.ellikboshi_username || '')
          dateById.set(String(g.id), g.trip_start_date || '')
          makkaById.set(String(g.id), g.hotel_makka || '')
          madinaById.set(String(g.id), g.hotel_madina || '')
          majlisById.set(String(g.id), g.preflight_majlis_time || '')
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
            preflight_majlis_time: majlisById.get(chatId) ?? '',
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
      // The DATE only. Turon owns the departure date; ai/Guruhlar owns the trip's
      // SHAPE, and this button must not write any part of it.
      //
      // It used to push the Turon trip's day map too. Turon has no Jidda leg and its
      // template default is a 10-day Madina-first map (Madina 1-5 / Makka 6-10) that is
      // wrong for every package on the Shanba plane — and planting it does more than
      // put wrong days in: it also sets the Marshrut that every later edit in Guruhlar
      // inherits, so the office corrects the night COUNTS and the route stays backwards.
      // That is what the audit trail for -1004342086945 shows: a correct Makka-first map
      // saved at 2026-07-31 17:56:57, Turon's Madina-first template over it 44s later,
      // and the 08-10 edits still Madina-first. #56 stopped it OVERWRITING a map; a
      // group with none still got one, which is how it starts.
      //
      // A group with no map is visible and safe: Guruhlar flags it in red ("Kechalar
      // kiritilmagan — bot shaharni bilmaydi"), and the bot with no city tags no crew
      // rather than the wrong city's crew.
      if (trip.start_date) {
        await aiApi.put(`/groups/${chatId}/location/public`, { trip_start_date: trip.start_date })
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

  async function setPreflightMajlisTime(chatId: string, timeStr: string) {
    // Time ('HH:MM') of the safar-oldi (pre-flight) Tashkent majlis. The bot derives
    // the day/date from the trip date (trip - 3 days) and fills the invite template.
    // '' clears it -> the bot defers the question to the ellikboshi.
    await aiApi.put(`/groups/${chatId}/location/public`, { preflight_majlis_time: timeStr || null })
    const idx = items.value.findIndex(g => g.chat_id === chatId)
    if (idx !== -1) items.value[idx].preflight_majlis_time = timeStr
  }

  return { items, loading, sending, fetchGroups, sendNowPosts, setHotelTier, setEllikboshi, setTripStartDate, setHotel, setPreflightMajlisTime }
})

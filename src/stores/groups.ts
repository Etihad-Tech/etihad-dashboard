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

  /** Does the AI bot already hold a day map for this group? Read fresh rather than from
   *  `items`, which does not carry the day fields and may be minutes stale. */
  async function aiHasDayMap(chatId: string): Promise<boolean> {
    try {
      const { data } = await aiApi.get('/groups')
      const g = (data as any[]).find(x => String(x.id) === String(chatId))
      return !!g && (g.madina_start_day != null || g.makka_start_day != null)
    } catch {
      // Could not read it -> assume it IS set and do not push. Failing this way
      // preserves a manual override; failing the other way silently destroys one.
      return true
    }
  }

  async function sendNowPosts(tripId: string, chatId: string) {
    sending.value = chatId
    try {
      const { data } = await teamApi.post(`/api/trips/${tripId}/send-now-posts`)
      const { data: trip } = await teamApi.get(`/api/trips/${tripId}`)
      if (trip.madina_start_day || trip.makka_start_day) {
        // SEED ONLY, NEVER OVERWRITE. This pushes the TURON trip's day map into the AI
        // bot, and Turon's template default is a 10-day map (Madina 1-5 / Makka 6-10)
        // that is wrong for a 9-day Payshanba trip. So the office corrects Madina to 4
        // in ai/Guruhlar — and every later press of this button used to push Turon's 5
        // straight back over it. There is no guard on is_activated, so the button can be
        // pressed any number of times, which is exactly what the owner saw: "after
        // several times it becomes again 5 days" (2026-08-05).
        //
        // The trip DATE is still pushed every time: that comes from the Turon trip
        // itself, which is its rightful owner, and it is not something the AI dashboard
        // offers as an override on this screen.
        const hasDayMap = await aiHasDayMap(chatId)
        await aiApi.put(`/groups/${chatId}/location/public`, {
          ...(hasDayMap ? {} : {
            madina_start_day: trip.madina_start_day,
            madina_end_day: trip.madina_end_day,
            makka_start_day: trip.makka_start_day,
            makka_end_day: trip.makka_end_day,
          }),
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

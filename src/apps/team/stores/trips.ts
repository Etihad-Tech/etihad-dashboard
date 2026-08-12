import { defineStore } from 'pinia'
import { ref } from 'vue'
import { teamApi as api } from '../../../api'

export interface TripUser {
  id: number
  user_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  registered_at: string
}

export interface Roadmap {
  id: number
  content: string
  created_at: string
}

export interface Trip {
  id: number
  trip_id: string
  name: string
  group_invite_link: string | null
  group_chat_id: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  registration_open: boolean
  roadmap_id: number | null
  madina_start_day: number | null
  madina_end_day: number | null
  makka_start_day: number | null
  makka_end_day: number | null
  created_at: string
  participant_count?: number
}

export const useTripsStore = defineStore('team-trips', () => {
  const items = ref<Trip[]>([])
  const inactive = ref<Trip[]>([])
  const current = ref<Trip | null>(null)
  const users = ref<TripUser[]>([])
  const loading = ref(false)

  async function fetchTrips() {
    loading.value = true
    try {
      const { data } = await api.get('/api/trips')
      items.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchInactive() {
    const { data } = await api.get('/api/trips/inactive')
    inactive.value = data
  }

  async function fetchTrip(tripId: string) {
    const { data } = await api.get(`/api/trips/${tripId}`)
    current.value = data
    return data
  }

  async function createTrip(payload: Partial<Trip>) {
    const { data } = await api.post('/api/trips', payload)
    items.value.unshift(data)
    return data
  }

  async function updateTrip(tripId: string, payload: Partial<Trip>) {
    const { data } = await api.put(`/api/trips/${tripId}`, payload)
    current.value = data
    const idx = items.value.findIndex(t => t.trip_id === tripId)
    if (idx !== -1) items.value[idx] = data
    return data
  }

  async function toggleRegistration(tripId: string, open: boolean) {
    const { data } = await api.put(`/api/trips/${tripId}/registration`, { registration_open: open })
    if (current.value?.trip_id === tripId) current.value = data
    const idx = items.value.findIndex(t => t.trip_id === tripId)
    if (idx !== -1) items.value[idx] = data
  }

  async function toggleStatus(tripId: string, active: boolean) {
    const { data } = await api.put(`/api/trips/${tripId}/status`, { is_active: active })
    if (active) {
      inactive.value = inactive.value.filter(t => t.trip_id !== tripId)
      items.value.unshift(data)
    } else {
      items.value = items.value.filter(t => t.trip_id !== tripId)
      inactive.value.unshift(data)
    }
    if (current.value?.trip_id === tripId) current.value = data
  }

  async function deleteTrip(tripId: string) {
    await api.delete(`/api/trips/${tripId}`)
    items.value = items.value.filter(t => t.trip_id !== tripId)
    inactive.value = inactive.value.filter(t => t.trip_id !== tripId)
  }

  async function fetchUsers(tripId: string) {
    const { data } = await api.get(`/api/trips/${tripId}/users`)
    users.value = data
    return data
  }

  return {
    items, inactive, current, users, loading,
    fetchTrips, fetchInactive, fetchTrip, createTrip, updateTrip,
    toggleRegistration, toggleStatus, deleteTrip, fetchUsers,
  }
})

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api from '../api'

// Structured per-hotel facts the bot answers verbatim (Mehmonxonalar form).
export interface HotelDetails {
  mosque_floor?: string | null
  dining_floor?: string | null
  lobby_floor?: string | null
  breakfast_time?: string | null
  lunch_time?: string | null
  dinner_time?: string | null
  wifi_name?: string | null
  wifi_code?: string | null
}

export interface Hotel extends HotelDetails {
  id: number
  name: string
  city: string | null          // makka | madina | jidda | flexible
  default_tier: string | null  // comfort | premium
  is_active: boolean
  created_by?: string | null
  updated_by?: string | null
}

// Single source of truth for the hotel list — feeds the Mehmonxonalar management
// page AND the hotel dropdowns on Guruhlar / Bilimlar bazasi / Bosh sahifa
// (replaces the formerly hardcoded HOTELS array duplicated across those views).
export const useHotelsStore = defineStore('hotels', () => {
  const items = ref<Hotel[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  // Active hotel names (all cities), for the QA hotel-scope dropdown.
  const names = computed(() => items.value.filter(h => h.is_active).map(h => h.name))

  async function fetch(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const { data } = await api.get('/hotels')
      items.value = data
      loaded.value = true
    } catch {
      /* keep any names we already have */
    } finally {
      loading.value = false
    }
  }

  async function add(payload: { name: string; city?: string | null; default_tier?: string | null } & HotelDetails): Promise<Hotel> {
    const { data } = await api.post('/hotels', payload)
    items.value.push(data)
    return data
  }

  async function update(id: number, payload: { name?: string; city?: string | null; default_tier?: string | null; is_active?: boolean } & HotelDetails): Promise<Hotel> {
    const { data } = await api.put(`/hotels/${id}`, payload)
    const idx = items.value.findIndex(h => h.id === id)
    if (idx !== -1) items.value[idx] = data
    return data
  }

  async function remove(id: number) {
    await api.delete(`/hotels/${id}`)
    items.value = items.value.filter(h => h.id !== id)
  }

  // All active hotel names PLUS `current` (so an already-saved value never
  // disappears). Used by the QA hotel-scope dropdown (any city).
  function optionsFor(current?: string | null): string[] {
    return Array.from(new Set([...names.value, current || ''].filter(Boolean))) as string[]
  }

  // Active hotel names for a CITY slot (madina / makka / jidda): hotels of that
  // city, plus 'flexible' (and city-less) ones, plus the current saved value.
  function optionsForCity(city: string, current?: string | null): string[] {
    const matches = items.value
      .filter(h => h.is_active && (!city || !h.city || h.city === city || h.city === 'flexible'))
      .map(h => h.name)
    return Array.from(new Set([...matches, current || ''].filter(Boolean))) as string[]
  }

  return { items, loaded, loading, names, fetch, add, update, remove, optionsFor, optionsForCity }
})

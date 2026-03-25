import { defineStore } from 'pinia'
import { ref } from 'vue'
import { teamApi as api } from '../../../api'

export interface PostButton {
  id?: number
  position: number
  name: string
  link: string | null
  is_skip: boolean
}

export interface ScheduledPost {
  id: number
  trip_id: string
  day_number: number
  message_text: string
  media_path: string | null
  media_type: string | null
  scheduled_time: string
  is_sent: boolean
  delay_minutes: number
  created_at: string
  buttons?: PostButton[]
}

export const usePostsStore = defineStore('team-posts', () => {
  const items = ref<ScheduledPost[]>([])
  const current = ref<ScheduledPost | null>(null)
  const loading = ref(false)

  async function fetchByTrip(tripId: string) {
    loading.value = true
    try {
      const { data } = await api.get(`/api/trips/${tripId}/posts`)
      items.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchPost(postId: number) {
    const { data } = await api.get(`/api/posts/${postId}`)
    current.value = data
    return data
  }

  async function createPost(tripId: string, payload: Partial<ScheduledPost>) {
    const { data } = await api.post(`/api/trips/${tripId}/posts`, payload)
    items.value.push(data)
    return data
  }

  async function updatePost(postId: number, payload: Partial<ScheduledPost>) {
    const { data } = await api.put(`/api/posts/${postId}`, payload)
    current.value = data
    const idx = items.value.findIndex(p => p.id === postId)
    if (idx !== -1) items.value[idx] = data
    return data
  }

  async function deletePost(postId: number) {
    await api.delete(`/api/posts/${postId}`)
    items.value = items.value.filter(p => p.id !== postId)
  }

  async function sendNow(postId: number) {
    await api.post(`/api/posts/${postId}/send-now`)
    const idx = items.value.findIndex(p => p.id === postId)
    if (idx !== -1) items.value[idx].is_sent = true
  }

  async function delayPost(postId: number, minutes: number) {
    const { data } = await api.put(`/api/posts/${postId}/delay`, { delay_minutes: minutes })
    const idx = items.value.findIndex(p => p.id === postId)
    if (idx !== -1) items.value[idx] = data
  }

  async function fetchButtons(postId: number) {
    const { data } = await api.get(`/api/posts/${postId}/buttons`)
    return data as PostButton[]
  }

  async function saveButtons(postId: number, buttons: PostButton[]) {
    await api.post(`/api/posts/${postId}/buttons`, buttons)
  }

  async function deleteButtons(postId: number) {
    await api.delete(`/api/posts/${postId}/buttons`)
  }

  return {
    items, current, loading,
    fetchByTrip, fetchPost, createPost, updatePost, deletePost,
    sendNow, delayPost, fetchButtons, saveButtons, deleteButtons,
  }
})

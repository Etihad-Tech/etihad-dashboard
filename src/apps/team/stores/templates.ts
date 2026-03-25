import { defineStore } from 'pinia'
import { ref } from 'vue'
import { teamApi as api } from '../../../api'

export interface TemplatePost {
  id: number
  template_id: number
  day_number: number
  message_text: string
  media_path: string | null
  media_type: string | null
  scheduled_time: string
  created_at: string
}

export interface Template {
  id: number
  name: string
  description: string | null
  created_at: string
  posts_count?: number
}

export const useTemplatesStore = defineStore('team-templates', () => {
  const items = ref<Template[]>([])
  const current = ref<Template | null>(null)
  const posts = ref<TemplatePost[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const { data } = await api.get('/api/templates')
      items.value = data
    } finally {
      loading.value = false
    }
  }

  async function createTemplate(payload: { name: string; description?: string }) {
    const { data } = await api.post('/api/templates', payload)
    items.value.unshift(data)
    return data
  }

  async function deleteTemplate(id: number) {
    await api.delete(`/api/templates/${id}`)
    items.value = items.value.filter(t => t.id !== id)
  }

  async function fetchPosts(templateId: number) {
    const { data } = await api.get(`/api/templates/${templateId}/posts`)
    posts.value = data
    return data
  }

  async function addPost(templateId: number, payload: Partial<TemplatePost>) {
    const { data } = await api.post(`/api/templates/${templateId}/posts`, payload)
    posts.value.push(data)
    return data
  }

  async function updatePost(postId: number, payload: Partial<TemplatePost>) {
    const { data } = await api.put(`/api/templates/posts/${postId}`, payload)
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) posts.value[idx] = data
    return data
  }

  async function deletePost(postId: number) {
    await api.delete(`/api/templates/posts/${postId}`)
    posts.value = posts.value.filter(p => p.id !== postId)
  }

  async function importToTrip(templateId: number, tripId: string) {
    await api.post(`/api/templates/${templateId}/import/${tripId}`)
  }

  return {
    items, current, posts, loading,
    fetchAll, createTemplate, deleteTemplate,
    fetchPosts, addPost, updatePost, deletePost, importToTrip,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../../../api'

interface MessageUser {
  id: number
  username: string | null
  first_name: string | null
  last_name: string | null
}

interface MessageGroup {
  id: number
  title: string | null
}

interface ContextItem {
  role: string
  content: string
}

export interface MessageItem {
  id: number
  text: string
  ai_response: string | null
  category: string | null
  created_at: string | null
  user: MessageUser
  group: MessageGroup
}

export interface MessagePreview extends MessageItem {
  context: ContextItem[]
}

export interface GroupItem {
  id: number
  title: string | null
}

export const useMessagesStore = defineStore('messages', () => {
  const items = ref<MessageItem[]>([])
  const total = ref(0)
  const groups = ref<GroupItem[]>([])
  const loading = ref(false)

  async function fetchMessages(params: Record<string, unknown> = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/messages', { params })
      items.value = data.items
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  async function fetchGroups() {
    const { data } = await api.get('/messages/groups')
    groups.value = data
  }

  async function fetchPreview(id: number): Promise<MessagePreview> {
    const { data } = await api.get(`/messages/${id}/preview`)
    return data
  }

  return { items, total, groups, loading, fetchMessages, fetchGroups, fetchPreview }
})

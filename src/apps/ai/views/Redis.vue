<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <button v-if="selectedChat" class="icon-btn" title="Orqaga" @click="selectedChat = null; selectedTitle = ''">
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </button>
        <h1 class="page-title">{{ selectedChat ? selectedTitle : 'Redis' }}</h1>
        <div v-if="!selectedChat" class="seg">
          <button v-for="f in filters" :key="f.value" class="seg-btn" :class="{ 'seg-btn-on': activeFilter === f.value }"
            @click="activeFilter = f.value; loadChats()">
            {{ f.label }}
          </button>
        </div>
        <span v-else-if="ttl > 0" class="chip" :class="ttl > 600 ? 'chip-green' : ttl > 120 ? 'chip-amber' : 'chip-red'">
          <font-awesome-icon icon="clock" class="w-3 h-3" />
          {{ formatTtl(ttl) }}
        </span>
        <font-awesome-icon icon="circle" class="w-2 h-2 text-emerald-500 animate-pulse" title="30s" />
      </div>

      <template v-if="!selectedChat">
        <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

        <div v-else-if="chats.length === 0" class="card empty">Xabarlar yo'q</div>

        <div v-else class="card divide-y divide-gray-100">
          <button v-for="chat in chats" :key="chat.id" type="button"
            class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            @click="selectChat(chat)">
            <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              :class="chat.type === 'private' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'">
              <font-awesome-icon :icon="chat.type === 'private' ? 'user' : 'comments'" class="w-3.5 h-3.5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate">{{ chat.title || chat.id }}</p>
              <p class="text-xs text-gray-400 font-mono truncate">{{ chat.id }}</p>
            </div>
            <span class="chip" :class="chat.type === 'private' ? 'chip-blue' : 'chip-amber'">
              {{ chat.type === 'private' ? 'Shaxsiy' : 'Guruh' }}
            </span>
            <font-awesome-icon icon="chevron-right" class="w-3 h-3 text-gray-300" />
          </button>
        </div>
      </template>

      <template v-else>
        <div v-if="messagesLoading" class="flex justify-center py-12"><div class="spinner"></div></div>

        <div v-else-if="messages.length === 0" class="card empty">Xabarlar topilmadi</div>

        <div v-else class="card divide-y divide-gray-100">
          <div v-for="(msg, i) in messages" :key="i" class="px-4 py-3 flex gap-3">
            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-semibold text-gray-500">{{ (msg.name?.[0] || '?').toUpperCase() }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-sm font-semibold text-gray-900">{{ msg.name }}</span>
                <span class="text-xs text-gray-400">{{ formatTs(msg.ts) }}</span>
              </div>
              <p class="text-sm text-gray-600 break-words">{{ msg.text }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import api from '../../../api'

interface RedisMessage {
  name: string
  text: string
  ts: number
}

interface RedisChat {
  id: string
  title: string
  type: 'private' | 'group'
}

const filters = [
  { label: 'Hammasi', value: '' },
  { label: 'Guruhlar', value: 'group' },
  { label: 'Shaxsiy', value: 'private' },
]
const activeFilter = ref('')

const chats = ref<RedisChat[]>([])
const selectedChat = ref<string | null>(null)
const selectedTitle = ref('')
const messages = ref<RedisMessage[]>([])
const ttl = ref(0)
const loading = ref(false)
const messagesLoading = ref(false)

let refreshInterval: ReturnType<typeof setInterval> | null = null

async function loadChats() {
  loading.value = true
  try {
    const params = activeFilter.value ? { chat_type: activeFilter.value } : {}
    const { data } = await api.get('/redis/chats', { params })
    chats.value = data.chats
  } catch {
    chats.value = []
  } finally {
    loading.value = false
  }
}

async function loadMessages(chatId: string) {
  messagesLoading.value = true
  try {
    const { data } = await api.get(`/redis/messages/${chatId}`)
    messages.value = data.messages
    ttl.value = data.ttl
  } catch {
    messages.value = []
    ttl.value = 0
  } finally {
    messagesLoading.value = false
  }
}

function selectChat(chat: RedisChat) {
  selectedChat.value = chat.id
  selectedTitle.value = chat.title || chat.id
  loadMessages(chat.id)
}

function formatTs(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTtl(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (min > 0) return `${min} daq ${sec} son`
  return `${sec} son`
}

function autoRefresh() {
  if (selectedChat.value) {
    loadMessages(selectedChat.value)
  } else {
    loadChats()
  }
}

onMounted(() => {
  loadChats()
  refreshInterval = setInterval(autoRefresh, 30000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

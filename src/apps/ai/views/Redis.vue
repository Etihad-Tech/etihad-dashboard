<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4 animate-fade-up">
        <button
          v-if="selectedChat"
          @click="selectedChat = null; selectedTitle = ''"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors"
        >
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </button>
        <h2 class="text-2xl font-bold text-gray-900">Redis Monitor</h2>
        <div v-if="!selectedChat" class="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            v-for="f in filters"
            :key="f.value"
            @click="activeFilter = f.value; loadChats()"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="activeFilter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <font-awesome-icon icon="circle" class="w-2 h-2 text-emerald-500 animate-pulse" />
          <span class="text-xs text-gray-400">Har 30s yangilanadi</span>
        </div>
      </div>

      <div v-if="!selectedChat" class="space-y-3">
        <div v-if="loading" class="flex justify-center py-12">
          <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="chats.length === 0" class="bg-white rounded-2xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 30ms">
          <font-awesome-icon icon="database" class="w-10 h-10 text-gray-300 mb-4" />
          <p class="text-gray-400">Redis'da hozircha xabarlar yo'q</p>
        </div>

        <div
          v-else
          v-for="(chat, i) in chats"
          :key="chat.id"
          @click="selectChat(chat)"
          class="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-all animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="chat.type === 'private' ? 'bg-blue-100' : 'bg-amber-100'"
            >
              <font-awesome-icon
                :icon="chat.type === 'private' ? 'user' : 'comments'"
                class="w-4 h-4"
                :class="chat.type === 'private' ? 'text-blue-600' : 'text-amber-600'"
              />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-gray-900">{{ chat.title || chat.id }}</p>
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  :class="chat.type === 'private' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'"
                >
                  {{ chat.type === 'private' ? 'Shaxsiy' : 'Guruh' }}
                </span>
              </div>
              <p class="text-xs text-gray-400">{{ chat.id }}</p>
            </div>
          </div>
          <font-awesome-icon icon="eye" class="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div v-if="selectedChat" class="space-y-4 animate-fade-up" style="animation-delay: 30ms">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500">
            <span class="font-semibold text-gray-700">{{ selectedTitle }}</span>
            <span class="text-xs text-gray-400 ml-2 font-mono">{{ selectedChat }}</span>
          </p>
          <span
            v-if="ttl > 0"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            :class="ttl > 600 ? 'bg-emerald-50 text-emerald-600' : ttl > 120 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'"
          >
            <font-awesome-icon icon="circle" class="w-1.5 h-1.5" />
            {{ formatTtl(ttl) }} qoldi
          </span>
        </div>

        <div v-if="messagesLoading" class="flex justify-center py-12">
          <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="messages.length === 0" class="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p class="text-gray-400">Xabarlar topilmadi</p>
        </div>

        <div v-else class="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="px-4 py-3 flex gap-3"
          >
            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
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
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
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

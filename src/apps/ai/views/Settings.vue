<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Sozlamalar</h1>
      </div>

      <div class="card p-5 space-y-4">
        <h2 class="section-title">System prompt</h2>
        <textarea v-model="promptContent" rows="12" class="input resize-y" placeholder="System prompt"></textarea>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <span v-if="savedAt" class="text-xs text-gray-400 mr-auto">{{ savedAt }}</span>
          <span v-if="message" class="text-sm" :class="messageType === 'success' ? 'text-emerald-600' : 'text-rose-600'">
            {{ message }}
          </span>
          <button class="btn btn-primary" :disabled="saving" @click="savePrompt">
            {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </div>

      <div class="card p-5 space-y-4">
        <h2 class="section-title">Ertalabki namoz vaqtlari</h2>
        <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
          <label class="flex items-center gap-3 h-9 text-sm text-gray-700 cursor-pointer">
            <ToggleSwitch v-model="prayerEnabled" :disabled="!prayerLoaded" />
            Har kuni guruhlarga yuborish
          </label>
          <div>
            <label class="label" for="prayer-time">Vaqt (Makka)</label>
            <input id="prayer-time" v-model="prayerTime" type="time" class="input w-32"
              :disabled="!prayerLoaded" />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <span v-if="prayerMessage" class="text-sm" :class="prayerMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'">
            {{ prayerMessage }}
          </span>
          <button class="btn btn-primary" :disabled="prayerSaving || !prayerLoaded || !prayerTime" @click="savePrayer">
            {{ prayerSaving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </div>

      <div class="card p-5 space-y-4">
        <h2 class="section-title">Qaytgandan keyin guruhdan chiqish</h2>
        <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
          <label class="flex items-center gap-3 h-9 text-sm text-gray-700 cursor-pointer">
            <ToggleSwitch v-model="leaveEnabled" :disabled="!leaveLoaded" />
            Bot guruhdan o'zi chiqadi
          </label>
          <div>
            <label class="label" for="leave-days">Qaytgandan keyin, kun</label>
            <input id="leave-days" v-model.number="leaveDays" type="number" min="1" max="60"
              class="input w-32" :disabled="!leaveLoaded" />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <span v-if="leaveMessage" class="text-sm" :class="leaveMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'">
            {{ leaveMessage }}
          </span>
          <button class="btn btn-primary" :disabled="leaveSaving || !leaveLoaded || !leaveDaysValid" @click="saveLeave">
            {{ leaveSaving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </div>

      <div class="card p-5 space-y-4">
        <h2 class="section-title">Yangi guruh havolalari</h2>
        <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
          <label class="flex items-center gap-3 h-9 text-sm text-gray-700 cursor-pointer">
            <ToggleSwitch v-model="linkEnabled" :disabled="!linkLoaded" />
            Xodimlar guruhiga yuborish
          </label>
          <div class="w-full sm:w-72">
            <label class="label" for="link-chat">Guruh</label>
            <select id="link-chat" v-model="linkChat" class="input" :disabled="!linkLoaded">
              <option :value="null">Tanlanmagan</option>
              <option v-for="c in linkChoices" :key="c.chat_id" :value="c.chat_id">
                {{ c.title || c.chat_id }}
              </option>
            </select>
          </div>
          <div>
            <label class="label" for="link-topic">Mavzu (topic) ID</label>
            <input id="link-topic" v-model.trim="linkTopic" type="text" inputmode="numeric"
              placeholder="ixtiyoriy" class="input w-32" :disabled="!linkLoaded || !linkChat"
              @change="takeTopicLink" />
          </div>
        </div>
        <p v-if="!linkTopicValid" class="error-text">Mavzu ID son bo'lsin</p>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <span v-if="linkMessage" class="text-sm" :class="linkMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'">
            {{ linkMessage }}
          </span>
          <button class="btn btn-primary" :disabled="linkSaving || !linkLoaded || !linkTopicValid" @click="saveLink">
            {{ linkSaving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import ToggleSwitch from '../../../components/ToggleSwitch.vue'
import api from '../../../api'

// The morning prayer-times post the bot sends to every group in Saudi (bot
// services/prayer_post.py). The time is on the Makka clock.
const prayerEnabled = ref(true)
const prayerTime = ref('')
const prayerLoaded = ref(false)
const prayerSaving = ref(false)
const prayerMessage = ref('')
const prayerMessageType = ref<'success' | 'error'>('success')

async function loadPrayer() {
  try {
    const { data } = await api.get('/prayer-post')
    prayerEnabled.value = data.is_enabled
    prayerTime.value = data.post_time
    prayerLoaded.value = true
  } catch {
    prayerMessage.value = 'Yuklab bo\'lmadi'
    prayerMessageType.value = 'error'
  }
}

async function savePrayer() {
  prayerSaving.value = true
  prayerMessage.value = ''
  try {
    const { data } = await api.put('/prayer-post', {
      is_enabled: prayerEnabled.value,
      post_time: prayerTime.value,
    })
    prayerEnabled.value = data.is_enabled
    prayerTime.value = data.post_time
    prayerMessage.value = 'Saqlandi'
    prayerMessageType.value = 'success'
    setTimeout(() => (prayerMessage.value = ''), 3000)
  } catch {
    prayerMessage.value = 'Xatolik yuz berdi'
    prayerMessageType.value = 'error'
  } finally {
    prayerSaving.value = false
  }
}

// The bot leaving a group N days after its flight home, so a finished trip costs no
// tokens (bot services/group_leave.py). Only the AI bot leaves; Turon stays.
const leaveEnabled = ref(true)
const leaveDays = ref<number | ''>('')
const leaveLoaded = ref(false)
const leaveSaving = ref(false)
const leaveMessage = ref('')
const leaveMessageType = ref<'success' | 'error'>('success')
const leaveDaysValid = computed(() =>
  typeof leaveDays.value === 'number' && Number.isInteger(leaveDays.value)
  && leaveDays.value >= 1 && leaveDays.value <= 60)

async function loadLeave() {
  try {
    const { data } = await api.get('/group-leave')
    leaveEnabled.value = data.is_enabled
    leaveDays.value = data.days_after_return
    leaveLoaded.value = true
  } catch {
    leaveMessage.value = 'Yuklab bo\'lmadi'
    leaveMessageType.value = 'error'
  }
}

async function saveLeave() {
  leaveSaving.value = true
  leaveMessage.value = ''
  try {
    const { data } = await api.put('/group-leave', {
      is_enabled: leaveEnabled.value,
      days_after_return: leaveDays.value,
    })
    leaveEnabled.value = data.is_enabled
    leaveDays.value = data.days_after_return
    leaveMessage.value = 'Saqlandi'
    leaveMessageType.value = 'success'
    setTimeout(() => (leaveMessage.value = ''), 3000)
  } catch {
    leaveMessage.value = 'Xatolik yuz berdi'
    leaveMessageType.value = 'error'
  } finally {
    leaveSaving.value = false
  }
}

// Where the bot posts every new group's invite link (bot services/group_link_post.py):
// the staff group and, optionally, its topic («Guruhlar ilovasi»). Only groups that are
// not pilgrim groups are offered; the chosen one becomes a group the bot never answers in.
interface LinkChat { chat_id: number; title: string | null }
const linkEnabled = ref(true)
const linkChat = ref<number | null>(null)
const linkTopic = ref('')
const linkChats = ref<LinkChat[]>([])
const linkSavedChat = ref<LinkChat | null>(null)
const linkLoaded = ref(false)
const linkSaving = ref(false)
const linkMessage = ref('')
const linkMessageType = ref<'success' | 'error'>('success')
// A topic's link (t.me/c/<chat>/<topic>) pasted instead of the bare number is understood too.
const TOPIC_LINK = /t\.me\/c\/(\d+)\/(\d+)/
const linkTopicValid = computed(() => linkTopic.value === '' || /^[1-9]\d{0,9}$/.test(linkTopic.value))
const linkChoices = computed(() => {
  const saved = linkSavedChat.value
  return saved && !linkChats.value.some((c) => c.chat_id === saved.chat_id)
    ? [saved, ...linkChats.value]
    : linkChats.value
})

function takeTopicLink() {
  const m = TOPIC_LINK.exec(linkTopic.value)
  if (!m) return
  linkTopic.value = m[2]
  const chat = Number(`-100${m[1]}`)
  if (linkChoices.value.some((c) => c.chat_id === chat)) linkChat.value = chat
}

function showLink(data: { is_enabled: boolean; chat_id: number | null; chat_title: string | null; topic_id: number | null }) {
  linkEnabled.value = data.is_enabled
  linkChat.value = data.chat_id
  linkTopic.value = data.topic_id ? String(data.topic_id) : ''
  linkSavedChat.value = data.chat_id ? { chat_id: data.chat_id, title: data.chat_title } : null
}

async function loadLink() {
  try {
    const [settings, chats] = await Promise.all([
      api.get('/group-link-post'),
      api.get('/group-link-post/chats'),
    ])
    linkChats.value = chats.data
    showLink(settings.data)
    linkLoaded.value = true
  } catch {
    linkMessage.value = 'Yuklab bo\'lmadi'
    linkMessageType.value = 'error'
  }
}

async function saveLink() {
  linkSaving.value = true
  linkMessage.value = ''
  try {
    const { data } = await api.put('/group-link-post', {
      is_enabled: linkEnabled.value,
      chat_id: linkChat.value,
      topic_id: linkChat.value && linkTopic.value ? Number(linkTopic.value) : null,
    })
    showLink(data)
    linkMessage.value = 'Saqlandi'
    linkMessageType.value = 'success'
    setTimeout(() => (linkMessage.value = ''), 3000)
  } catch (e: any) {
    const detail = e?.response?.data?.detail
    linkMessage.value = typeof detail === 'string' ? detail : 'Xatolik yuz berdi'
    linkMessageType.value = 'error'
  } finally {
    linkSaving.value = false
  }
}

const promptContent = ref('')
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const savedAt = ref('')

async function loadPrompt() {
  try {
    const { data } = await api.get('/prompt')
    promptContent.value = data.content
    if (data.updated_at) {
      savedAt.value = new Date(data.updated_at).toLocaleString('uz')
    }
  } catch {
    message.value = 'Prompt yuklab bo\'lmadi'
    messageType.value = 'error'
  }
}

async function savePrompt() {
  saving.value = true
  message.value = ''
  try {
    const { data } = await api.put('/prompt', { content: promptContent.value })
    message.value = 'Saqlandi'
    messageType.value = 'success'
    savedAt.value = new Date(data.updated_at).toLocaleString('uz')
    setTimeout(() => (message.value = ''), 3000)
  } catch {
    message.value = 'Xatolik yuz berdi'
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPrompt()
  loadPrayer()
  loadLeave()
  loadLink()
})
</script>

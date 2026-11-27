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
})
</script>

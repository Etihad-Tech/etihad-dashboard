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
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import api from '../../../api'

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

onMounted(loadPrompt)
</script>

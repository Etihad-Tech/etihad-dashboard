<template>
  <AppLayout>
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900 animate-fade-up">Sozlamalar</h2>

      <div class="bg-white rounded-3xl p-6 border border-gray-200 animate-fade-up" style="animation-delay: 30ms">
        <h3 class="text-base font-semibold text-gray-900 mb-1">System Prompt</h3>
        <p class="text-sm text-gray-500 mb-4">
          AI bot javob berishda foydalaniladigan system prompt. O'zgartirish darhol amal qiladi.
        </p>

        <textarea
          v-model="promptContent"
          rows="8"
          class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
          placeholder="System prompt yozing..."
        ></textarea>

        <div class="flex items-center justify-between mt-4">
          <p v-if="savedAt" class="text-xs text-gray-400">
            Oxirgi saqlangan: {{ savedAt }}
          </p>
          <div class="flex items-center gap-3">
            <p v-if="message" class="text-sm" :class="messageType === 'success' ? 'text-emerald-600' : 'text-red-500'">
              {{ message }}
            </p>
            <button
              @click="savePrompt"
              :disabled="saving"
              class="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors"
            >
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
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
    message.value = 'Saqlandi!'
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

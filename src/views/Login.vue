<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-200 p-8 animate-fade-up">
      <div class="flex justify-center mb-4">
        <img src="/logo.svg" alt="Etihad" class="w-12 h-12 rounded-full border border-amber-300/60 p-0.5" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 text-center mb-6">Etihad Dashboard</h1>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Login</label>
          <input
            v-model="username"
            type="text"
            required
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Foydalanuvchi nomi"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Parol</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Parol"
          />
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
        >
          {{ loading ? 'Kirish...' : 'Kirish' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const success = await auth.login(username.value, password.value)
    if (success) {
      router.push('/')
    } else {
      error.value = "Login yoki parol noto'g'ri"
    }
  } catch {
    error.value = "Server bilan bog'lanib bo'lmadi"
  } finally {
    loading.value = false
  }
}
</script>

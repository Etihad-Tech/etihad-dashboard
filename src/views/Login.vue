<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="card w-full max-w-sm p-7">
      <div class="flex flex-col items-center gap-3 mb-6">
        <img src="/logo.svg" alt="" class="w-12 h-12 rounded-full border border-amber-300/60 p-0.5" />
        <h1 class="text-xl font-semibold tracking-tight text-gray-900">Etihad</h1>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="label">Login</label>
          <input v-model="username" type="text" required autocomplete="username" class="input h-10" />
        </div>
        <div>
          <label class="label">Parol</label>
          <input v-model="password" type="password" required autocomplete="current-password" class="input h-10" />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button type="submit" :disabled="loading" class="btn btn-primary w-full h-10">
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

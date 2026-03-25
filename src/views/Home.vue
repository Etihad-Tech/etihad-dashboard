<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.svg" alt="Etihad" class="w-9 h-9 rounded-full border border-amber-300/60 p-0.5" />
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">Etihad Dashboard</h1>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span class="text-sm font-semibold text-amber-700">{{ displayInitial }}</span>
            </div>
            <span class="text-sm font-medium text-gray-700 hidden sm:block">{{ displayName }}</span>
          </div>
          <button
            @click="handleLogout"
            class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <font-awesome-icon icon="right-from-bracket" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-6">Boshqaruv panellari</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- AI Support Bot Card -->
        <router-link
          to="/ai"
          class="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-amber-300 hover:shadow-lg transition-all animate-fade-up"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <font-awesome-icon icon="comments" class="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                Etihad AI Support
              </h3>
              <p class="text-sm text-gray-500">AI qo'llab-quvvatlash boti</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-4">
            Murojaatlar, shablonlar, sozlamalar va statistikani boshqarish.
          </p>
          <div class="flex items-center text-sm font-medium text-amber-600 group-hover:text-amber-700">
            Boshqarish
            <svg class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>

        <!-- Etihad Jamoasi Card -->
        <router-link
          to="/team"
          class="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-amber-300 hover:shadow-lg transition-all animate-fade-up"
          style="animation-delay: 60ms"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <font-awesome-icon icon="users" class="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                Etihad Jamoasi
              </h3>
              <p class="text-sm text-gray-500">Turon Tour boshqaruv paneli</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-4">
            Safarlar, postlar, shablonlar, so'rovnomalar va eksportni boshqarish.
          </p>
          <div class="flex items-center text-sm font-medium text-amber-600 group-hover:text-amber-700">
            Boshqarish
            <svg class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const displayName = computed(() => {
  const u = auth.username
  if (!u) return 'Admin'
  if (u.includes('@')) return u.split('@')[0]
  return u
})

const displayInitial = computed(() => {
  return (displayName.value?.[0] || 'A').toUpperCase()
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

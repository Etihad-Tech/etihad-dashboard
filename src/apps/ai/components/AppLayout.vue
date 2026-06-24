<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
      @click="sidebarOpen = false"
    ></div>

    <aside
      class="fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="px-5 py-5 flex items-center gap-3">
        <img src="/logo.svg" alt="Etihad" class="w-8 h-8 rounded-full border border-amber-300/60 p-0.5" />
        <h1 class="text-lg font-bold text-gray-900 tracking-tight">Etihad AI Support</h1>
      </div>

      <nav class="flex-1 px-3 space-y-1.5">
        <router-link
          v-if="showHome"
          to="/"
          @click="sidebarOpen = false"
          class="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium border border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors mb-2"
        >
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
          Bosh sahifa
        </router-link>

        <router-link
          v-for="item in mainNav"
          :key="item.to"
          :to="item.to"
          @click="sidebarOpen = false"
          class="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium border transition-colors"
          :class="$route.path === item.to
            ? 'bg-amber-50 text-amber-700 border-amber-300'
            : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          <font-awesome-icon :icon="item.icon" class="w-4 h-4" />
          {{ item.label }}
        </router-link>

        <div class="pt-5 pb-2">
          <p class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Boshqaruv</p>
        </div>

        <router-link
          v-for="item in supportNav"
          :key="item.to"
          :to="item.to"
          @click="sidebarOpen = false"
          class="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium border transition-colors"
          :class="$route.path === item.to
            ? 'bg-amber-50 text-amber-700 border-amber-300'
            : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          <font-awesome-icon :icon="item.icon" class="w-4 h-4" />
          {{ item.label }}
        </router-link>
      </nav>

      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center gap-3 px-2">
          <div class="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <span class="text-sm font-semibold text-amber-700">{{ displayInitial }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate">{{ displayName }}</p>
            <p class="text-xs text-gray-400 truncate">{{ auth.username || '' }}</p>
          </div>
          <button
            @click="handleLogout"
            class="group relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <font-awesome-icon icon="right-from-bracket" class="w-4 h-4" />
            <span class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Chiqish</span>
          </button>
        </div>
      </div>
    </aside>

    <div class="sticky top-0 z-30 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
      <div class="flex items-center gap-3">
        <img src="/logo.svg" alt="Etihad" class="w-6 h-6 rounded-full border border-amber-300/60 p-0.5" />
        <span class="text-sm font-bold text-gray-900">Etihad AI Support</span>
      </div>
      <button
        @click="sidebarOpen = !sidebarOpen"
        class="relative w-8 h-8 flex items-center justify-center rounded-2xl text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <span class="sr-only">Menu</span>
        <span
          class="absolute w-5 h-0.5 bg-current rounded-full transition-all duration-300"
          :class="sidebarOpen ? 'rotate-45' : '-translate-y-1.5'"
        ></span>
        <span
          class="absolute w-5 h-0.5 bg-current rounded-full transition-all duration-300"
          :class="sidebarOpen ? 'opacity-0 scale-0' : 'opacity-100'"
        ></span>
        <span
          class="absolute w-5 h-0.5 bg-current rounded-full transition-all duration-300"
          :class="sidebarOpen ? '-rotate-45' : 'translate-y-1.5'"
        ></span>
      </button>
    </div>

    <main class="lg:ml-60 p-4 sm:p-6 lg:p-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const sidebarOpen = ref(false)

const displayName = computed(() => {
  const u = auth.username
  if (!u) return 'Admin'
  if (u.includes('@')) return u.split('@')[0]
  return u
})

const displayInitial = computed(() => {
  return (displayName.value?.[0] || 'A').toUpperCase()
})

const ALL_MAIN = [
  { to: '/ai', label: 'Dashboard', icon: 'chart-line' },
  { to: '/ai/messages', label: 'Murojaatlar', icon: 'comments' },
]

const ALL_SUPPORT = [
  { to: '/ai/settings', label: 'Sozlamalar', icon: 'gear' },
  { to: '/ai/templates', label: 'Shablonlar', icon: 'file-lines' },
  { to: '/ai/qa', label: 'Bilimlar bazasi', icon: 'circle-question' },
  { to: '/ai/reyslar', label: 'Reyslar', icon: 'plane' },
  { to: '/ai/staff', label: 'Xodimlar', icon: 'users' },
  { to: '/ai/ellikboshi', label: 'Ellikboshilar', icon: 'user' },
  { to: '/ai/groups', label: 'Guruhlar', icon: 'location-dot' },
  { to: '/ai/admins', label: 'Adminlar', icon: 'user-shield' },
  { to: '/ai/qora-royxat', label: "Qora ro'yxat", icon: 'user-slash' },
  { to: '/ai/yonaltirish', label: "Murojaat yo'naltirish", icon: 'tag' },
  { to: '/ai/videos', label: "Video yo'riqnomalar", icon: 'video' },
  { to: '/ai/redis', label: 'Redis Monitor', icon: 'database' },
]

// Role-limited managers see only their own panel; admin sees everything.
function allowed(to: string): boolean {
  if (auth.role === 'flight') return to === '/ai/reyslar'
  // qa: knowledge base + per-group hotel/tier setup (Guruhlar)
  if (auth.role === 'qa') return ['/ai/qa', '/ai/groups'].includes(to)
  // mingboshi: leaders + staff + inquiry routing
  if (auth.role === 'mingboshi') return ['/ai/ellikboshi', '/ai/staff', '/ai/yonaltirish'].includes(to)
  return true
}
const mainNav = computed(() => ALL_MAIN.filter(i => allowed(i.to)))
const supportNav = computed(() => ALL_SUPPORT.filter(i => allowed(i.to)))
// qa now also manages the main Guruhlar page ('/'), so it keeps the "Bosh sahifa" link.
const showHome = computed(() => auth.role !== 'flight' && auth.role !== 'mingboshi')

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <Transition name="fade">
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-gray-900/30 lg:hidden" @click="sidebarOpen = false"></div>
    </Transition>

    <aside
      class="fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200/80 flex flex-col transition-transform duration-200"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="h-14 px-4 flex items-center gap-2.5 shrink-0">
        <img src="/logo.svg" alt="" class="w-7 h-7 rounded-full border border-amber-300/60 p-0.5" />
        <span class="text-[15px] font-semibold tracking-tight">Etihad</span>
      </div>

      <nav class="flex-1 overflow-y-auto px-2.5 pb-4">
        <template v-for="group in visibleGroups" :key="group.title">
          <p v-if="group.title" class="px-2.5 pt-3.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{{ group.title }}</p>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            @click="sidebarOpen = false"
            class="flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13.5px] transition-colors"
            :class="isActive(item.to)
              ? 'bg-amber-50 text-amber-800 font-semibold'
              : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'"
          >
            <font-awesome-icon :icon="item.icon" class="w-4 h-4 shrink-0" :class="isActive(item.to) ? 'text-amber-600' : 'text-gray-400'" />
            <span class="truncate">{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <div class="p-2.5 border-t border-gray-100 shrink-0">
        <div class="flex items-center gap-2.5 px-2 py-1.5">
          <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <span class="text-xs font-semibold text-amber-700">{{ displayInitial }}</span>
          </div>
          <span class="text-sm font-medium text-gray-700 truncate flex-1">{{ displayName }}</span>
          <button @click="handleLogout" class="icon-btn icon-btn-danger" title="Chiqish">
            <font-awesome-icon icon="right-from-bracket" class="w-4 h-4" />
            <span class="sr-only">Chiqish</span>
          </button>
        </div>
      </div>
    </aside>

    <header
      v-if="!hideMobileChrome"
      class="sticky top-0 z-30 h-14 flex items-center gap-3 bg-white/90 backdrop-blur border-b border-gray-200/80 px-3 lg:hidden"
    >
      <button @click="sidebarOpen = true" class="icon-btn w-9 h-9 text-gray-600">
        <font-awesome-icon icon="bars" class="w-4 h-4" />
        <span class="sr-only">Menyu</span>
      </button>
      <span class="text-sm font-semibold truncate">{{ currentLabel }}</span>
    </header>

    <main class="lg:ml-60 lg:p-8" :class="hideMobileChrome ? 'lg:pt-8' : 'p-4 sm:p-6'">
      <div class="mx-auto max-w-[1400px]">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { roleAllows } from '../router'

// The one frame around every screen: the group overview, the AI support panels and the
// Etihad Jamoasi (Turon) panels share a single sidebar, so nothing is ever more than one
// click away. Which links a login sees is decided by the router's own rule.
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sidebarOpen = ref(false)

interface NavItem { to: string; label: string; icon: string }
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: '', items: [
    { to: '/', label: 'Guruhlar', icon: 'home' },
    { to: '/ai', label: 'Statistika', icon: 'chart-line' },
    { to: '/ai/messages', label: 'Murojaatlar', icon: 'comments' },
  ] },
  { title: 'Safar', items: [
    { to: '/ai/groups', label: 'Guruh sozlamalari', icon: 'location-dot' },
    { to: '/ai/hotels', label: 'Mehmonxonalar', icon: 'hotel' },
    { to: '/ai/umra-dasturi', label: 'Umra dasturi', icon: 'route' },
    { to: '/ai/reyslar', label: 'Reyslar', icon: 'plane' },
  ] },
  { title: 'Bot javoblari', items: [
    { to: '/ai/qa', label: 'Bilimlar bazasi', icon: 'circle-question' },
    { to: '/ai/yonaltirish', label: "Murojaat yo'naltirish", icon: 'tag' },
    { to: '/ai/videos', label: 'Videolar', icon: 'video' },
    { to: '/ai/templates', label: 'Shablonlar', icon: 'file-lines' },
  ] },
  { title: 'Xodimlar', items: [
    { to: '/ai/staff', label: 'Xodimlar', icon: 'users' },
    { to: '/ai/ellikboshi', label: 'Ellikboshilar', icon: 'user' },
    { to: '/ai/nazorat', label: 'Nazorat', icon: 'eye' },
    { to: '/ai/admins', label: 'Adminlar', icon: 'user-shield' },
    { to: '/ai/qora-royxat', label: "Qora ro'yxat", icon: 'user-slash' },
  ] },
  { title: 'Etihad Jamoasi', items: [
    { to: '/team', label: 'Umumiy', icon: 'chart-pie' },
    { to: '/team/trips', label: 'Safarlar', icon: 'plane-arrival' },
    { to: '/team/templates', label: 'Post shablonlari', icon: 'clone' },
    { to: '/team/polls', label: "So'rovnomalar", icon: 'list-ul' },
    { to: '/team/export', label: 'Eksport', icon: 'file-export' },
  ] },
  { title: 'Tizim', items: [
    { to: '/ai/settings', label: 'Sozlamalar', icon: 'gear' },
    { to: '/ai/audit-log', label: 'Audit jurnali', icon: 'clock-rotate-left' },
    { to: '/ai/redis', label: 'Redis', icon: 'database' },
  ] },
]

const visibleGroups = computed(() =>
  NAV_GROUPS
    .map(g => ({ title: g.title, items: g.items.filter(i => roleAllows(i.to, auth.role)) }))
    .filter(g => g.items.length > 0),
)

/** The item a path belongs to: the longest link it starts with, so /team/trips/7 lights
 *  «Safarlar» and /ai/nazorat/kpi lights «Nazorat», while «/» and «/ai» match only
 *  themselves. */
const activeTo = computed(() => {
  let best = ''
  for (const g of NAV_GROUPS) for (const i of g.items) {
    const hit = i.to === '/' || i.to === '/ai' || i.to === '/team'
      ? route.path === i.to
      : route.path === i.to || route.path.startsWith(i.to + '/')
    if (hit && i.to.length > best.length) best = i.to
  }
  return best
})
const isActive = (to: string) => activeTo.value === to

const currentLabel = computed(() => {
  for (const g of NAV_GROUPS) for (const i of g.items) if (i.to === activeTo.value) return i.label
  return 'Etihad'
})

const displayName = computed(() => {
  const u = auth.username
  if (!u) return 'Admin'
  return u.includes('@') ? u.split('@')[0] : u
})
const displayInitial = computed(() => (displayName.value?.[0] || 'A').toUpperCase())

// A controller's whole app is the Nazorat panel, which draws its own title bar and
// bottom tabs on a phone — a hamburger opening a drawer with one link would be dead
// weight there. The desktop sidebar stays.
const hideMobileChrome = computed(() => !!auth.role && auth.role.startsWith('nazoratchi'))

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

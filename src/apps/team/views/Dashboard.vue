<template>
  <AppLayout>
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900 animate-fade-up">Dashboard</h2>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" v-if="stats.data">
        <div
          v-for="(card, i) in statCards"
          :key="card.label"
          class="bg-white rounded-2xl p-4 border border-gray-200 animate-fade-up"
          :style="{ animationDelay: (i + 1) * 30 + 'ms' }"
        >
          <div class="flex items-center gap-3 mb-2">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" :class="card.bg">
              <font-awesome-icon :icon="card.icon" class="w-4 h-4" :class="card.iconColor" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ card.value }}</p>
          <p class="text-xs font-medium text-gray-400 mt-1">{{ card.label }}</p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up" style="animation-delay: 180ms">
        <router-link
          to="/team/trips"
          class="bg-white rounded-2xl border border-gray-200 p-5 hover:border-amber-300 transition-all group"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Safarlar</h3>
              <p class="text-xs text-gray-400 mt-1">Safarlarni boshqarish va ko'rish</p>
            </div>
            <font-awesome-icon icon="plane" class="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
          </div>
        </router-link>

        <router-link
          to="/team/templates"
          class="bg-white rounded-2xl border border-gray-200 p-5 hover:border-amber-300 transition-all group"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Shablonlar</h3>
              <p class="text-xs text-gray-400 mt-1">Post shablonlarini boshqarish</p>
            </div>
            <font-awesome-icon icon="file-lines" class="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
          </div>
        </router-link>

        <router-link
          to="/team/polls"
          class="bg-white rounded-2xl border border-gray-200 p-5 hover:border-amber-300 transition-all group"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">So'rovnomalar</h3>
              <p class="text-xs text-gray-400 mt-1">Savollar va javoblarni ko'rish</p>
            </div>
            <font-awesome-icon icon="chart-pie" class="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
          </div>
        </router-link>

        <router-link
          to="/team/export"
          class="bg-white rounded-2xl border border-gray-200 p-5 hover:border-amber-300 transition-all group"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Export</h3>
              <p class="text-xs text-gray-400 mt-1">Google Sheets ga eksport</p>
            </div>
            <font-awesome-icon icon="file-export" class="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
          </div>
        </router-link>
      </div>

      <!-- Loading -->
      <div v-if="stats.loading" class="flex justify-center py-12">
        <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { useTeamStatsStore } from '../stores/stats'

const stats = useTeamStatsStore()

const statCards = computed(() => {
  const d = stats.data
  if (!d) return []
  return [
    { label: 'Aktiv safarlar', value: d.active_trips, icon: 'plane', bg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { label: 'Arxiv safarlar', value: d.inactive_trips, icon: 'plane', bg: 'bg-gray-100', iconColor: 'text-gray-400' },
    { label: 'Foydalanuvchilar', value: d.total_users, icon: 'users', bg: 'bg-blue-50', iconColor: 'text-blue-500' },
    { label: 'Jami postlar', value: d.total_posts, icon: 'file-lines', bg: 'bg-amber-50', iconColor: 'text-amber-500' },
    { label: 'Kutilayotgan postlar', value: d.pending_posts, icon: 'calendar', bg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
    { label: 'Shablonlar', value: d.total_templates, icon: 'file-lines', bg: 'bg-purple-50', iconColor: 'text-purple-500' },
    { label: 'Savollar', value: d.total_questions, icon: 'chart-pie', bg: 'bg-rose-50', iconColor: 'text-rose-500' },
  ]
})

onMounted(() => stats.fetchStats())
</script>

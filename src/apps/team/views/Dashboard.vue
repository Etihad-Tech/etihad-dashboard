<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Etihad Jamoasi</h1>
      </div>

      <div v-if="stats.loading && !stats.data" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="stats.data" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <router-link v-for="card in statCards" :key="card.label" :to="card.to"
          class="card p-4 hover:border-amber-300 transition-colors">
          <p class="text-xs font-medium text-gray-500">{{ card.label }}</p>
          <p class="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{{ card.value }}</p>
        </router-link>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import { useTeamStatsStore } from '../stores/stats'

const stats = useTeamStatsStore()

// The numbers, each opening the screen it counts.
const statCards = computed(() => {
  const d = stats.data
  if (!d) return []
  return [
    { label: 'Aktiv safarlar', value: d.active_trips, to: '/team/trips' },
    { label: 'Arxiv safarlar', value: d.inactive_trips, to: '/team/trips' },
    { label: 'Foydalanuvchilar', value: d.total_users, to: '/team/trips' },
    { label: 'Jami postlar', value: d.total_posts, to: '/team/trips' },
    { label: 'Kutilayotgan postlar', value: d.pending_posts, to: '/team/trips' },
    { label: 'Shablonlar', value: d.total_templates, to: '/team/templates' },
    { label: 'Savollar', value: d.total_questions, to: '/team/polls' },
  ]
})

onMounted(() => stats.fetchStats())
</script>

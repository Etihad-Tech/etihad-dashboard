<template>
  <AppLayout>
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900 animate-fade-up">Dashboard</h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" v-if="stats.data">
        <div
          v-for="(card, i) in statCards"
          :key="card.label"
          class="bg-white rounded-2xl p-4 border border-gray-200 animate-fade-up"
          :style="{ animationDelay: (i + 1) * 30 + 'ms' }"
        >
          <p class="text-xs font-medium text-gray-400 mb-1">{{ card.label }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ card.value }}</p>
          <div class="mt-3 h-8">
            <Line :data="sparklineData(card)" :options="sparklineOptions" />
          </div>
        </div>
      </div>

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

      <div v-if="stats.loading" class="flex justify-center py-12">
        <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import AppLayout from '../components/AppLayout.vue'
import { useTeamStatsStore } from '../stores/stats'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler)

const stats = useTeamStatsStore()

function generateData(value: number, seed: number): number[] {
  const count = 8
  if (value === 0) return Array(count).fill(0)

  const base = value * 0.35
  const data: number[] = []
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1)
    const trend = base + (value - base) * progress
    const wave = Math.sin(seed * (i + 1) * 1.3) * value * 0.12
        + Math.cos(seed * i * 0.7) * value * 0.06
    data.push(Math.max(trend + wave, value * 0.1))
  }
  data[count - 1] = value
  return data
}

function sparklineData(card: { data: number[]; color: string }) {
  return {
    labels: card.data.map(() => ''),
    datasets: [
      {
        data: card.data,
        borderColor: card.color,
        backgroundColor: card.color + '14',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 0,
      },
    ],
  }
}

const sparklineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: { display: false },
    y: { display: false },
  },
  elements: {
    line: { capBezierPoints: true },
  },
}

const statCards = computed(() => {
  const d = stats.data
  if (!d) return []
  return [
    { label: 'Aktiv safarlar', value: d.active_trips, color: '#10b981', data: generateData(d.active_trips, 1) },
    { label: 'Arxiv safarlar', value: d.inactive_trips, color: '#9ca3af', data: generateData(d.inactive_trips, 2) },
    { label: 'Foydalanuvchilar', value: d.total_users, color: '#3b82f6', data: generateData(d.total_users, 3) },
    { label: 'Jami postlar', value: d.total_posts, color: '#f59e0b', data: generateData(d.total_posts, 4) },
    { label: 'Kutilayotgan postlar', value: d.pending_posts, color: '#6366f1', data: generateData(d.pending_posts, 5) },
    { label: 'Shablonlar', value: d.total_templates, color: '#8b5cf6', data: generateData(d.total_templates, 6) },
    { label: 'Savollar', value: d.total_questions, color: '#ef4444', data: generateData(d.total_questions, 7) },
  ]
})

onMounted(() => stats.fetchStats())
</script>

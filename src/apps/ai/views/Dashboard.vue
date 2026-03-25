<template>
   <AppLayout>
      <div class="space-y-6">
         <!-- Header -->
         <div class="flex items-center justify-between animate-fade-up">
            <h2 class="text-2xl font-bold text-gray-900">Dashboard</h2>
            <div class="flex items-center gap-2">
               <button v-for="p in periods" :key="p.value" @click="selectedPeriod = p.value"
                  class="px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border" :class="selectedPeriod === p.value
                     ? 'bg-amber-50 text-amber-700 border-amber-200'
                     : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'">
                  {{ p.label }}
               </button>
            </div>
         </div>

         <!-- Stats cards + Activity chart -->
         <div class="grid grid-cols-1 lg:grid-cols-12 gap-4" v-if="stats.data">
            <!-- Stat cards column -->
            <div class="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
               <div v-for="(card, i) in statCards" :key="card.label"
                  class="bg-white rounded-2xl p-4 border border-gray-200 animate-fade-up"
                  :style="{ animationDelay: (i + 1) * 30 + 'ms' }">
                  <p class="text-xs font-medium text-gray-400 mb-1">{{ card.label }}</p>
                  <p class="text-2xl font-bold text-gray-900">{{ card.value }}</p>
                  <div class="mt-3 h-8">
                     <svg viewBox="0 0 100 32" class="w-full h-full" preserveAspectRatio="none">
                        <path :d="sparklineFill(card.points)" :fill="card.color" opacity="0.08" />
                        <path :d="sparklinePath(card.points)" fill="none" :stroke="card.color" stroke-width="2"
                           stroke-linecap="round" stroke-linejoin="round" />
                     </svg>
                  </div>
               </div>
            </div>

            <!-- Activity chart -->
            <div class="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-200 animate-fade-up"
               style="animation-delay: 90ms">
               <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-semibold text-gray-900">Murojaatlar dinamikasi</h3>
                  <span class="text-xs text-gray-400">{{ periodLabel }}</span>
               </div>
               <div v-if="stats.data && stats.data.timeline.length > 0" class="h-52">
                  <Bar :data="chartData" :options="chartOptions" />
               </div>
               <p v-else class="text-gray-400 text-center py-12 text-sm">Ma'lumot yo'q</p>
            </div>
         </div>

         <!-- Category breakdown -->
         <div class="grid grid-cols-1 md:grid-cols-2 gap-4" v-if="stats.data">
            <!-- Kategoriyalar -->
            <div class="bg-white rounded-2xl p-6 border border-gray-200 animate-fade-up" style="animation-delay: 240ms">
               <h3 class="text-sm font-semibold text-gray-900 mb-4">Kategoriyalar bo'yicha</h3>
               <div class="space-y-4">
                  <div v-for="(count, cat) in stats.data.categories" :key="cat" class="flex items-center gap-3">
                     <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                           <span class="text-sm font-medium text-gray-700">{{ categoryLabel(cat as string) }}</span>
                           <span class="text-xs text-gray-400">{{ categoryPercent(count as number) }}%</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2">
                           <div class="h-2 rounded-full transition-all" :class="categoryBarColor(cat as string)"
                              :style="{ width: categoryPercent(count as number) + '%' }"></div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Guruhlar bo'yicha leaderboard -->
            <div class="bg-white rounded-2xl p-6 border border-gray-200 animate-fade-up" style="animation-delay: 270ms">
               <h3 class="text-sm font-semibold text-gray-900 mb-4">Guruhlar reytingi</h3>
               <div class="space-y-3">
                  <div v-for="(count, name, idx) in stats.data.groups" :key="name" class="flex items-center gap-3">
                     <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-xs font-bold text-gray-500">{{ (idx as number) + 1 }}</span>
                     </div>
                     <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{{ name }}</p>
                        <p class="text-xs text-gray-400">{{ count }} ta murojaat</p>
                     </div>
                     <div class="flex items-center gap-1">
                        <span class="text-sm font-semibold text-gray-900">{{ count }}</span>
                        <svg class="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                           <path fill-rule="evenodd"
                              d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
                              clip-rule="evenodd" />
                        </svg>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <!-- Loading -->
         <div v-if="stats.loading" class="flex justify-center py-12">
            <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
      </div>
   </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
   Chart as ChartJS,
   CategoryScale,
   LinearScale,
   BarElement,
   PointElement,
   LineElement,
   Title,
   Tooltip,
   Filler,
} from 'chart.js'
import AppLayout from '../components/AppLayout.vue'
import { useStatsStore } from '../stores/stats'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Filler)

const stats = useStatsStore()

const periods = [
   { value: 'day', label: 'Bugun' },
   { value: 'week', label: 'Hafta' },
   { value: 'month', label: 'Oy' },
]
const selectedPeriod = ref('day')

const periodLabel = computed(() => {
   return periods.find(p => p.value === selectedPeriod.value)?.label || ''
})

const statCards = computed(() => {
   const d = stats.data
   if (!d) return []
   return [
      { label: 'Jami murojaatlar', value: d.total, color: '#6366f1', points: timelinePoints.value },
      { label: "So'rovlar", value: d.categories?.sorov || 0, color: '#3b82f6', points: categoryPoints('sorov') },
      { label: 'Muammolar', value: d.categories?.muammo || 0, color: '#f59e0b', points: categoryPoints('muammo') },
      { label: "E'tirozlar", value: d.categories?.etiroz || 0, color: '#ef4444', points: categoryPoints('etiroz') },
      { label: 'Boshqa', value: d.categories?.uncategorized || 0, color: '#9ca3af', points: categoryPoints('uncategorized') },
      { label: 'Guruhlar soni', value: Object.keys(d.groups || {}).length, color: '#10b981', points: timelinePoints.value },
   ]
})

function categoryLabel(cat: string): string {
   const labels: Record<string, string> = {
      sorov: "So'rovlar",
      muammo: 'Muammolar',
      etiroz: "E'tirozlar",
      uncategorized: 'Boshqa',
   }
   return labels[cat] || cat
}

function categoryBarColor(cat: string): string {
   const colors: Record<string, string> = {
      sorov: 'bg-blue-500',
      muammo: 'bg-amber-500',
      etiroz: 'bg-red-500',
      uncategorized: 'bg-gray-400',
   }
   return colors[cat] || 'bg-gray-400'
}

function categoryPercent(count: number): number {
   const total = stats.data?.total || 1
   return Math.round((count / total) * 100)
}

function countsToPoints(counts: number[]): { x: number; y: number }[] {
   if (counts.length === 0) return [{ x: 0, y: 28 }, { x: 100, y: 28 }]
   if (counts.length === 1) return [{ x: 0, y: 16 }, { x: 100, y: 16 }]

   const max = Math.max(...counts, 1)
   const step = 100 / (counts.length - 1)

   return counts.map((v, i) => ({
      x: i * step,
      y: 30 - (v / max) * 28 + 2,
   }))
}

function sparklinePath(points: { x: number; y: number }[]): string {
   if (points.length < 2) return ''
   const p0 = points[0]
   if (p0 === undefined) return ''
   let d = `M${p0.x},${p0.y}`
   for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      if (prev === undefined || curr === undefined) continue
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4
      d += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`
   }
   return d
}

function sparklineFill(points: { x: number; y: number }[]): string {
   const line = sparklinePath(points)
   if (!line) return ''
   const last = points[points.length - 1]
   const first = points[0]
   if (last === undefined || first === undefined) return line
   return `${line} L${last.x},32 L${first.x},32 Z`
}

const timelinePoints = computed(() => {
   const timeline = stats.data?.timeline || []
   return countsToPoints(timeline.map(t => t.count))
})

function categoryPoints(cat: string) {
   const ct = stats.data?.category_timelines?.[cat] || []
   return countsToPoints(ct.map(t => t.count))
}

const chartData = computed(() => {
   const timeline = stats.data?.timeline || []
   return {
      labels: timeline.map((t) => {
         const d = new Date(t.period)
         return selectedPeriod.value === 'day'
            ? d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString('uz', { day: '2-digit', month: '2-digit' })
      }),
      datasets: [
         {
            label: 'Murojaatlar',
            data: timeline.map((t) => t.count),
            backgroundColor: 'rgba(217, 170, 56, 0.85)',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.6,
         },
      ],
   }
})

const chartOptions = {
   responsive: true,
   maintainAspectRatio: false,
   plugins: { legend: { display: false } },
   scales: {
      x: {
         grid: { display: false },
         ticks: { color: '#9ca3af', font: { size: 11 } },
         border: { display: false },
      },
      y: {
         grid: { color: 'rgba(0,0,0,0.04)' },
         ticks: { color: '#9ca3af', font: { size: 11 }, stepSize: 1 },
         border: { display: false },
         beginAtZero: true,
      },
   },
}

onMounted(() => stats.fetchStats(selectedPeriod.value))
watch(selectedPeriod, (val) => stats.fetchStats(val))
</script>
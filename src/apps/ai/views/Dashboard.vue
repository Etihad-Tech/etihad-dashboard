<template>
   <AppLayout>
      <div class="space-y-6">
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

         <div class="grid grid-cols-1 lg:grid-cols-12 gap-4" v-if="stats.data">
            <div class="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
               <div v-for="(card, i) in statCards" :key="card.label"
                  class="bg-white rounded-2xl p-4 border border-gray-200 animate-fade-up"
                  :style="{ animationDelay: (i + 1) * 30 + 'ms' }">
                  <p class="text-xs font-medium text-gray-400 mb-1">{{ card.label }}</p>
                  <p class="text-2xl font-bold text-gray-900">{{ card.value }}</p>
                  <div class="mt-3 h-8">
                     <Line :data="sparklineData(card)" :options="sparklineOptions" />
                  </div>
               </div>
            </div>

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

         <div class="grid grid-cols-1 md:grid-cols-2 gap-4" v-if="stats.data">
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

         <div v-if="stats.loading" class="flex justify-center py-12">
            <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
      </div>
   </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { Bar, Line } from 'vue-chartjs'
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
      { label: 'Jami murojaatlar', value: d.total, color: '#6366f1', data: timelineData.value },
      { label: "So'rovlar", value: d.categories?.sorov || 0, color: '#3b82f6', data: categoryData('sorov') },
      { label: 'Muammolar', value: d.categories?.muammo || 0, color: '#f59e0b', data: categoryData('muammo') },
      { label: "E'tirozlar", value: d.categories?.etiroz || 0, color: '#ef4444', data: categoryData('etiroz') },
      { label: 'Boshqa', value: d.categories?.uncategorized || 0, color: '#9ca3af', data: categoryData('uncategorized') },
      { label: 'Guruhlar soni', value: Object.keys(d.groups || {}).length, color: '#10b981', data: timelineData.value },
   ]
})

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
}

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

function ensureData(counts: number[]): number[] {
   if (counts.length >= 2) return counts
   return counts.length === 1 ? [counts[0], counts[0]] : [0, 0]
}

const timelineData = computed(() => {
   const timeline = stats.data?.timeline || []
   return ensureData(timeline.map(t => t.count))
})

function categoryData(cat: string): number[] {
   const ct = stats.data?.category_timelines?.[cat] || []
   return ensureData(ct.map(t => t.count))
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
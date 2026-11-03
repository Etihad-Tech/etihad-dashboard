<template>
   <AppShell>
      <div class="page">
         <div class="page-head">
            <h1 class="page-title">Statistika</h1>
            <div class="seg">
               <button v-for="p in periods" :key="p.value" class="seg-btn"
                  :class="{ 'seg-btn-on': selectedPeriod === p.value }" @click="selectedPeriod = p.value">
                  {{ p.label }}
               </button>
            </div>
         </div>

         <div v-if="stats.data" class="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div class="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
               <div v-for="card in statCards" :key="card.label" class="card p-4">
                  <p class="text-xs font-medium text-gray-500 truncate">{{ card.label }}</p>
                  <p class="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{{ card.value }}</p>
                  <div class="mt-2 h-8">
                     <Line :data="sparklineData(card)" :options="sparklineOptions" />
                  </div>
               </div>
            </div>

            <div class="lg:col-span-7 card p-5">
               <div class="flex items-center justify-between mb-4">
                  <h3 class="section-title">Murojaatlar</h3>
                  <span class="text-xs text-gray-400">{{ periodLabel }}</span>
               </div>
               <div v-if="stats.data.timeline.length > 0" class="h-52">
                  <Bar :data="chartData" :options="chartOptions" />
               </div>
               <p v-else class="empty">Ma'lumot yo'q</p>
            </div>
         </div>

         <div v-if="stats.data" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="card p-5">
               <h3 class="section-title mb-4">Kategoriyalar</h3>
               <div class="space-y-3.5">
                  <div v-for="(count, cat) in stats.data.categories" :key="cat">
                     <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-medium text-gray-700">{{ categoryLabel(cat as string) }}</span>
                        <span class="text-xs text-gray-500 tabular-nums">{{ count }} · {{ categoryPercent(count as number) }}%</span>
                     </div>
                     <div class="w-full bg-gray-100 rounded-full h-1.5">
                        <div class="h-1.5 rounded-full transition-all" :class="categoryBarColor(cat as string)"
                           :style="{ width: categoryPercent(count as number) + '%' }"></div>
                     </div>
                  </div>
               </div>
            </div>

            <div class="card p-5">
               <h3 class="section-title mb-3">Guruhlar</h3>
               <div class="divide-y divide-gray-100">
                  <div v-for="(count, name, idx) in stats.data.groups" :key="name" class="flex items-center gap-3 py-2">
                     <span class="w-6 text-xs font-semibold text-gray-400 tabular-nums">{{ (idx as number) + 1 }}</span>
                     <p class="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{{ name }}</p>
                     <span class="text-sm font-semibold text-gray-900 tabular-nums">{{ count }}</span>
                  </div>
               </div>
            </div>
         </div>

         <div v-if="stats.loading" class="flex justify-center py-12"><div class="spinner"></div></div>
      </div>
   </AppShell>
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
import AppShell from '../../../components/AppShell.vue'
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
<template>
   <AppLayout>
      <div class="space-y-6">
         <div class="flex items-center justify-between gap-4 flex-wrap animate-fade-up">
            <div>
               <h2 class="text-2xl font-bold text-gray-900">Nazorat</h2>
               <p class="text-sm text-gray-500 mt-1">
                  Xodimlar va ellikboshilar murojaatlarni qanday bajarayotgani — dalillar bilan
               </p>
            </div>
            <div class="flex items-center gap-2">
               <div class="flex gap-1 bg-gray-100 rounded-xl p-1">
                  <button v-for="p in PERIODS" :key="p.value" @click="setPeriod(p.value)"
                     class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                     :class="period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'">
                     {{ p.label }}
                  </button>
               </div>
            </div>
         </div>

         <div v-if="loading" class="flex justify-center py-12">
            <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
         </div>

         <template v-else>
            <!-- headline numbers -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up">
               <div v-for="(c, i) in cards" :key="i" class="bg-white rounded-2xl border border-gray-200 p-4">
                  <p class="text-xs text-gray-500">{{ c.label }}</p>
                  <p class="text-2xl font-bold mt-1" :class="c.tone">{{ c.value }}</p>
                  <p v-if="c.hint" class="text-[11px] text-gray-400 mt-1">{{ c.hint }}</p>
               </div>
            </div>

            <!-- trend: how the buckets move over time (line graph, not just totals) -->
            <div class="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 animate-fade-up">
               <div class="flex items-baseline justify-between gap-3 mb-4">
                  <div>
                     <h3 class="text-sm font-semibold text-gray-900">Vaqt bo'yicha dinamika</h3>
                     <p class="text-[11px] text-gray-400 mt-0.5">
                        {{ period === 'day' ? 'Soatlar' : 'Kunlar' }} bo'yicha holatlar
                     </p>
                  </div>
               </div>
               <div v-if="trendLabels.length" class="h-56 sm:h-72">
                  <Line :data="trendData" :options="trendOptions" :plugins="[crosshairPlugin]" />
               </div>
               <div v-else class="py-12 text-center text-gray-400 text-sm">
                  Bu davr uchun ma'lumot yo'q
               </div>
            </div>

            <div v-if="report && report.undelivered"
               class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 animate-fade-up">
               <p class="font-medium mb-1">{{ report.undelivered }} ta xabar yetib bormadi</p>
               <p class="text-amber-700">
                  Bu xodimlar botni «Start» qilmagan — ularning javob bermagani o'zlarining aybi emas
                  va hisobotda ularga yozilmaydi.
               </p>
            </div>

            <!-- #4: active staff the bot can't reach yet (never pressed Start) -->
            <div v-if="staffReadiness.length"
               class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm animate-fade-up">
               <p class="font-medium text-red-800 mb-1">
                  {{ staffReadiness.length }} ta faol xodimga DM yuborib bo'lmaydi
               </p>
               <p class="text-red-700 mb-2">
                  Ular botni «Start» qilmagan — murojaatlar ularga umuman bormaydi. Har biri botga
                  <code class="bg-white px-1 rounded">/start</code> yozishi kerak.
               </p>
               <div class="flex flex-wrap gap-1.5">
                  <span v-for="(s, i) in staffReadiness" :key="i"
                     class="text-xs px-2 py-0.5 bg-white border border-red-200 rounded-lg text-red-700">
                     {{ s.username || s.name || '—' }} · {{ s.location }}
                  </span>
               </div>
            </div>

            <!-- #1: confirmed bot mistakes, broken down by kind -->
            <div v-if="errorKinds.length"
               class="bg-white rounded-2xl border border-gray-200 p-4 animate-fade-up">
               <h3 class="text-sm font-semibold text-gray-900 mb-3">Bot xatolari — turlari bo'yicha</h3>
               <div class="space-y-2">
                  <div v-for="k in errorKinds" :key="k.label" class="flex items-center gap-3">
                     <span class="text-xs text-gray-600 w-40 shrink-0">{{ k.label }}</span>
                     <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div class="bg-indigo-500 h-full rounded-full"
                           :style="{ width: (report && report.bot_mistakes ? (k.count / report.bot_mistakes * 100) : 0) + '%' }"></div>
                     </div>
                     <span class="text-xs font-semibold text-gray-900 w-6 text-right">{{ k.count }}</span>
                  </div>
               </div>
            </div>

            <!-- per-worker evidence sheet -->
            <div class="animate-fade-up">
               <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 class="text-base font-semibold text-gray-900">Xodimlar nazorati</h3>
                  <div class="flex flex-wrap items-center gap-2">
                     <select v-model="filterRole"
                        class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white">
                        <option value="">Barcha lavozimlar</option>
                        <option value="staff">Xodim</option>
                        <option value="ellikboshi">Ellikboshi</option>
                     </select>
                     <select v-model="filterName"
                        class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white max-w-[180px]">
                        <option value="">Barcha ismlar</option>
                        <option v-for="n in workerNameOptions" :key="n" :value="n">{{ n }}</option>
                     </select>
                  </div>
               </div>
               <div v-if="filteredWorkers.length === 0"
                  class="bg-white rounded-2xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
                  {{ workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan' : 'Filtrga mos xodim topilmadi' }}
               </div>
               <div v-else class="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                  <table class="w-full text-sm min-w-[640px]">
                     <thead>
                        <tr class="text-left text-xs text-gray-500 border-b border-gray-100">
                           <th class="px-4 py-3 font-medium">Username</th>
                           <th class="px-3 py-3 font-medium">Lavozim</th>
                           <th class="px-4 py-3 font-medium">Ism</th>
                           <th class="px-3 py-3 font-medium text-center">Murojaatlar</th>
                           <th class="px-3 py-3 font-medium text-center">Qabul</th>
                           <th class="px-3 py-3 font-medium text-center" title="Yetib borgan, lekin xodim qabul qilmagan">Javobsiz</th>
                           <th class="px-3 py-3 font-medium text-center" title="Qabul qilindi, ziyoratchi qayta so'ramadi">Bajarildi</th>
                           <th class="px-3 py-3 font-medium text-center" title="Ikkinchi marta so'ralgan, xodim qabul qilgan">Qayta so'rov</th>
                           <th class="px-3 py-3 font-medium text-center" title="Qabul qilingan, lekin ziyoratchi qayta so'ragan — hal bo'lmagan">Qayta so'ralgan</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="w in filteredWorkers" :key="w.telegram_id"
                           class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                           <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              {{ w.username || ('ID ' + w.telegram_id) }}
                           </td>
                           <td class="px-3 py-3">
                              <span class="text-xs px-2 py-0.5 rounded-lg"
                                 :class="w.role === 'ellikboshi' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'">
                                 {{ w.role === 'ellikboshi' ? 'Ellikboshi' : 'Xodim' }}
                              </span>
                           </td>
                           <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ w.name || '—' }}</td>
                           <td class="px-3 py-3 text-center text-gray-600">{{ w.dms }}</td>
                           <td class="px-3 py-3 text-center text-gray-600">{{ w.accepted }}</td>
                           <td class="px-3 py-3 text-center"
                              :class="w.never_accepted ? 'text-blue-600 font-semibold' : 'text-gray-400'">
                              {{ w.never_accepted }}
                           </td>
                           <td class="px-3 py-3 text-center"
                              :class="w.completed ? 'text-emerald-600 font-semibold' : 'text-gray-400'">
                              {{ w.completed }}
                           </td>
                           <td class="px-3 py-3 text-center"
                              :class="w.re_requests ? 'text-amber-600 font-semibold' : 'text-gray-400'">
                              {{ w.re_requests }}
                           </td>
                           <td class="px-3 py-3 text-center"
                              :class="w.reopened ? 'text-red-600 font-semibold' : 'text-gray-400'">
                              {{ w.reopened }}
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>

            <!-- drill-down -->
            <div class="animate-fade-up">
               <div class="flex items-center justify-between mb-3">
                  <h3 class="text-base font-semibold text-gray-900">Har bir xodim bo'yicha jurnal</h3>
                  <button @click="showRequests = !showRequests"
                     class="text-xs font-medium text-gray-500 hover:text-gray-800">
                     {{ showRequests ? 'Yashirish' : 'Ko\'rsatish' }}
                  </button>
               </div>
               <div v-if="showRequests">
                  <div v-if="staffLogs.length === 0"
                     class="bg-white rounded-2xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
                     {{ workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan' : 'Filtrga mos xodim topilmadi' }}
                  </div>
                  <!-- compact list of names; tap a name to open that xodim's log -->
                  <div v-else class="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                     <div v-for="s in staffLogs" :key="s.telegram_id">
                        <button type="button" @click="toggleStaff(s.telegram_id)"
                           class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50">
                           <span class="flex items-center gap-2 min-w-0">
                              <span class="text-gray-400 text-xs w-3 shrink-0">{{ expandedStaff.has(s.telegram_id) ? '▾' : '▸' }}</span>
                              <span class="text-sm font-semibold text-gray-900 truncate">
                                 {{ s.name || s.username || ('ID ' + s.telegram_id) }}
                              </span>
                              <span class="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                 :class="s.role === 'ellikboshi' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'">
                                 {{ s.role === 'ellikboshi' ? 'Ellikboshi' : 'Xodim' }}
                              </span>
                           </span>
                           <span class="text-xs text-gray-400 shrink-0">{{ s.entries.length }} ta murojaat</span>
                        </button>
                        <div v-if="expandedStaff.has(s.telegram_id)" class="px-4 pb-3 pt-1 space-y-3 bg-gray-50/50">
                           <div v-for="(e, i) in s.entries" :key="i"
                              class="border-l-2 pl-3"
                              :class="e.parent_request_id && !e.reopen_dismissed ? 'border-amber-200' : 'border-gray-200'">
                              <p class="text-sm text-gray-900">
                                 <span v-if="e.parent_request_id && !e.reopen_dismissed" class="text-amber-600 font-medium">🔁 Qayta so'rov · </span>
                                 {{ e.text || '—' }}
                              </p>
                              <p class="text-xs mt-0.5" :class="e.sum.tone">
                                 {{ e.sum.text }}
                                 <a v-if="e.message_link" :href="e.message_link" target="_blank"
                                    class="text-amber-600 hover:underline ml-1 whitespace-nowrap">Xabarni ko'rish</a>
                                 <button v-if="e.parent_request_id && !e.reopen_dismissed"
                                    @click="dismissReopen(e.id)"
                                    class="text-gray-400 hover:text-gray-700 hover:underline ml-2 whitespace-nowrap"
                                    title="Bu aslida takror emas — noto'g'ri aniqlangan qayta so'rovni bekor qiladi (asl murojaat yana «bajarildi» bo'ladi)">
                                    Takror emas
                                 </button>
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- tuning -->
            <div class="bg-white rounded-2xl border border-gray-200 p-5 animate-fade-up">
               <h3 class="text-base font-semibold text-gray-900 mb-1">Sozlamalar</h3>
               <p class="text-xs text-gray-500 mb-4">
                  Bir xil so'rov qayta kelganda: xodim uchun oyna tugagach — yangi so'rov;
                  ellikboshi uchun 0 = hech qachon tugamaydi (doim hal qilinmagan deb sanaladi).
               </p>
               <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">Xodim oynasi (soat)</label>
                     <input v-model.number="form.staff_repeat_window_hours" type="number" min="0"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">Ellikboshi oynasi (soat, 0 = cheksiz)</label>
                     <input v-model.number="form.ellikboshi_repeat_window_hours" type="number" min="0"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">IT guruh ID</label>
                     <input v-model.number="form.it_group_id" type="number"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">IT mavzu (topic) ID</label>
                     <input v-model.number="form.it_topic_id" type="number"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
               </div>
               <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <button @click="form.is_enabled = !form.is_enabled"
                     class="flex items-center gap-2 text-sm font-medium transition-colors"
                     :class="form.is_enabled ? 'text-emerald-600' : 'text-gray-400'">
                     <font-awesome-icon :icon="form.is_enabled ? 'toggle-on' : 'toggle-off'" class="w-5 h-5" />
                     {{ form.is_enabled ? 'Nazorat yoqilgan' : 'Nazorat o\'chirilgan' }}
                  </button>
                  <button @click="save" :disabled="saving"
                     class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
                     {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
                  </button>
               </div>
               <p v-if="savedMsg" class="text-xs text-emerald-600 mt-2">{{ savedMsg }}</p>
            </div>
         </template>
      </div>
   </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
   Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
   Tooltip, Legend, Filler, type ChartOptions, type Plugin,
} from 'chart.js'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface Report {
   requests: number; dms: number; delivered: number; undelivered: number
   accepted: number; never_accepted: number; completed: number; re_requests: number
   reopened: number; avg_response_seconds: number | null
   flagged: number; bot_mistakes: number; flags_neutral: number; flags_pending: number
   error_kinds: Record<string, number>
}
interface Worker {
   telegram_id: number; username: string | null; name: string | null; role: string
   dms: number; undelivered: number; accepted: number; never_accepted: number
   completed: number; re_requests: number; reopened: number; released: number
   flagged: number; flags_confirmed: number; flags_neutral: number
   avg_response_seconds: number | null
}
interface StaffReady { role: string; location: string; username: string | null; name: string | null }

// Xatolik taxonomy labels — codes mirror server IT_ERROR_KINDS (bot/services/control.py).
const KIND_LABELS: Record<string, string> = {
   wp: "Noto'g'ri shaxs",
   nr: "So'rov emas",
   wl: "Noto'g'ri shahar/xona",
   wa: "Javob noto'g'ri",
   unlabeled: 'Turi belgilanmagan',
}

const PERIODS = [
   { value: 'day', label: 'Kunlik' },
   { value: 'week', label: 'Haftalik' },
   { value: 'month', label: 'Oylik' },
]

const period = ref('day')
const loading = ref(false)
const saving = ref(false)
const savedMsg = ref('')
const showRequests = ref(true)
const report = ref<Report | null>(null)
const workers = ref<Worker[]>([])
const timeseries = ref<{ period: string; completed: number; re_requests: number; reopened: number; never_accepted: number }[]>([])
const filterRole = ref('')          // '' = all, else 'staff' | 'ellikboshi'
const filterName = ref('')          // matches name OR username (case-insensitive)
const requests = ref<any[]>([])
const staffReadiness = ref<StaffReady[]>([])
const form = ref({
   staff_repeat_window_hours: 6,
   ellikboshi_repeat_window_hours: 0,
   it_group_id: null as number | null,
   it_topic_id: null as number | null,
   is_enabled: true,
})

/** Seconds -> a short Uzbek duration ("2 soat 5 daq"). null when never measured. */
function dur(s: number | null): string {
   if (s === null || s === undefined) return '—'
   if (s < 60) return `${Math.round(s)} soniya`
   const m = Math.floor(s / 60)
   if (m < 60) return `${m} daq`
   const h = Math.floor(m / 60)
   const rem = m % 60
   return rem ? `${h} soat ${rem} daq` : `${h} soat`
}

function fmtTime(iso: string | null): string {
   if (!iso) return '—'
   return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

const cards = computed(() => {
   const r = report.value
   if (!r) return []
   return [
      { label: 'Murojaatlar', value: r.requests, tone: 'text-gray-900' },
      {
         label: 'Bajarildi', value: r.completed, tone: 'text-emerald-600',
         hint: 'Qabul qilindi, ziyoratchi qayta so\'ramadi',
      },
      {
         label: 'Qayta so\'rov', value: r.re_requests,
         tone: r.re_requests ? 'text-amber-600' : 'text-gray-900',
         hint: 'Ikkinchi marta so\'ralgan, qabul qilingan',
      },
      {
         label: 'Qayta so\'ralgan', value: r.reopened, tone: r.reopened ? 'text-red-600' : 'text-gray-900',
         hint: 'Qabul qilingan, lekin hal bo\'lmagan',
      },
      {
         label: 'Javobsiz qolgan', value: r.never_accepted,
         tone: r.never_accepted ? 'text-blue-600' : 'text-gray-900',
         hint: 'Yetib borgan, lekin qabul qilinmagan',
      },
      { label: 'O\'rtacha javob vaqti', value: dur(r.avg_response_seconds), tone: 'text-gray-900' },
      {
         label: 'Bot xatosi (tasdiqlangan)', value: r.bot_mistakes, tone: 'text-indigo-600',
         hint: r.flags_pending ? `${r.flags_pending} ta kutilmoqda` : '',
      },
      {
         label: 'Asossiz «Xatolik»', value: r.flags_neutral,
         tone: r.flags_neutral ? 'text-red-600' : 'text-gray-900',
         hint: 'IT neytral deb topgan',
      },
   ]
})

// The trend line — the same four colour buckets as the cards, but over time. Colours
// mirror the card tones: 🟢 completed, 🟡 re_requests, 🔴 reopened, 🔵 never_accepted.
const TREND_SERIES = [
   { key: 'completed', label: 'Bajarildi', color: '#10b981' },
   { key: 're_requests', label: "Qayta so'rov", color: '#f59e0b' },
   { key: 'reopened', label: "Qayta so'ralgan", color: '#ef4444' },
   { key: 'never_accepted', label: 'Javobsiz', color: '#3b82f6' },
] as const

/** X-axis labels: hour for the day period, else day/month — matching the Dashboard. */
const trendLabels = computed(() =>
   timeseries.value.map((t) => {
      const d = new Date(t.period)
      return period.value === 'day'
         ? d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
         : d.toLocaleDateString('uz', { day: '2-digit', month: '2-digit' })
   }),
)

const trendData = computed(() => ({
   labels: trendLabels.value,
   datasets: TREND_SERIES.map((s) => ({
      label: s.label,
      data: timeseries.value.map((t) => t[s.key] ?? 0),
      borderColor: s.color,
      backgroundColor: s.color,
      pointBackgroundColor: s.color,
      pointBorderWidth: 0,
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 3,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.4,
      fill: false,
      borderCapStyle: 'round' as CanvasLineCap,
      borderJoinStyle: 'round' as CanvasLineJoin,
   })),
}))

const trendOptions: ChartOptions<'line'> = {
   responsive: true,
   maintainAspectRatio: false,
   layout: { padding: { top: 4, right: 6 } },
   interaction: { mode: 'index', intersect: false, axis: 'x' },
   plugins: {
      legend: {
         position: 'top',
         align: 'end',
         labels: {
            usePointStyle: true, pointStyle: 'circle',
            boxWidth: 7, boxHeight: 7, padding: 16,
            color: '#6b7280', font: { size: 11, weight: 500 },
         },
      },
      tooltip: {
         backgroundColor: 'rgba(17, 24, 39, 0.96)',
         padding: 12, cornerRadius: 12,
         titleColor: '#9ca3af', titleFont: { size: 11, weight: 600 },
         bodyColor: '#f9fafb', bodyFont: { size: 12, weight: 500 },
         bodySpacing: 6, boxPadding: 6, usePointStyle: true,
         caretSize: 6, caretPadding: 10,
         borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1,
      },
   },
   scales: {
      x: {
         grid: { display: false },
         border: { display: false },
         ticks: { color: '#9ca3af', font: { size: 11 }, padding: 8 },
      },
      y: {
         beginAtZero: true, grace: '25%',
         border: { display: false },
         grid: { color: 'rgba(17, 24, 39, 0.05)' },
         ticks: { color: '#9ca3af', font: { size: 11 }, padding: 10, stepSize: 1, precision: 0 },
      },
   },
}

// A soft dashed vertical guide at the hovered point — pairs with the index tooltip so all
// four series read at the same moment (a small touch that lifts the chart out of the
// chart.js defaults). Drawn under the points, over the lines.
const crosshairPlugin: Plugin<'line'> = {
   id: 'nazoratCrosshair',
   afterDatasetsDraw(chart) {
      const first = chart.getActiveElements()[0]
      if (!first) return
      const x = (first.element as PointElement).x
      const { ctx, chartArea } = chart
      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.16)'
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
      ctx.restore()
   },
}

/** Display label for a worker/recipient — the DASHBOARD name if entered, else @username. */
function personLabel(p: { name?: string | null; username?: string | null; telegram_id: number }): string {
   return p.name || p.username || ('ID ' + p.telegram_id)
}

/** Distinct worker labels for the "filter by name" dropdown. */
const workerNameOptions = computed(() =>
   [...new Set(workers.value.map(personLabel))].sort((a, b) => a.localeCompare(b)),
)

/** Workers filtered by the lavozim (role) dropdown and the chosen name. */
const filteredWorkers = computed(() =>
   workers.value.filter((w) => {
      if (filterRole.value && w.role !== filterRole.value) return false
      if (filterName.value && personLabel(w) !== filterName.value) return false
      return true
   }),
)

/** Human duration between two timestamps; if `toIso` is null, measures up to NOW (still open). */
function durBetween(fromIso: string | null, toIso: string | null): string {
   if (!fromIso) return '—'
   const to = toIso ? new Date(toIso).getTime() : Date.now()
   return dur(Math.max(0, Math.round((to - new Date(fromIso).getTime()) / 1000)))
}

/** One request turned into a plain Uzbek sentence an ordinary reader understands, plus a
 *  colour tone. Accept is terminal (no solve step): once a worker takes a need it counts
 *  as done (🟢 bajarildi) UNTIL the pilgrim asks again, which turns it 🔴 hal bo'lmagan.
 *  Covers every state: not-delivered, Xatolik, taken-by-another, 🔵 javobsiz,
 *  🟢 completed, 🟡 accepted-re-request, 🔴 reopened. */
function entrySummary(e: any): { text: string; tone: string } {
   const sent = fmtTime(e.dm_sent_at)
   if (!e.delivered)
      return { text: 'Xodimga yetib bormadi.', tone: 'text-gray-400' }
   if (e.flagged_at)
      return {
         text: `${sent} da yuborildi. Xodim «Xatolik» deb belgiladi`
            + (e.it_verdict ? ` (IT: ${e.it_verdict}).` : " (IT hali ko'rmagan)."),
         tone: 'text-indigo-600',
      }
   if (e.released_at) {
      const c = e.claimed_by
      const verb = c && c.flagged ? '«Xatolik» deb belgiladi' : 'qabul qildi'
      return {
         text: `${sent} da yuborildi. Boshqa xodim ${verb}${c ? ` (${c.name})` : ''}.`,
         tone: 'text-gray-400',
      }
   }
   if (!e.accepted_at)   // 🔵 delivered but never taken
      return {
         text: `${sent} da yuborildi. Xodim hali qabul qilmadi (javobsiz: ${durBetween(e.dm_sent_at, null)}).`,
         tone: 'text-blue-600',
      }
   const acc = fmtTime(e.accepted_at)
   const wait = durBetween(e.dm_sent_at, e.accepted_at)
   if (e.reopened_count > 0)   // 🔴 accepted, but the pilgrim came back -> false completion
      return {
         text: `${sent} da yuborildi. Xodim ${acc} da qabul qildi (${wait}), LEKIN ziyoratchi qayta so'radi — hal bo'lmagan.`,
         tone: 'text-red-600',
      }
   if (e.parent_request_id && !e.reopen_dismissed)   // 🟡 accepted follow-up (already a repeat)
      return {
         text: `${sent} da yuborildi. Xodim ${acc} da qabul qildi (${wait}) — qayta so'rov, bajarildi.`,
         tone: 'text-amber-600',
      }
   return {   // 🟢 clean single-pass completion
      text: `${sent} da yuborildi. Xodim ${acc} da qabul qildi (${wait}) — bajarildi.`,
      tone: 'text-emerald-600',
   }
}

/** Per-STAFF activity log: every request each worker was DM'd about, newest first, each
 *  turned into a plain sentence. Honours the lavozim + name filters; busiest worker first. */
const staffLogs = computed(() => {
   const nameById = new Map(workers.value.map((w) => [w.telegram_id, w.name]))
   const map = new Map<number, any>()
   for (const r of requests.value) {
      for (const rec of r.recipients) {
         let s = map.get(rec.telegram_id)
         if (!s) {
            s = {
               telegram_id: rec.telegram_id, username: rec.username,
               name: nameById.get(rec.telegram_id) ?? null, role: rec.role, entries: [] as any[],
            }
            map.set(rec.telegram_id, s)
         }
         // For a released row, name the colleague who actually took (or flagged) the need.
         const sib = r.recipients.find((o: any) =>
            o.telegram_id !== rec.telegram_id && (o.accepted_at || o.flagged_at))
         s.entries.push({
            id: r.id, text: r.text, parent_request_id: r.parent_request_id,
            reopen_dismissed: r.reopen_dismissed, message_link: r.message_link,
            created_at: r.created_at, delivered: rec.delivered, it_verdict: rec.it_verdict,
            dm_sent_at: rec.dm_sent_at, accepted_at: rec.accepted_at,
            flagged_at: rec.flagged_at, released_at: rec.released_at, reopened_count: rec.reopened_count,
            claimed_by: sib
               ? { name: nameById.get(sib.telegram_id) || sib.username || ('ID ' + sib.telegram_id),
                   flagged: !sib.accepted_at && !!sib.flagged_at }
               : null,
         })
      }
   }
   return [...map.values()]
      .map((s) => {
         s.entries.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         s.entries = s.entries.map((e: any) => ({ ...e, sum: entrySummary(e) }))
         return s
      })
      .filter((s) => !filterRole.value || s.role === filterRole.value)
      .filter((s) => !filterName.value || personLabel(s) === filterName.value)
      .sort((a, b) => b.entries.length - a.entries.length)
})

/** Accordion: which staff rows are expanded to show their log. */
const expandedStaff = ref<Set<number>>(new Set())
function toggleStaff(id: number) {
   const s = new Set(expandedStaff.value)
   s.has(id) ? s.delete(id) : s.add(id)
   expandedStaff.value = s
}

function setPeriod(p: string) {
   period.value = p
   load()
}

async function load() {
   loading.value = true
   try {
      const [rep, wrk, ts, reqs, sr, st] = await Promise.all([
         api.get(`/control/report?period=${period.value}`),
         api.get(`/control/workers?period=${period.value}`),
         api.get(`/control/timeseries?period=${period.value}`),
         api.get(`/control/requests?period=${period.value}&limit=50`),
         api.get('/control/staff-readiness'),
         api.get('/control/settings'),
      ])
      report.value = rep.data
      workers.value = wrk.data
      timeseries.value = ts.data
      requests.value = reqs.data
      staffReadiness.value = sr.data
      form.value = {
         staff_repeat_window_hours: st.data.staff_repeat_window_hours,
         ellikboshi_repeat_window_hours: st.data.ellikboshi_repeat_window_hours,
         it_group_id: st.data.it_group_id,
         it_topic_id: st.data.it_topic_id,
         is_enabled: st.data.is_enabled,
      }
   } catch {
      report.value = null
      workers.value = []
      timeseries.value = []
      requests.value = []
      staffReadiness.value = []
   } finally {
      loading.value = false
   }
}

/** Feature #1 — the confirmed-mistake breakdown as [{label, count}], biggest first. */
const errorKinds = computed(() => {
   const e = report.value?.error_kinds
   if (!e) return [] as { label: string; count: number }[]
   return Object.entries(e)
      .map(([code, count]) => ({ label: KIND_LABELS[code] || code, count }))
      .sort((a, b) => b.count - a.count)
})

/** Feature #6 — dismiss a falsely auto-detected repeat, then refresh the evidence. */
async function dismissReopen(id: number) {
   try {
      await api.post(`/control/requests/${id}/dismiss-reopen`)
      await load()
   } catch { /* ignore — the row just stays as-is */ }
}

async function save() {
   saving.value = true
   savedMsg.value = ''
   try {
      await api.put('/control/settings', form.value)
      savedMsg.value = 'Saqlandi'
      setTimeout(() => (savedMsg.value = ''), 2500)
   } catch {
      savedMsg.value = 'Saqlashda xatolik'
   } finally {
      saving.value = false
   }
}

onMounted(load)
</script>

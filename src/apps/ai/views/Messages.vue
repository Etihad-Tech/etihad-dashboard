<template>
   <AppLayout>
      <div class="space-y-6">
         <h2 class="text-2xl font-bold text-gray-900 animate-fade-up">Murojaatlar</h2>

         <div class="flex flex-wrap items-center gap-3 animate-fade-up" style="animation-delay: 30ms">
            <select v-model="filters.category"
               class="bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
               <option value="">Barcha kategoriyalar</option>
               <option value="sorov">So'rov</option>
               <option value="muammo">Muammo</option>
               <option value="etiroz">E'tiroz</option>
            </select>

            <select v-model="filters.group"
               class="bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
               <option value="">Barcha guruhlar</option>
               <option v-for="g in messagesStore.groups" :key="g.id" :value="g.id">
                  {{ g.title }}
               </option>
            </select>

            <div class="w-px h-7 bg-gray-200"></div>

            <flat-pickr v-model="filters.date_from" :config="dateFromConfig" placeholder="Boshlanish sanasi"
               class="bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-40" />
            <flat-pickr v-model="filters.date_to" :config="dateToConfig" placeholder="Tugash sanasi"
               class="bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-40" />

            <div class="w-px h-7 bg-gray-200"></div>

            <select v-model="pageSizeStr"
               class="bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
               <option value="25">Sahifada: 25</option>
               <option value="50">Sahifada: 50</option>
               <option value="100">Sahifada: 100</option>
            </select>
         </div>

         <div class="bg-white rounded-3xl border border-gray-200 overflow-x-auto animate-fade-up"
            style="animation-delay: 60ms">
            <table class="w-full text-sm min-w-[640px]">
               <thead>
                  <tr class="text-gray-500 border-b border-gray-100 bg-gray-50/50">
                     <th class="text-left px-4 py-3 font-medium">Foydalanuvchi</th>
                     <th class="text-left px-4 py-3 font-medium">Guruh</th>
                     <th class="text-left px-4 py-3 font-medium">Xabar</th>
                     <th class="text-left px-4 py-3 font-medium">Kategoriya</th>
                     <th class="text-left px-4 py-3 font-medium">Vaqt</th>
                     <th class="px-4 py-3"></th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="msg in messagesStore.items" :key="msg.id"
                     class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                     <td class="px-4 py-3">
                        <span class="font-medium text-gray-900">{{ msg.user.first_name || msg.user.username || 'Unknown'
                        }}</span>
                     </td>
                     <td class="px-4 py-3 text-gray-500">{{ msg.group?.title || 'Shaxsiy chat' }}</td>
                     <td class="px-4 py-3 max-w-xs truncate text-gray-600">{{ msg.text }}</td>
                     <td class="px-4 py-3">
                        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                           :class="categoryClass(msg.category)">
                           {{ categoryLabel(msg.category) }}
                        </span>
                     </td>
                     <td class="px-4 py-3 text-gray-400 whitespace-nowrap">{{ formatDate(msg.created_at) }}</td>
                     <td class="px-4 py-3">
                        <button @click="openPreview(msg.id)"
                           class="inline-flex items-center gap-1.5 px-3 py-2 rounded-3xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium border border-amber-200 transition-colors">
                           <font-awesome-icon icon="eye" class="w-3.5 h-3.5" />
                           Ko'rish
                        </button>
                     </td>
                  </tr>
               </tbody>
            </table>

            <div v-if="messagesStore.loading" class="flex justify-center py-8">
               <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div v-if="!messagesStore.loading && messagesStore.items.length === 0"
               class="text-center py-8 text-gray-400">
               Murojaatlar topilmadi
            </div>
         </div>

         <div class="flex items-center justify-between animate-fade-up" style="animation-delay: 90ms"
            v-if="messagesStore.total > 0">
            <p class="text-sm text-gray-500">
               Jami: {{ messagesStore.total }} ta
            </p>
            <div class="flex items-center gap-2">
               <button @click="goToPage(1)" :disabled="page <= 1"
                  class="px-3 py-1.5 rounded-2xl text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  &laquo;
               </button>
               <button @click="goToPage(page - 1)" :disabled="page <= 1"
                  class="px-3 py-1.5 rounded-2xl text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  Oldingi
               </button>
               <span class="px-3 py-1.5 text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
               <button @click="goToPage(page + 1)" :disabled="page >= totalPages"
                  class="px-3 py-1.5 rounded-2xl text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  Keyingi
               </button>
               <button @click="goToPage(totalPages)" :disabled="page >= totalPages"
                  class="px-3 py-1.5 rounded-2xl text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  &raquo;
               </button>
            </div>
         </div>
      </div>

      <ChatPreview :visible="previewVisible" :message-id="previewId" @close="previewVisible = false" />
   </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FlatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.css'
import AppLayout from '../components/AppLayout.vue'
import ChatPreview from '../components/ChatPreview.vue'
import { useMessagesStore } from '../stores/messages'

const route = useRoute()
const router = useRouter()
const messagesStore = useMessagesStore()

const q = route.query
const page = ref(Number(q.page) || 1)
const pageSizeStr = ref(String(q.limit || '25'))
const filters = reactive({
   category: (q.category as string) || '',
   group: (q.group as string) || '',
   date_from: (q.date_from as string) || '',
   date_to: (q.date_to as string) || '',
})

const pageSize = computed(() => Number(pageSizeStr.value))
const totalPages = computed(() => Math.max(1, Math.ceil(messagesStore.total / pageSize.value)))

const dateFromConfig = computed(() => ({
   dateFormat: 'Y-m-d',
   disableMobile: true,
}))

const dateToConfig = computed(() => ({
   dateFormat: 'Y-m-d',
   minDate: filters.date_from || undefined,
   disableMobile: true,
}))

watch(() => filters.date_from, (newFrom) => {
   if (newFrom && filters.date_to && newFrom > filters.date_to) {
      filters.date_to = ''
   }
})

const previewVisible = ref(false)
const previewId = ref<number | null>(null)

function openPreview(id: number) {
   previewId.value = id
   previewVisible.value = true
}

function goToPage(p: number) {
   page.value = Math.max(1, Math.min(p, totalPages.value))
}

function categoryLabel(cat: string | null): string {
   const labels: Record<string, string> = {
      sorov: "So'rov",
      muammo: 'Muammo',
      etiroz: "E'tiroz",
   }
   return cat ? labels[cat] || cat : 'Noma\'lum'
}

function categoryClass(cat: string | null): string {
   const classes: Record<string, string> = {
      sorov: 'bg-blue-50 text-blue-600',
      muammo: 'bg-amber-50 text-amber-600',
      etiroz: 'bg-red-50 text-red-600',
   }
   return cat ? classes[cat] || 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-500'
}

function formatDate(ts: string | null): string {
   if (!ts) return ''
   return new Date(ts).toLocaleString('uz')
}

function syncUrl() {
   const query: Record<string, string> = {}
   if (page.value > 1) query.page = String(page.value)
   if (pageSizeStr.value !== '25') query.limit = pageSizeStr.value
   if (filters.category) query.category = filters.category
   if (filters.group) query.group = filters.group
   if (filters.date_from) query.date_from = filters.date_from
   if (filters.date_to) query.date_to = filters.date_to
   router.replace({ query })
}

function loadMessages() {
   const params: Record<string, unknown> = {
      limit: pageSize.value,
      offset: (page.value - 1) * pageSize.value,
   }
   if (filters.category) params.category = filters.category
   if (filters.group) params.group = filters.group
   if (filters.date_from) params.date_from = filters.date_from
   if (filters.date_to) params.date_to = filters.date_to
   messagesStore.fetchMessages(params)
   syncUrl()
}

watch([filters, pageSizeStr], () => {
   page.value = 1
   loadMessages()
}, { deep: true })

watch(page, () => loadMessages())

onMounted(() => {
   messagesStore.fetchGroups()
   loadMessages()
})
</script>

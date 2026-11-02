<template>
   <AppShell>
      <div class="page">
         <div class="page-head">
            <h1 class="page-title">Murojaatlar</h1>
            <span v-if="messagesStore.total > 0" class="text-sm text-gray-500">{{ messagesStore.total }} ta</span>
         </div>

         <div class="flex flex-wrap items-center gap-2">
            <select v-model="filters.category" class="input w-auto">
               <option value="">Barcha kategoriyalar</option>
               <option value="sorov">So'rov</option>
               <option value="muammo">Muammo</option>
               <option value="etiroz">E'tiroz</option>
            </select>

            <select v-model="filters.group" class="input w-auto max-w-[16rem]">
               <option value="">Barcha guruhlar</option>
               <option v-for="g in messagesStore.groups" :key="g.id" :value="g.id">
                  {{ g.title }}
               </option>
            </select>

            <flat-pickr v-model="filters.date_from" :config="dateFromConfig" placeholder="Dan"
               class="input w-32" />
            <flat-pickr v-model="filters.date_to" :config="dateToConfig" placeholder="Gacha"
               class="input w-32" />

            <select v-model="pageSizeStr" class="input w-auto sm:ml-auto">
               <option value="25">25 ta</option>
               <option value="50">50 ta</option>
               <option value="100">100 ta</option>
            </select>
         </div>

         <div class="card overflow-x-auto">
            <table class="table min-w-[640px]">
               <thead>
                  <tr>
                     <th>Foydalanuvchi</th>
                     <th>Guruh</th>
                     <th>Xabar</th>
                     <th>Kategoriya</th>
                     <th>Vaqt</th>
                     <th></th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="msg in messagesStore.items" :key="msg.id" class="cursor-pointer" @click="openPreview(msg.id)">
                     <td class="font-medium text-gray-900 whitespace-nowrap">
                        {{ msg.user.first_name || msg.user.username || 'Unknown' }}
                     </td>
                     <td class="text-gray-500 max-w-[12rem] truncate">{{ msg.group?.title || 'Shaxsiy chat' }}</td>
                     <td class="max-w-xs truncate text-gray-600">{{ msg.text }}</td>
                     <td>
                        <span class="chip" :class="categoryClass(msg.category)">
                           {{ categoryLabel(msg.category) }}
                        </span>
                     </td>
                     <td class="text-gray-400 whitespace-nowrap">{{ formatDate(msg.created_at) }}</td>
                     <td class="text-right">
                        <button class="icon-btn" title="Ko'rish" @click.stop="openPreview(msg.id)">
                           <font-awesome-icon icon="eye" class="w-3.5 h-3.5" />
                        </button>
                     </td>
                  </tr>
               </tbody>
            </table>

            <div v-if="messagesStore.loading" class="flex justify-center py-8"><div class="spinner"></div></div>

            <div v-if="!messagesStore.loading && messagesStore.items.length === 0" class="empty">
               Murojaat yo'q
            </div>
         </div>

         <div v-if="messagesStore.total > 0 && totalPages > 1" class="flex items-center justify-end gap-1.5">
            <button class="btn btn-secondary btn-sm" :disabled="page <= 1" @click="goToPage(1)">&laquo;</button>
            <button class="btn btn-secondary btn-sm" :disabled="page <= 1" @click="goToPage(page - 1)">
               <font-awesome-icon icon="chevron-left" class="w-3 h-3" />
            </button>
            <span class="px-2 text-sm text-gray-500 tabular-nums">{{ page }} / {{ totalPages }}</span>
            <button class="btn btn-secondary btn-sm" :disabled="page >= totalPages" @click="goToPage(page + 1)">
               <font-awesome-icon icon="chevron-right" class="w-3 h-3" />
            </button>
            <button class="btn btn-secondary btn-sm" :disabled="page >= totalPages" @click="goToPage(totalPages)">&raquo;</button>
         </div>
      </div>

      <ChatPreview :visible="previewVisible" :message-id="previewId" @close="previewVisible = false" />
   </AppShell>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FlatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.css'
import AppShell from '../../../components/AppShell.vue'
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
      sorov: 'chip-blue',
      muammo: 'chip-amber',
      etiroz: 'chip-red',
   }
   return cat ? classes[cat] || 'chip-gray' : 'chip-gray'
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

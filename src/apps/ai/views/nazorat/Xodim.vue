<template>
   <div class="space-y-3">
      <div v-if="!worker" class="card py-16 text-center text-gray-400 text-sm">
         Bu davrda bu {{ personWordLower }} bo'yicha ma'lumot yo'q
      </div>

      <template v-else>
         <!-- The numbers that used to sit in the wide table's row. Here they are a grid
              a thumb can read, instead of seven columns behind a sideways scroll. -->
         <section class="card p-4">
            <div class="flex items-center gap-2 min-w-0">
               <h2 class="text-lg font-semibold text-gray-900 truncate">{{ personLabel(worker) }}</h2>
               <span class="badge shrink-0"
                  :class="worker.role === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">
                  {{ jobLabel(worker) }}
               </span>
            </div>
            <p class="text-[13px] text-gray-500 mt-0.5">
               <span v-if="worker.name && worker.username">{{ worker.username }} · </span>
               {{ whereLabel(worker) }}
            </p>

            <div v-if="worker.dms" class="flex gap-0.5 h-2.5 mt-3" :title="rowSplitHint(worker)">
               <div v-for="sg in rowSegments(worker)" :key="sg.key" class="rounded-[2px]"
                  :style="{ width: sg.pct + '%', background: sg.color }"></div>
            </div>

            <div class="grid grid-cols-3 gap-x-3 mt-4">
               <div>
                  <p class="text-[11px] text-gray-500">Murojaat</p>
                  <p class="text-lg font-semibold text-gray-900 tabular-nums leading-tight">{{ worker.dms }}</p>
               </div>
               <div>
                  <p class="text-[11px] text-gray-500">Qabul</p>
                  <p class="text-lg font-semibold text-gray-900 tabular-nums leading-tight">{{ worker.accepted }}</p>
               </div>
               <div>
                  <p class="text-[11px] text-gray-500">O'rtacha javob</p>
                  <p class="text-lg font-semibold text-gray-900 tabular-nums leading-tight">
                     {{ dur(worker.avg_response_seconds) }}
                  </p>
               </div>
            </div>

            <!-- The four outcomes on one row, in the panel's own order and colours, so
                 this block and a ranking row read as the same thing. -->
            <div class="grid grid-cols-4 gap-x-2 mt-3.5 pt-3.5 border-t border-gray-100">
               <div v-for="b in BUCKETS" :key="b.key" class="min-w-0">
                  <p class="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                     <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: b.color }"></span>
                     {{ b.short }}
                  </p>
                  <p class="text-lg font-semibold tabular-nums leading-tight"
                     :class="(worker as any)[b.key] ? 'text-gray-900' : 'text-gray-300'">
                     {{ (worker as any)[b.key] }}
                  </p>
               </div>
            </div>

            <!-- The cards that left this person's accountability. Spelled out rather than
                 summed under a heading: "boshqa xodim oldi" is a fact anyone can act on. -->
            <p v-if="uncounted(worker)" class="text-[13px] text-gray-500 mt-3 pt-3 border-t border-gray-100">
               <span v-if="worker.released">Boshqa {{ personWordLower }} oldi: {{ worker.released }}</span>
               <span v-if="worker.undelivered"> · Yetib bormadi: {{ worker.undelivered }}</span>
               <span v-if="worker.flagged"> · «Xatolik» deb belgilandi: {{ worker.flagged }}</span>
            </p>
         </section>

         <!-- Their own log. Here the full sentence is the RIGHT form: on this screen the
              question really is "what did this person do about it", so "boshqa xodim
              qabul qildi" is an answer rather than the noise it was in a shared feed. -->
         <h3 class="text-[15px] font-semibold text-gray-900 px-1 pt-1">Jurnal</h3>

         <div v-if="s.requestsLoading" class="card py-14 flex justify-center">
            <span class="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></span>
         </div>
         <div v-else-if="!entries.length" class="card py-14 text-center text-gray-400 text-sm">
            Ko'rsatilayotgan oxirgi {{ s.requests.length }} ta murojaat ichida yo'q
         </div>
         <div v-else class="card divide-y divide-gray-100 overflow-hidden">
            <div v-for="(e, i) in entries" :key="i" class="px-4 py-3 border-l-2"
               :style="{ borderLeftColor: e.sum.rail }">
               <p class="text-sm text-gray-900 leading-snug">
                  <span v-if="e.parent_request_id && !e.reopen_dismissed"
                     class="badge badge-amber mr-1 align-middle">Takroriy so'rov</span>
                  {{ e.text || '—' }}
               </p>
               <p class="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-xs text-gray-500">
                  <span class="font-medium text-gray-700">{{ e.group_label }}</span>
                  <span v-if="e.city">· {{ cityLabel(e.city) }}</span>
                  <span v-if="e.room_no">· {{ e.room_no }}-xona</span>
                  <span v-if="e.pilgrim_username">· {{ e.pilgrim_username }}</span>
               </p>
               <p class="text-[13px] mt-1 leading-snug" :style="{ color: e.sum.ink }">
                  {{ e.sum.text }}
                  <a v-if="e.message_link" :href="e.message_link" target="_blank"
                     class="text-gray-500 underline underline-offset-2 ml-1 whitespace-nowrap">
                     Xabarni ko'rish
                  </a>
                  <button v-if="e.parent_request_id && !e.reopen_dismissed" @click="s.dismissReopen(e.id)"
                     class="text-gray-400 underline underline-offset-2 ml-2 whitespace-nowrap"
                     title="Bu aslida takror emas — noto'g'ri aniqlangan qayta so'rovni bekor qiladi (asl murojaat yana «bajarildi» bo'ladi)">
                     Takror emas
                  </button>
               </p>
            </div>
         </div>

         <div v-if="s.requestsTruncated" class="flex flex-wrap items-center gap-3 text-[13px] text-gray-500 px-1">
            <span>Faqat oxirgi {{ s.requests.length }} ta murojaat ko'rsatilmoqda.</span>
            <button v-if="s.reqLimit < MAX_REQ_LIMIT" @click="s.loadMoreRequests()" class="btn-ghost">
               Ko'proq yuklash
            </button>
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNazoratStore, MAX_REQ_LIMIT } from '../../stores/nazorat'
import {
   BUCKETS, cityLabel, dur, jobLabel, personLabel,
   rowSegments, rowSplitHint, uncounted, whereLabel, useNazoratView,
} from './shared'

const s = useNazoratStore()
const route = useRoute()
const { personWordLower, entriesFor } = useNazoratView()

const telegramId = computed(() => Number(route.params.id))
const worker = computed(() => s.workers.find((w) => w.telegram_id === telegramId.value) || null)
const entries = computed(() => entriesFor(telegramId.value))

onMounted(() => s.loadRequests())
</script>

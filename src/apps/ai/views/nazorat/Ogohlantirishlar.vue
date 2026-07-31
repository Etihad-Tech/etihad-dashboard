<template>
   <!-- The exceptions, as notifications rather than as the top of the main screen.
        They used to lead the page, which meant five paragraphs stood between the reader
        and every other number every single time — even on a clean day. Behind the bell
        they are still one tap away and still the first thing the badge points at. -->
   <div class="fixed inset-0 z-50" role="dialog" aria-label="Diqqat talab qiladi">
      <div class="absolute inset-0 bg-black/25" @click="emit('close')"></div>

      <div class="n-sheet card absolute overflow-hidden flex flex-col">
         <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
            <h3 class="text-[15px] font-semibold text-gray-900">Diqqat talab qiladi</h3>
            <span v-if="activeProblems.length" class="chip tabular-nums">{{ activeProblems.length }}</span>
            <button v-if="activeProblems.length" @click="s.dismissProblems(activeProblems)"
               class="ml-auto text-[13px] font-medium text-gray-500 active:text-gray-900">
               Tozalash
            </button>
            <button class="w-8 h-8 -mr-1.5 grid place-items-center rounded-full text-gray-400 active:bg-gray-100"
               :class="activeProblems.length ? '' : 'ml-auto'" @click="emit('close')">
               <font-awesome-icon icon="xmark" class="w-4 h-4" />
               <span class="sr-only">Yopish</span>
            </button>
         </div>

         <div class="overflow-y-auto overscroll-contain">
            <!-- Genuinely nothing wrong. -->
            <div v-if="!problems.length" class="px-4 py-8 flex items-center gap-3">
               <span class="w-8 h-8 rounded-full grid place-items-center shrink-0"
                  :style="{ background: BUCKETS[0].color + '1a' }">
                  <span class="w-2 h-2 rounded-full" :style="{ background: BUCKETS[0].color }"></span>
               </span>
               <div>
                  <p class="text-sm font-medium text-gray-900">Diqqat talab qiladigan holat yo'q</p>
                  <p class="text-[13px] text-gray-500">Bu davrda hammasi joyida.</p>
               </div>
            </div>

            <!-- Cleared — which is NOT the same as nothing being wrong, and must never
                 be allowed to look like it. The problems are still true; they were only
                 put away, and each one returns on its own as soon as its number moves. -->
            <div v-else-if="!activeProblems.length" class="px-4 py-8 flex items-center gap-3">
               <span class="w-8 h-8 rounded-full grid place-items-center shrink-0 bg-gray-100">
                  <font-awesome-icon icon="check" class="w-3 h-3 text-gray-500" />
               </span>
               <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900">{{ clearedCount }} ta bildirishnoma tozalandi</p>
                  <p class="text-[13px] text-gray-500 leading-snug">
                     Holat o'zgarmadi — raqam o'zgarishi bilan qaytadi.
                  </p>
                  <button @click="s.restoreProblems()"
                     class="btn-ghost mt-2.5 text-[13px]">Qaytarish</button>
               </div>
            </div>

            <div v-else class="divide-y divide-gray-100">
               <div v-for="p in activeProblems" :key="p.key">
                  <!-- «Javobsiz qolgan» opens: a number nobody can act on is only half
                       the story, so tapping it names the messages and the people who did
                       not take them. -->
                  <component :is="p.key === 'never_accepted' ? 'button' : 'div'"
                     type="button" class="w-full text-left px-4 py-3 flex gap-3"
                     :class="p.key === 'never_accepted' ? 'active:bg-gray-50' : ''"
                     @click="p.key === 'never_accepted' && toggleUnanswered()">
                     <span class="w-1.5 h-1.5 rounded-full mt-2 shrink-0" :style="{ background: p.color }"></span>
                     <div class="min-w-0 flex-1">
                        <div class="flex items-baseline gap-2">
                           <span class="text-[19px] leading-none font-semibold tabular-nums"
                              :style="{ color: p.color }">{{ p.value }}</span>
                           <span class="text-sm font-medium text-gray-900">{{ p.label }}</span>
                           <span v-if="p.key === 'never_accepted'"
                              class="ml-auto text-[13px] font-medium text-gray-500 whitespace-nowrap">
                              {{ showUnanswered ? 'Yashirish' : "Ko'rish" }}
                           </span>
                        </div>
                        <p class="text-[13px] text-gray-500 mt-1 leading-snug">{{ p.hint }}</p>
                        <div v-if="p.people && p.people.length" class="flex flex-wrap gap-1.5 mt-2">
                           <span v-for="(who, i) in p.people" :key="i" class="chip">{{ who }}</span>
                        </div>
                     </div>
                  </component>

                  <!-- WHICH messages, and WHO did not take them. One block per message,
                       because a crew need is sent to several people at once and the
                       question is always "who ignored this one". -->
                  <div v-if="p.key === 'never_accepted' && showUnanswered" class="bg-gray-50/70 border-t border-gray-100">
                     <div v-if="s.requestsLoading" class="py-6 flex justify-center">
                        <span class="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></span>
                     </div>
                     <template v-else>
                        <p v-if="s.report && s.report.never_accepted > unansweredNeeds.length"
                           class="px-4 pt-3 text-[13px] text-gray-500">
                           Jami {{ s.report.never_accepted }} ta kartochka · quyida oxirgi
                           {{ unansweredNeeds.length }} ta murojaat
                        </p>
                        <div v-if="!unansweredNeeds.length"
                           class="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px] text-gray-500">
                           <span>Ko'rsatilayotgan oxirgi {{ s.requests.length }} tadan tashqarida.</span>
                           <button v-if="s.reqLimit < MAX_REQ_LIMIT" @click="s.loadMoreRequests()" class="btn-ghost">
                              Ko'proq yuklash
                           </button>
                        </div>
                        <div v-else class="divide-y divide-gray-100">
                           <div v-for="n in unansweredNeeds" :key="n.id" class="px-4 py-3">
                              <p class="text-sm text-gray-900 leading-snug">{{ n.text || '—' }}</p>
                              <p class="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-xs text-gray-500">
                                 <span>{{ fmtDateTime(n.created_at) }}</span>
                                 <span class="font-medium text-gray-700">· {{ n.group_label }}</span>
                                 <span v-if="n.city">· {{ cityLabel(n.city) }}</span>
                                 <span v-if="n.room_no">· {{ n.room_no }}-xona</span>
                                 <span v-if="n.pilgrim_username">· {{ n.pilgrim_username }}</span>
                                 <a v-if="n.message_link" :href="n.message_link" target="_blank"
                                    class="text-gray-500 underline underline-offset-2">Xabarni ko'rish</a>
                              </p>
                              <!-- The people it reached who never took it, each with the
                                   JOB that explains why they were the ones asked. -->
                              <div class="flex flex-wrap gap-1.5 mt-2">
                                 <span class="text-xs text-gray-500 mr-0.5">Qabul qilmadi:</span>
                                 <span v-for="w in n.ignored" :key="w.telegram_id"
                                    class="chip inline-flex items-center gap-1.5">
                                    {{ w.name }}
                                    <span class="badge"
                                       :class="w.role === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">
                                       {{ w.job }}
                                    </span>
                                 </span>
                              </div>
                           </div>
                        </div>
                     </template>
                  </div>
               </div>

               <!-- Some cleared, some still showing. -->
               <div v-if="clearedCount" class="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span class="text-[13px] text-gray-500">{{ clearedCount }} ta tozalangan</span>
                  <button @click="s.restoreProblems()"
                     class="text-[13px] font-medium text-gray-500 underline underline-offset-2">
                     Qaytarish
                  </button>
               </div>
            </div>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useNazoratStore, MAX_REQ_LIMIT } from '../../stores/nazorat'
import { BUCKETS, cityLabel, fmtDateTime, useNazoratView } from './shared'

const emit = defineEmits<{ close: [] }>()

const s = useNazoratStore()
const { problems, activeProblems, clearedCount, unansweredNeeds } = useNazoratView()

// Opening the message list is also what pays for the heavy /control/requests read.
const showUnanswered = ref(false)
function toggleUnanswered() {
   showUnanswered.value = !showUnanswered.value
   if (showUnanswered.value) s.loadRequests()
}
</script>

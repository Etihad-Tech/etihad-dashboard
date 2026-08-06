<template>
   <!-- The exceptions, as notifications rather than as the top of the main screen.
        They used to lead the page, which meant five paragraphs stood between the reader
        and every other number every single time — even on a clean day. Behind the bell
        they are still one tap away and still the first thing the badge points at. -->
   <div class="fixed inset-0 z-50" role="dialog" aria-label="Diqqat talab qiladi">
      <!-- The dim behind the sheet is blurred as well as darkened, the way a phone does
           it. Allowed here because this layer is fixed and static while the sheet is
           open: the blur is composited once, not on every frame of a scroll. -->
      <div class="absolute inset-0 bg-black/25 backdrop-blur-[2px]" @click="emit('close')"></div>

      <div class="n-sheet card absolute overflow-hidden flex flex-col">
         <div class="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 shrink-0">
            <h3 class="n-h">Diqqat talab qiladi</h3>
            <span v-if="activeProblems.length" class="chip tabular-nums">{{ activeProblems.length }}</span>
            <button v-if="activeProblems.length" @click="s.dismissProblems(activeProblems)"
               class="ml-auto text-[14px] font-semibold text-[color:var(--n-muted)] active:text-[color:var(--n-ink)]">
               Tozalash
            </button>
            <button class="n-topbtn shrink-0" :class="activeProblems.length ? '' : 'ml-auto'"
               @click="emit('close')">
               <font-awesome-icon icon="xmark" class="w-4 h-4" />
               <span class="sr-only">Yopish</span>
            </button>
         </div>

         <div class="overflow-y-auto overscroll-contain">
            <!-- Genuinely nothing wrong. -->
            <div v-if="!problems.length" class="px-5 py-10 flex items-center gap-3.5">
               <span class="n-ico" :style="{ '--c': BUCKETS[0].color }">
                  <font-awesome-icon icon="check" class="w-4 h-4" />
               </span>
               <div>
                  <p class="text-[16px] font-semibold tracking-[-0.015em]">Diqqat talab qiladigan holat yo'q</p>
                  <p class="text-[13.5px] text-[color:var(--n-muted)] mt-0.5">Bu davrda hammasi joyida.</p>
               </div>
            </div>

            <!-- Cleared — which is NOT the same as nothing being wrong, and must never
                 be allowed to look like it. The problems are still true; they were only
                 put away, and each one returns on its own as soon as its number moves. -->
            <div v-else-if="!activeProblems.length" class="px-5 py-10 flex items-center gap-3.5">
               <span class="n-ico" style="--c: #8a8a90">
                  <font-awesome-icon icon="check" class="w-4 h-4" />
               </span>
               <div class="min-w-0">
                  <p class="text-[16px] font-semibold tracking-[-0.015em]">
                     {{ clearedCount }} ta bildirishnoma tozalandi
                  </p>
                  <p class="text-[13.5px] text-[color:var(--n-muted)] leading-snug mt-0.5">
                     Holat o'zgarmadi. Raqam o'zgarishi bilan qaytadi.
                  </p>
                  <button @click="s.restoreProblems()" class="btn-ghost mt-3">Qaytarish</button>
               </div>
            </div>

            <div v-else class="divide-y divide-gray-100">
               <div v-for="p in activeProblems" :key="p.key">
                  <!-- «Javobsiz qolgan» opens: a number nobody can act on is only half
                       the story, so tapping it names the messages and the people who did
                       not take them. -->
                  <component :is="p.key === 'never_accepted' ? 'button' : 'div'"
                     type="button" class="w-full text-left px-5 py-4 flex gap-3.5"
                     :class="p.key === 'never_accepted' ? 'active:bg-gray-50' : ''"
                     @click="p.key === 'never_accepted' && toggleUnanswered()">
                     <span class="n-ico n-ico-sm mt-0.5" :style="{ '--c': p.color }">
                        <span class="w-2.5 h-2.5 rounded-full" :style="{ background: p.color }"></span>
                     </span>
                     <div class="min-w-0 flex-1">
                        <div class="flex items-baseline gap-2">
                           <span class="text-[22px] leading-none font-bold tabular-nums tracking-[-0.03em]"
                              :style="{ color: p.color }">{{ p.value }}</span>
                           <span class="text-[16px] font-semibold tracking-[-0.015em]">{{ p.label }}</span>
                           <span v-if="p.key === 'never_accepted'"
                              class="ml-auto text-[14px] font-semibold text-[color:var(--n-muted)] whitespace-nowrap">
                              {{ showUnanswered ? 'Yashirish' : "Ko'rish" }}
                           </span>
                        </div>
                        <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1.5 leading-snug">{{ p.hint }}</p>
                        <div v-if="p.people && p.people.length" class="flex flex-wrap gap-1.5 mt-2.5">
                           <span v-for="(who, i) in p.people" :key="i" class="chip">{{ who }}</span>
                        </div>
                     </div>
                  </component>

                  <!-- WHICH messages, and WHO did not take them. One block per message,
                       because a crew need is sent to several people at once and the
                       question is always "who ignored this one". -->
                  <div v-if="p.key === 'never_accepted' && showUnanswered" class="bg-gray-50 border-t border-gray-100">
                     <div v-if="s.requestsLoading" class="px-5 py-4 space-y-2">
                        <div v-for="i in 3" :key="i" class="h-3 rounded-full bg-gray-200 animate-pulse"
                           :class="i === 3 ? 'w-1/2' : ''"></div>
                     </div>
                     <template v-else>
                        <p v-if="s.report && s.report.never_accepted > unansweredNeeds.length"
                           class="px-5 pt-4 text-[13.5px] text-[color:var(--n-muted)]">
                           Jami {{ s.report.never_accepted }} ta kartochka · quyida oxirgi
                           {{ unansweredNeeds.length }} ta murojaat
                        </p>
                        <div v-if="!unansweredNeeds.length"
                           class="flex flex-wrap items-center gap-3 px-5 py-4 text-[13.5px] text-[color:var(--n-muted)]">
                           <span>Ko'rsatilayotgan oxirgi {{ s.requests.length }} tadan tashqarida.</span>
                           <button v-if="s.reqLimit < MAX_REQ_LIMIT" @click="s.loadMoreRequests()" class="btn-ghost">
                              Ko'proq yuklash
                           </button>
                        </div>
                        <div v-else class="divide-y divide-gray-200">
                           <div v-for="n in unansweredNeeds" :key="n.id" class="px-5 py-4">
                              <p class="text-[15px] leading-snug">
                                 <span v-if="n.text">{{ n.text }}</span>
                                 <span v-else class="text-[color:var(--n-faint)]">Matnsiz</span>
                              </p>
                              <p class="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-[12.5px] text-[color:var(--n-muted)]">
                                 <span>{{ fmtDateTime(n.created_at) }}</span>
                                 <span class="font-semibold text-[color:var(--n-ink-2)]">· {{ n.group_label }}</span>
                                 <span v-if="n.city">· {{ cityLabel(n.city) }}</span>
                                 <span v-if="n.room_no">· {{ n.room_no }}-xona</span>
                                 <span v-if="n.pilgrim_username">· {{ n.pilgrim_username }}</span>
                                 <a v-if="n.message_link" :href="n.message_link" target="_blank"
                                    class="font-medium text-[color:var(--n-ink-2)] underline underline-offset-2">Xabarni ko'rish</a>
                              </p>
                              <!-- The people it reached who never took it, each with the
                                   JOB that explains why they were the ones asked. -->
                              <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
                                 <span class="text-[13px] text-[color:var(--n-muted)] mr-0.5">Qabul qilmadi:</span>
                                 <span v-for="w in n.ignored" :key="w.telegram_id"
                                    class="chip inline-flex items-center gap-1.5">
                                    {{ w.name }}
                                    <span class="badge"
                                       :class="w.leaderLevel ? 'badge-indigo' : 'badge-amber'">
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
               <div v-if="clearedCount" class="px-5 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span class="text-[13.5px] text-[color:var(--n-muted)]">{{ clearedCount }} ta tozalangan</span>
                  <button @click="s.restoreProblems()"
                     class="text-[13.5px] font-semibold text-[color:var(--n-ink-2)] underline underline-offset-2">
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

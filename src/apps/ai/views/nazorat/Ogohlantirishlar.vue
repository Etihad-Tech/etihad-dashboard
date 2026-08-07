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
               <span class="n-ico" :style="{ '--c': BUCKET.completed.color }">
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
                  <!-- Both notices open. A count nobody can act on is half a notice: the
                       question is always WHICH message, and for the aggression alarm also
                       WHOSE group — so tapping names them. -->
                  <button type="button" class="w-full text-left px-5 py-4 flex gap-3.5 active:bg-gray-50"
                     @click="toggle(p.key)">
                     <span class="n-ico n-ico-sm mt-0.5" :style="{ '--c': p.color }">
                        <span class="w-2.5 h-2.5 rounded-full" :style="{ background: p.color }"></span>
                     </span>
                     <div class="min-w-0 flex-1">
                        <div class="flex items-baseline gap-2">
                           <span class="text-[22px] leading-none font-bold tabular-nums tracking-[-0.03em]"
                              :style="{ color: p.color }">{{ p.value }}</span>
                           <span class="text-[16px] font-semibold tracking-[-0.015em]">{{ p.label }}</span>
                           <span class="ml-auto text-[14px] font-semibold text-[color:var(--n-muted)] whitespace-nowrap">
                              {{ open === p.key ? 'Yashirish' : "Ko'rish" }}
                           </span>
                        </div>
                        <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1.5 leading-snug">{{ p.hint }}</p>
                     </div>
                  </button>

                  <!-- THE ANGRY MESSAGES. The ellikboshi is named on every one: an
                       aggressive complaint has to be settled now, and the person
                       answerable is the group's leader, never whoever happened to be
                       DM'd — so the crew is deliberately not named here. -->
                  <div v-if="p.key === 'aggressive' && open === 'aggressive'"
                     class="bg-gray-50 border-t border-gray-100 divide-y divide-gray-200">
                     <div v-for="a in s.aggressive.items" :key="a.id" class="px-5 py-4">
                        <p class="text-[15px] leading-snug">
                           <span v-if="a.text">{{ a.text }}</span>
                           <span v-else class="text-[color:var(--n-faint)]">Matnsiz</span>
                        </p>
                        <p class="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-[12.5px] text-[color:var(--n-muted)]">
                           <span>{{ fmtDateTime(a.created_at) }}</span>
                           <span v-if="a.group_title" class="font-semibold text-[color:var(--n-ink-2)]">
                              · {{ a.group_title }}
                           </span>
                           <span v-if="a.pilgrim_username">· {{ a.pilgrim_username }}</span>
                        </p>
                        <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
                           <span class="text-[13px] text-[color:var(--n-muted)] mr-0.5">Ellikboshi:</span>
                           <span class="chip">{{ a.ellikboshi || '—' }}</span>
                        </div>
                     </div>
                     <p v-if="s.aggressive.total > s.aggressive.items.length"
                        class="px-5 py-3 text-[13.5px] text-[color:var(--n-muted)]">
                        Jami {{ s.aggressive.total }} ta · quyida oxirgi
                        {{ s.aggressive.items.length }} tasi
                     </p>
                  </div>

                  <!-- THE JOBS THAT WERE NOT DONE, with the person who said they were. -->
                  <div v-if="p.key === 'reopened' && open === 'reopened'"
                     class="bg-gray-50 border-t border-gray-100">
                     <div v-if="s.requestsLoading" class="px-5 py-4 space-y-2">
                        <div v-for="i in 3" :key="i" class="h-3 rounded-full bg-gray-200 animate-pulse"
                           :class="i === 3 ? 'w-1/2' : ''"></div>
                     </div>
                     <template v-else>
                        <div v-if="!reopenedNeeds.length"
                           class="flex flex-wrap items-center gap-3 px-5 py-4 text-[13.5px] text-[color:var(--n-muted)]">
                           <span>Ko'rsatilayotgan oxirgi {{ s.requests.length }} tadan tashqarida.</span>
                           <button v-if="s.reqLimit < MAX_REQ_LIMIT" @click="s.loadMoreRequests()" class="btn-ghost">
                              Ko'proq yuklash
                           </button>
                        </div>
                        <div v-else class="divide-y divide-gray-200">
                           <div v-for="n in reopenedNeeds" :key="n.id" class="px-5 py-4">
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
                              <p class="text-[13px] text-[color:var(--n-muted)] mt-2">{{ n.taker }}</p>
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
import { BUCKET, cityLabel, fmtDateTime, useNazoratView } from './shared'

const emit = defineEmits<{ close: [] }>()

const s = useNazoratStore()
const { problems, activeProblems, clearedCount, reopenedNeeds } = useNazoratView()

/** One notice open at a time — the sheet is a phone-height panel and two open lists
 *  would push the second one's heading off the screen that raised it. */
const open = ref<string | null>(null)
function toggle(key: string) {
   open.value = open.value === key ? null : key
   // The angry messages ride along with the report; only the reopened list needs the
   // heavy /control/requests read, so opening it is what pays for it.
   if (open.value === 'reopened') s.loadRequests()
}
</script>

<template>
   <div class="space-y-3">
      <div v-if="!worker" class="card py-16 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu davrda bu {{ personWordLower }} bo'yicha ma'lumot yo'q
      </div>

      <template v-else>
         <!-- The numbers that used to sit in the wide table's row. Here they are a grid
              a thumb can read, instead of seven columns behind a sideways scroll. -->
         <section class="card p-5 n-enter" style="--i: 0">
            <div class="flex items-center gap-3.5 min-w-0">
               <span class="n-avatar" :class="isLeaderLevel(worker) ? 'n-avatar-leader' : ''">
                  {{ initials(personLabel(worker)) }}
               </span>
               <div class="min-w-0 flex-1">
                  <!-- The name WRAPS rather than truncates, the same rule the ranking
                       rows follow: «Nurmuhammad Rahim…» is the screen hiding the one
                       thing it is about. -->
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                     <h2 class="text-[20px] font-bold tracking-[-0.025em] leading-tight">
                        {{ personLabel(worker) }}
                     </h2>
                     <span class="badge shrink-0"
                        :class="isLeaderLevel(worker) ? 'badge-indigo' : 'badge-amber'">
                        {{ jobLabel(worker) }}
                     </span>
                  </div>
                  <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1">
                     <span v-if="worker.name && worker.username">{{ worker.username }} · </span>
                     {{ whereLabel(worker) }}
                  </p>
               </div>
            </div>

            <div v-if="worker.dms" class="n-split h-3 mt-4" :title="rowSplitHint(worker)">
               <span v-for="sg in rowSegments(worker)" :key="sg.key"
                  :style="{ width: sg.pct + '%', background: sg.color }"></span>
            </div>

            <!-- Sunken rather than raised: these sit INSIDE a card, and a second layer of
                 white-on-white with its own shadow reads as a stack of loose paper. -->
            <div class="grid grid-cols-3 gap-2 mt-4">
               <div v-for="t in headTiles" :key="t.label" class="card-inset p-3">
                  <p class="n-tile-label">{{ t.label }}</p>
                  <p class="text-[20px] font-bold tracking-[-0.03em] tabular-nums leading-tight mt-1">
                     {{ t.value }}
                  </p>
               </div>
            </div>

            <!-- The four outcomes on one row, in the panel's own order and colours, so
                 this block and a ranking row read as the same thing. -->
            <div class="grid grid-cols-4 gap-x-2 mt-4 pt-4" style="border-top: 1px solid var(--n-line-soft)">
               <div v-for="b in BUCKETS" :key="b.key" class="min-w-0">
                  <p class="text-[12px] text-[color:var(--n-muted)] flex items-center gap-1.5 truncate">
                     <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: b.color }"></span>
                     {{ b.short }}
                  </p>
                  <p class="text-[22px] font-bold tabular-nums tracking-[-0.03em] leading-tight mt-1"
                     :class="(worker as any)[b.key] ? '' : 'text-[color:var(--n-faint)]'">
                     {{ (worker as any)[b.key] }}
                  </p>
               </div>
            </div>

            <!-- The cards that left this person's accountability. Spelled out rather than
                 summed under a heading: "boshqa xodim oldi" is a fact anyone can act on. -->
            <p v-if="uncounted(worker)"
               class="text-[13.5px] text-[color:var(--n-muted)] mt-4 pt-4"
               style="border-top: 1px solid var(--n-line-soft)">
               <span v-if="worker.released">Boshqa {{ personWordLower }} oldi: {{ worker.released }}</span>
               <span v-if="worker.undelivered"> · Yetib bormadi: {{ worker.undelivered }}</span>
               <span v-if="worker.flagged"> · «Xatolik» deb belgilandi: {{ worker.flagged }}</span>
            </p>
         </section>

         <!-- Their own log. Here the full sentence is the RIGHT form: on this screen the
              question really is "what did this person do about it", so "boshqa xodim
              qabul qildi" is an answer rather than the noise it was in a shared feed. -->
         <h3 class="n-group-h pt-2 pb-1">Jurnal</h3>

         <div v-if="s.requestsLoading" class="card divide-y divide-gray-100 overflow-hidden">
            <div v-for="i in 4" :key="i" class="px-5 py-4 space-y-2">
               <div class="h-3 rounded-full bg-gray-100 animate-pulse"></div>
               <div class="h-3 w-1/2 rounded-full bg-gray-100 animate-pulse"></div>
            </div>
         </div>
         <div v-else-if="!entries.length" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
            Ko'rsatilayotgan oxirgi {{ s.requests.length }} ta murojaat ichida yo'q
         </div>
         <div v-else class="card divide-y divide-gray-100 overflow-hidden n-enter" style="--i: 1">
            <div v-for="(e, i) in entries" :key="i" class="px-5 py-4 border-l-[3px]"
               :style="{ borderLeftColor: e.sum.rail }">
               <p class="text-[15.5px] leading-snug">
                  <span v-if="e.parent_request_id && !e.reopen_dismissed"
                     class="badge badge-amber mr-1 align-middle">Takroriy so'rov</span>
                  <span v-if="e.text">{{ e.text }}</span>
                  <span v-else class="text-[color:var(--n-faint)]">Matnsiz</span>
               </p>
               <p class="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-[12.5px] text-[color:var(--n-muted)]">
                  <span class="font-semibold text-[color:var(--n-ink-2)]">{{ e.group_label }}</span>
                  <span v-if="e.city">· {{ cityLabel(e.city) }}</span>
                  <span v-if="e.room_no">· {{ e.room_no }}-xona</span>
                  <span v-if="e.pilgrim_username">· {{ e.pilgrim_username }}</span>
               </p>
               <p class="text-[14px] mt-1.5 leading-snug" :style="{ color: e.sum.ink }">
                  {{ e.sum.text }}
                  <a v-if="e.message_link" :href="e.message_link" target="_blank"
                     class="text-[color:var(--n-muted)] underline underline-offset-2 ml-1 whitespace-nowrap">
                     Xabarni ko'rish
                  </a>
                  <button v-if="e.parent_request_id && !e.reopen_dismissed" @click="s.dismissReopen(e.id)"
                     class="text-[color:var(--n-muted)] underline underline-offset-2 ml-2 whitespace-nowrap"
                     title="Bu aslida takror emas. Noto'g'ri aniqlangan qayta so'rovni bekor qiladi (asl murojaat yana «bajarildi» bo'ladi)">
                     Takror emas
                  </button>
               </p>
            </div>
         </div>

         <div v-if="s.requestsTruncated"
            class="flex flex-wrap items-center gap-3 text-[13.5px] text-[color:var(--n-muted)] px-1 pt-1">
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
   BUCKETS, cityLabel, dur, initials, isLeaderLevel, jobLabel,
   personLabel, rowSegments, rowSplitHint, uncounted, whereLabel, useNazoratView,
} from './shared'

const s = useNazoratStore()
const route = useRoute()
const { personWordLower, entriesFor } = useNazoratView()

const telegramId = computed(() => Number(route.params.id))
const worker = computed(() => s.workers.find((w) => w.telegram_id === telegramId.value) || null)
const entries = computed(() => entriesFor(telegramId.value))

/** The three headline figures as tiles — same numbers, same order as before. */
const headTiles = computed(() => {
   const w = worker.value
   if (!w) return []
   return [
      // «Kartochka», not «Murojaat»: this is w.dms — the cards sent to THIS person, which
      // is the right unit on a person's own sheet (they answer for what they were sent,
      // not for a share of a complaint) but the wrong word for it. The overview counts
      // complaints; calling both «Murojaat» is what made the two disagree on screen.
      { label: 'Kartochka', value: String(w.dms) },
      { label: 'Qabul', value: String(w.accepted) },
      { label: "O'rtacha javob", value: dur(w.avg_response_seconds) },
   ]
})

onMounted(() => s.loadRequests())
</script>

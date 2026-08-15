<template>
   <div class="space-y-3">
      <!-- Same two populations as the Reyting, same doctor rule, and the tabs are the
           lavozim filter (see kpiBoards in shared.ts). Only the leader-level board
           carries a ball — the reglament covers the ellikboshilar (§4.3); the crew's
           board shows the raw numbers their own document will one day score. -->
      <div v-if="boards.length > 1" class="seg">
         <button v-for="b in boards" :key="b.key" @click="kpiTab = b.key as any"
            :class="kpiTab === b.key ? 'is-on' : ''">
            {{ b.title }}
         </button>
      </div>

      <!-- The official close is MONTHLY (§10) — on shorter periods the same arithmetic
           is a preview, and saying so beats letting a daily 62 read as somebody's pay. -->
      <p v-if="s.period !== 'month'" class="px-1 text-[13px] text-[color:var(--n-muted)]">
         Rasmiy KPI hisobi Oylik davr bo'yicha yopiladi — boshqa davrlar mo'ljal uchun.
      </p>

      <div v-if="!board" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu davr uchun ma'lumot yo'q
      </div>

      <section v-else class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">{{ board.scored ? 'Sifat reytingi' : 'Ko‘rsatkichlar' }}</h3>
            <span class="ml-auto text-[13px] text-[color:var(--n-muted)]">
               {{ board.scored ? '100 ball' : 'ball qo‘yilmaydi' }}
            </span>
         </div>

         <div class="mt-3 space-y-0.5">
            <button v-for="r in board.rows" :key="r.w.telegram_id" type="button"
               class="row-tap w-full flex items-center gap-3 py-3 -mx-2 px-2 rounded-[1.125rem]"
               @click="open(r.w.telegram_id)">
               <span class="min-w-0 flex-1 text-left">
                  <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                     <span class="text-[15px] font-semibold tracking-[-0.015em]">{{ r.name }}</span>
                     <span v-if="r.job" class="badge shrink-0"
                        :class="board.key === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">
                        {{ r.job }}
                     </span>
                     <span v-if="r.best" class="badge badge-indigo shrink-0">
                        <font-awesome-icon icon="star" class="w-3 h-3" />
                        Oyning ellikboshisi
                     </span>
                  </span>
                  <!-- The four components in the reglament's own order, so a person can
                       be checked against the document line by line. «—» is a vaqt the
                       period simply produced no daytime evidence of (never a zero that
                       looks measured), and the <10 note is §5.5 out loud. -->
                  <span v-if="board.scored" class="block mt-1 text-[12.5px] text-[color:var(--n-faint)] tabular-nums">
                     <template v-if="r.w.kpi">
                        Bajarilish {{ r.w.kpi.bajarilish_ball }}/40
                        · Javobsiz {{ r.w.kpi.javobsiz_ball }}/25
                        · Takroriy {{ r.w.kpi.takroriy_ball }}/15
                        · Vaqt {{ r.w.kpi.vaqt_measured ? r.w.kpi.vaqt_ball + '/20' : '—' }}
                        <template v-if="r.w.kpi.min_sample">
                           · {{ r.w.kpi.base }} ta murojaat — qo'lda baholanadi
                        </template>
                     </template>
                     <template v-else>Baholanadigan murojaat yo'q</template>
                  </span>
                  <span v-else class="block mt-1 text-[12.5px] text-[color:var(--n-faint)] tabular-nums">
                     Bajarildi {{ r.w.completed }}
                     · Bajarilmagan {{ r.w.reopened }}
                     · Javobsiz {{ r.w.never_accepted }}
                     <template v-if="r.w.avg_response_seconds !== null">
                        · {{ dur(r.w.avg_response_seconds) }}
                     </template>
                  </span>
               </span>
               <span class="shrink-0 text-right">
                  <template v-if="board.scored">
                     <span class="block text-[22px] font-bold tabular-nums leading-none tracking-[-0.04em]">
                        {{ r.w.kpi ? r.w.kpi.total : '—' }}
                     </span>
                     <span class="block text-[12px] text-[color:var(--n-muted)] mt-1">
                        {{ r.w.kpi && r.w.kpi.bonus && !r.w.kpi.min_sample
                           ? mln(r.w.kpi.bonus) : 'ball' }}
                     </span>
                  </template>
                  <template v-else>
                     <span class="block text-[22px] font-bold tabular-nums leading-none tracking-[-0.04em]">
                        {{ r.w.completed + r.w.reopened + r.w.never_accepted }}
                     </span>
                     <span class="block text-[12px] text-[color:var(--n-muted)] mt-1">murojaat</span>
                  </template>
               </span>
               <font-awesome-icon icon="chevron-right"
                  class="w-3 h-3 text-[color:var(--n-faint)] shrink-0" />
            </button>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNazoratStore } from '../../stores/nazorat'
import { dur, kpiTab, useNazoratView } from './shared'

const router = useRouter()
const s = useNazoratStore()
const { kpiBoards: boards, kpiBoard: board } = useNazoratView()

/** The §2 bonus, said the way the office says it: «5 mln» / «7 mln». Suppressed while
 *  the min-sample flag is up — a sum next to a score the reglament says must be scored
 *  by hand would read as a promise. */
const mln = (v: number) => `${Math.round(v / 1_000_000)} mln so'm`

/** A row is a way in to the person behind it — same rule as the Reyting. */
function open(id: number) {
   if (id) router.push(`/ai/nazorat/xodim/${id}`)
}
</script>

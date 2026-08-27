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

      <!-- WHICH MONTH. This tab does NOT answer the panel's Kunlik/Haftalik/Oylik
           selector: that «Oylik» is the last 30 DAYS, and a payslip has to be the
           calendar month the accountant means (owner, 2026-08-27 — after a freeze the
           numbers did not start fresh, because a rolling window still carried the month
           just closed). Twelve back covers any correction anyone will make. -->
      <div class="no-bar flex gap-2 overflow-x-auto -mx-5 px-5 py-0.5 lg:mx-0 lg:px-0">
         <button v-for="m in months" :key="m.period" class="fchip shrink-0"
            :class="s.kpiMonth === m.period ? 'is-on' : ''" @click="s.setKpiMonth(m.period)">
            {{ m.label }}
         </button>
      </div>
      <p class="px-1 text-[12.5px] text-[color:var(--n-muted)]">
         {{ monthLabel(s.kpiMonth) }} — to'liq kalendar oy. Bu sahifa yuqoridagi
         Kunlik / Haftalik / Oylik tanloviga bog'liq emas.
      </p>

      <div v-if="s.kpiLoading" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Yuklanmoqda…
      </div>
      <div v-else-if="s.kpiError" class="card py-10 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">Ma'lumot yuklanmadi.</p>
         <button class="btn-primary" @click="s.loadKpiWorkers()">Qayta urinish</button>
      </div>
      <div v-else-if="!board" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu oy uchun ma'lumot yo'q
      </div>

      <!-- ONE number per collapsed row. The screen now answers three questions (ball,
           toifa, oylik), and a phone row that tries to say all three at once answers
           none — so the row states the ball and one quiet pay line, and everything
           else lives behind the tap. Single-open accordion: comparing two people is
           what the collapsed list is for. -->
      <section v-else class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">{{ board.scored ? 'Ball va oylik' : 'Ko‘rsatkichlar' }}</h3>
            <span class="ml-auto text-[13px] text-[color:var(--n-muted)]">
               {{ board.scored ? '100 ballli' : 'ball qo‘yilmaydi' }}
            </span>
         </div>

         <div class="mt-3 space-y-0.5">
            <div v-for="r in board.rows" :key="keyOf(r.w)">
               <button type="button"
                  class="row-tap w-full flex items-center gap-3 py-3 -mx-2 px-2 rounded-[1.125rem]"
                  @click="toggle(keyOf(r.w))">
                  <span class="min-w-0 flex-1 text-left">
                     <span class="flex items-center gap-1.5 min-w-0">
                        <span class="text-[15px] font-semibold tracking-[-0.015em] truncate">
                           {{ r.name }}
                        </span>
                        <font-awesome-icon v-if="r.best" icon="star"
                           class="w-3.5 h-3.5 shrink-0 text-[color:var(--n-accent,#4a3aa7)]"
                           title="Oyning ellikboshisi" />
                     </span>
                     <span class="block mt-0.5 text-[12.5px] text-[color:var(--n-faint)] tabular-nums truncate">
                        {{ subline(r) }}
                     </span>
                  </span>
                  <span class="shrink-0 text-right">
                     <span class="block text-[22px] font-bold tabular-nums leading-none tracking-[-0.04em]">
                        {{ board.scored ? (r.w.kpi ? (r.w.kpi.combined ?? r.w.kpi.total) : '—') : gradable(r.w) }}
                     </span>
                     <span class="block text-[12px] text-[color:var(--n-muted)] mt-1">
                        {{ board.scored ? 'ball' : 'murojaat' }}
                     </span>
                  </span>
                  <font-awesome-icon icon="chevron-right"
                     class="w-3 h-3 text-[color:var(--n-faint)] shrink-0 transition-transform duration-200"
                     :class="openKey === keyOf(r.w) ? 'rotate-90' : ''" />
               </button>

               <div v-if="openKey === keyOf(r.w)"
                  class="mx-1 mb-2 px-4 py-3 rounded-[1rem] bg-[color:var(--n-soft,rgba(0,0,0,0.04))] space-y-3">
                  <span v-if="r.best" class="badge badge-indigo">
                     <font-awesome-icon icon="star" class="w-3 h-3" />
                     Oyning ellikboshisi
                  </span>

                  <!-- The four components, reglament order. Every row reads one way —
                       higher is better in BOTH columns — so the percentages are the
                       complements of the server's fault shares and the labels name the
                       merit. Naming the fault beside the ball it earned («Javobsiz 10%
                       · 0/25») reads as though the fault paid. The BUCKET names stay as
                       they are wherever cards are counted: this grid scores behaviour. -->
                  <div v-if="board.scored && r.w.kpi"
                     class="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 text-[13.5px] tabular-nums">
                     <span>Bajarilgani</span>
                     <span class="text-[color:var(--n-muted)]">{{ r.w.kpi.bajarilish_pct }}%</span>
                     <span class="font-semibold text-right">{{ r.w.kpi.bajarilish_ball }}/40</span>
                     <span>Javob berilgani</span>
                     <span class="text-[color:var(--n-muted)]">{{ pct100(r.w.kpi.javobsiz_pct) }}%</span>
                     <span class="font-semibold text-right">{{ r.w.kpi.javobsiz_ball }}/25</span>
                     <span>Takrorlanmagani</span>
                     <span class="text-[color:var(--n-muted)]">{{ pct100(r.w.kpi.takroriy_pct) }}%</span>
                     <span class="font-semibold text-right">{{ r.w.kpi.takroriy_ball }}/15</span>
                     <span>Javob tezligi</span>
                     <span class="text-[color:var(--n-muted)]">
                        {{ r.w.kpi.vaqt_measured ? dur(r.w.day_avg_response_seconds) : '—' }}
                     </span>
                     <span class="font-semibold text-right">
                        {{ r.w.kpi.vaqt_measured ? r.w.kpi.vaqt_ball + '/20' : '—' }}
                     </span>
                     <!-- v2(2) §5 — the survey half, when the month has one with enough
                          coverage: the headline number above is the COMBINED score. -->
                     <!-- Two halves, each labelled with its weight. The survey row
                          carried «× 0,5» while the operational row carried nothing, which
                          read as though only one of them was halved. -->
                     <template v-if="r.w.kpi.survey_ball !== null && r.w.kpi.survey_ball !== undefined">
                        <span>Kartochkalar bo'yicha</span>
                        <span class="text-[color:var(--n-muted)]">yarmi</span>
                        <span class="font-semibold text-right">{{ r.w.kpi.total }}</span>
                        <span>Ziyoratchilar bahosi</span>
                        <span class="text-[color:var(--n-muted)]">yarmi</span>
                        <span class="font-semibold text-right">{{ r.w.kpi.survey_ball }}</span>
                     </template>
                  </div>
                  <div v-else class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[13.5px] tabular-nums">
                     <span>Bajarildi</span><span class="font-semibold text-right">{{ r.w.completed }}</span>
                     <span>Bajarilmagan</span><span class="font-semibold text-right">{{ r.w.reopened }}</span>
                     <span>Javobsiz</span><span class="font-semibold text-right">{{ r.w.never_accepted }}</span>
                     <template v-if="r.w.avg_response_seconds !== null">
                        <span>Javob vaqti</span>
                        <span class="font-semibold text-right">{{ dur(r.w.avg_response_seconds) }}</span>
                     </template>
                  </div>

                  <!-- A month under the ten-card minimum is scored BY HAND, and until
                       today there was nowhere to write that score: such a month paid the
                       base salary and nothing else, for ever. The note that used to say
                       so is now the field that fixes it. -->
                  <div v-if="board.scored && r.w.kpi && r.w.kpi.min_sample"
                     class="space-y-1.5 text-[12.5px] text-[color:var(--n-muted)]">
                     <p>
                        Bu oyda {{ r.w.kpi.base }} ta baholanadigan murojaat — 10 tadan
                        kam. Ball qo'lda qo'yiladi, KPI shundan keyin hisoblanadi.
                     </p>
                     <p v-if="r.w.manual && r.w.manual.ball !== null">
                        Qo'lda qo'yilgan ball: <b>{{ r.w.manual.ball }}</b>
                        <template v-if="r.w.manual.ball_note"> — {{ r.w.manual.ball_note }}</template>
                        <template v-if="r.w.manual.updated_by"> · {{ r.w.manual.updated_by }}</template>
                     </p>
                     <div v-if="canWritePay" class="flex flex-wrap items-center gap-2">
                        <input type="number" min="0" max="100" placeholder="ball"
                           class="w-20 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13px] tabular-nums text-right"
                           :value="r.w.manual?.ball ?? ''" @click.stop
                           @change="saveBall(r.w, $event)" />
                        <input type="text" maxlength="200" placeholder="izoh"
                           class="flex-1 min-w-[8rem] px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13px]"
                           :value="r.w.manual?.ball_note ?? ''" @click.stop
                           @change="saveBallNote(r.w, $event)" />
                        <button v-if="r.w.manual && r.w.manual.ball !== null"
                           class="btn-ghost text-[12.5px]" @click.stop="clearBall(r.w)">
                           Olib tashlash
                        </button>
                     </div>
                  </div>

                  <!-- WHERE the month's work happened, beside the ball and never inside
                       it: the score is percentage-based, so weighting it would make a
                       Makka mistake cost more than a Madina one. Counts MUROJAAT; the SG
                       line below counts assigned GROUPS. -->
                  <p v-if="cityLoad(r.w)" class="text-[12.5px] text-[color:var(--n-muted)]">
                     {{ cityLoad(r.w) }}
                  </p>

                  <!-- Only a REAL ellikboshi holds a category; the doctor sits on this
                       board by display rule and is not paid by this table. WHO MAY WRITE
                       WHAT: the ellikboshi controller places people on a rung, what a
                       rung PAYS is the full nazoratchi's panel below. -->
                  <div v-if="r.w.role === 'ellikboshi'"
                     class="pt-2 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] space-y-1.5 text-[13.5px]">
                     <div class="flex items-center gap-2">
                        <span class="text-[color:var(--n-muted)]">Toifa</span>
                        <select v-if="canSetCategory"
                           class="px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px]"
                           :value="r.w.category ?? ''"
                           @click.stop @change="saveCategory(r.w, $event)">
                           <option value="">— tanlanmagan</option>
                           <option v-for="c in s.categories" :key="c.code" :value="c.code">
                              {{ c.title }}
                           </option>
                        </select>
                        <span v-else class="font-semibold">
                           {{ r.w.fiks_info ? r.w.fiks_info.unvon : '—' }}
                        </span>
                        <span v-if="r.w.fiks_info" class="badge badge-indigo ml-auto">
                           {{ soum(r.w.fiks_info.fiks) }} so'm
                        </span>
                     </div>
                     <!-- v4.5 — THREE lines. The fiks takes no input at all; everything
                          variable lives inside the KPI line, which carries its own sign.
                          Straight from the server's composition, no pay maths here. -->
                     <div v-if="r.w.salary"
                        class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
                        <span class="text-[color:var(--n-muted)]">Asosiy oylik</span>
                        <span class="text-right">{{ soum(r.w.salary.fiks) }}</span>
                        <span class="text-[color:var(--n-muted)]">KPI</span>
                        <span v-if="r.w.salary.pending_manual"
                           class="text-right text-[color:var(--n-muted)]">qo'lda baholanadi</span>
                        <span v-else class="text-right font-semibold" :class="kpiTone(r.w.salary)">
                           {{ signed(r.w.salary.kpi as number) }}
                        </span>
                        <span class="font-semibold">Yakuniy oylik</span>
                        <b class="text-right">{{ soum(r.w.salary.total) }} so'm</b>
                     </div>
                     <p class="text-[12px] text-[color:var(--n-muted)]">
                        Asosiy oylik toifaga bog'liq va o'zgarmaydi. KPI — ball,
                        yuklama va jarimalardan; manfiy ham bo'lishi mumkin.
                     </p>

                     <!-- The office's own ± on this line. It sits with the payslip it
                          changes rather than on a settings screen, because it is about
                          one person and one month — and it is refused without a reason,
                          here and on the server both: an unexplained adjustment to
                          somebody's pay is the one thing this panel exists to prevent. -->
                     <div v-if="canWritePay" class="pt-2 space-y-1.5
                                border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">
                        <div class="flex flex-wrap items-center gap-2 text-[12.5px]">
                           <span class="text-[color:var(--n-muted)]">Qo'lda tuzatish</span>
                           <input type="number" step="50000" placeholder="0"
                              class="w-28 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13px] tabular-nums text-right"
                              :value="r.w.manual?.adjust || ''" @click.stop
                              @change="saveAdjust(r.w, $event)" />
                           <input type="text" maxlength="200" placeholder="sabab — majburiy"
                              class="flex-1 min-w-[8rem] px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13px]"
                              :value="r.w.manual?.adjust_reason ?? ''" @click.stop
                              @change="saveAdjustReason(r.w, $event)" />
                        </div>
                        <p v-if="r.w.manual && r.w.manual.adjust"
                           class="text-[12px] text-[color:var(--n-muted)]">
                           {{ r.w.manual.adjust_reason || 'sababsiz' }}
                           <template v-if="r.w.manual.updated_by"> · {{ r.w.manual.updated_by }}</template>
                        </p>
                     </div>

                     <!-- Where that one number came from, step by step. A KPI line
                          nobody can check is a KPI line everybody argues about, and this
                          is the screen a leader is shown on an appeal (§12). -->
                     <div v-if="r.w.salary && !r.w.salary.pending_manual"
                        class="grid grid-cols-[0.75rem_1fr_auto] gap-x-2.5 gap-y-1
                               text-[12.5px] tabular-nums text-[color:var(--n-muted)]">
                        <span></span>
                        <span>Ball mukofoti · {{ r.w.kpi ? (r.w.kpi.combined ?? r.w.kpi.total) : '—' }} ball</span>
                        <span class="text-right">{{ soum(r.w.salary.mukofot_base) }}</span>
                        <template v-if="r.w.salary.k > 1 || r.w.salary.k_sg !== r.w.salary.sg">
                           <span>×</span>
                           <!-- The multiplier is named by what it MEASURES — how many
                                groups the month held — never by its letter. A reader who
                                has never opened the reglament must be able to check
                                their own payslip; «K · SG 1,6» told them nothing. -->
                           <span>{{ kBasis(r.w.salary) }}</span>
                           <span class="text-right">{{ dec(r.w.salary.k) }}</span>
                        </template>
                        <template v-if="r.w.salary.yuklama">
                           <span>+</span>
                           <span>Ortiqcha guruh uchun · {{ extraText(r.w.salary) }}</span>
                           <span class="text-right">{{ soum(r.w.salary.yuklama) }}</span>
                        </template>
                        <template v-if="r.w.salary.sovrin">
                           <span>+</span>
                           <span>Sovrin · Oyning ellikboshisi</span>
                           <span class="text-right">{{ soum(r.w.salary.sovrin) }}</span>
                        </template>
                        <template v-if="r.w.salary.jarima">
                           <span>−</span>
                           <span>Jarima · {{ jarimaWhy(r.w.salary) }}</span>
                           <span class="text-right">{{ soum(r.w.salary.jarima) }}</span>
                        </template>
                        <template v-if="r.w.salary.manual_adjust">
                           <span>{{ r.w.salary.manual_adjust > 0 ? '+' : '−' }}</span>
                           <span>Qo'lda tuzatish</span>
                           <span class="text-right">{{ soum(Math.abs(r.w.salary.manual_adjust)) }}</span>
                        </template>
                        <span v-if="r.w.salary.floored" class="col-span-3">
                           Jarima chegaraga tirandi — ko'pi bilan {{ soum(-r.w.salary.floor) }}
                        </span>
                        <!-- The month's load, on every payslip and not only on the ones
                             where it multiplied something. «Why is my bonus 1,2 times» and
                             «how much did I carry» are the same question, and a line that
                             appears only in good months answers it only in good months. -->
                        <!-- COUNT and LOAD as two different words (owner, 2026-08-26).
                             This line used to read «1,0 guruh» and mean the load, so a
                             leader who ran two Premium groups was shown a number saying
                             one. «guruh» now only ever counts groups; «yuklama» is the
                             daraja-weighted figure the money is calculated from. -->
                        <template v-if="r.w.sg !== null">
                           <span></span>
                           <span>Oylik yuklama</span>
                           <span class="text-right">
                              {{ sgGroups(r.w).length }} guruh · {{ dec(r.w.sg) }} yuklama
                           </span>
                        </template>
                     </div>
                     <!-- WHICH groups made that load, one line each. «Why is my yuklama
                          1,0 when I had two groups» is the question this line pays for,
                          and until 26.08 the payslip printed the total and nothing else,
                          so the Daraja halving was invisible arithmetic. Cities are
                          merged back onto their group: the server sends one entry per
                          city-LEG, and listing legs would answer the question with the
                          same confusion in a different unit. -->
                     <ul v-if="sgGroups(r.w).length"
                        class="mt-1 space-y-0.5 text-[12.5px] text-[color:var(--n-muted)]">
                        <li v-for="g in sgGroups(r.w)" :key="g.chat_id"
                           class="flex items-baseline gap-2">
                           <span class="min-w-0 flex-1 truncate">
                              {{ g.title || ('Guruh ' + g.chat_id) }}
                              <span class="text-[color:var(--n-faint)]">
                                 · {{ g.cities.map(cityShort).join('+') || '—' }}
                                 · {{ g.tier ? tierName(g.tier) : 'daraja yo\'q' }}
                              </span>
                           </span>
                           <span class="tabular-nums shrink-0">{{ dec(g.sg) }}</span>
                        </li>
                     </ul>
                     <!-- A group with no Daraja is an unanswered question, not a premium
                          group: SG counts it as a WHOLE group and says so here rather
                          than quietly paying half a load. -->
                     <p v-if="r.w.sg_tier_unset"
                        class="text-[12.5px] text-[color:var(--n-muted)]">
                        {{ r.w.sg_tier_unset }} ta guruhda daraja belgilanmagan —
                        to'liq guruh deb sanaldi
                     </p>
                     <p v-if="r.w.sg_over_ceiling"
                        class="text-[12.5px] text-[color:var(--n-muted)]">
                        2 guruhdan ortiq yuklama · rahbar ruxsati kerak
                     </p>
                     <!-- Tied to the CATEGORY, not chained to the line above it: this
                          `v-else` used to hang off `sg_over_ceiling`, so every leader
                          under the 2,0 ceiling was told their category was unset —
                          including the ones whose category was set. -->
                     <p v-if="!r.w.fiks_info" class="text-[12.5px] text-[color:var(--n-muted)]">
                        Toifa tanlanmagan
                     </p>
                  </div>

                  <button v-if="r.w.telegram_id" type="button"
                     class="text-[13px] font-semibold text-[color:var(--n-accent,#4a3aa7)]"
                     @click="open(r.w.telegram_id)">
                     Xodim sahifasi
                     <font-awesome-icon icon="chevron-right" class="w-2.5 h-2.5" />
                  </button>
               </div>
            </div>
         </div>
      </section>

   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../../stores/auth'
import { useToast } from '../../../../composables/useToast'
import { useNazoratStore, type Worker } from '../../stores/nazorat'
import { dur, kpiTab, useNazoratView } from './shared'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const s = useNazoratStore()
const { kpiBoards: boards, kpiBoard: board } = useNazoratView()

/** The two writes of §3, mirroring the API's guards rather than trusting the client
 *  (owner, 2026-08-18):
 *
 *    who PAYS WHAT   — admin + the combined nazoratchi. It moves every leader on a rung.
 *    who IS WHERE    — ...and the ellikboshi-scoped controller too: they run the leaders.
 *
 *  The staff-scoped login gets neither; it never sees this board at all. */
const canSetPayScale = computed(() => auth.role === 'admin' || auth.role === 'nazoratchi')
const canSetCategory = computed(() => canSetPayScale.value || auth.role === 'nazoratchi_ellikboshi')

/** Accordion key: the username when there is one — quiet pool members all carry
 *  telegram_id 0 (the pool knows usernames, not ids), so the id alone would open
 *  every quiet row at once. */
const keyOf = (w: Worker) => w.username || String(w.telegram_id)
const openKey = ref<string | null>(null)
const toggle = (k: string) => { openKey.value = openKey.value === k ? null : k }

const gradable = (w: Worker) => w.completed + w.reopened + w.never_accepted

/** How many leaders sit on a rung — so an edit says how far it reaches BEFORE it is
 *  made. Counted off the board actually on screen, which is the same set the change
 *  will be visible on. */

// The ladder is needed to render an unvon and to fill the picker; the board itself
// arrives with the period slice the store already loads.
// The ladder is still needed here to render an unvon; the SCHEME's numbers moved
// to Qiymatlar, which loads them itself.
// Uzbek month names, the same list and wording «Oyni yopish» uses — the two screens name
// the same month and must not do it two different ways.
const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul',
   'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

function monthLabel(p: string): string {
   const [y, m] = (p || '').split('-')
   return `${UZ_MONTHS[Number(m) - 1] || m} ${y}`
}

/** The last twelve months, newest first. A list rather than a date field, for the same
 *  reason «Oyni yopish» uses one: a typed month is a way to read somebody's pay for the
 *  wrong period without noticing. */
const months = computed(() => {
   const now = new Date()
   const out: { period: string; label: string }[] = []
   for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      out.push({ period, label: monthLabel(period) })
   }
   return out
})

onMounted(() => {
   void s.loadCategories()
   // This tab owns its window, so it owns its fetch: the panel's `load()` fills
   // `workers` for the rolling slice and never touches `kpiWorkers`.
   if (!s.kpiWorkers.length) void s.loadKpiWorkers()
})




/** «16 900 000» — thin-space thousands, the way a payslip writes it. */
const soum = (v: number) => v.toLocaleString('ru-RU')

/** The MERIT behind a fault percentage: «javobsiz 10%» is «javob berilgan 90%».
 *  Both halves of a scored row then move the same way — up is better — so the ball
 *  beside it never reads as payment for the fault. One decimal, because the server
 *  already rounded to one and 89.90000000000001 is what subtraction does to a float. */
const pct100 = (fault: number) => Math.round((100 - fault) * 10) / 10

/** What the jarima line is FOR — every §11 row that actually fired, named. A leader
 *  appealing under §12 has to point at the exact cards, and «jarima 1 700 000» points
 *  at nothing. Order follows §11's own table. */
function jarimaWhy(sal: NonNullable<Worker['salary']>): string {
   const parts: string[] = []
   if (sal.day_javobsiz) parts.push(`${sal.day_javobsiz} ta kunduzgi javobsiz`)
   if (sal.sla_breaches) parts.push(`${sal.sla_breaches} ta kechikish`)
   if (sal.bot_block) parts.push('bot bloklangan')
   if (sal.false_completions) parts.push(`${sal.false_completions} ta soxta «bajarildi»`)
   if (sal.xatolik_abuse) parts.push("«Xatolik» tugmasidan suiiste'mol")
   return parts.join(' + ')
}

const CITY_NAMES: Record<string, string> = {
   makka: 'Makka', madina: 'Madina', jidda: 'Jidda',
}

/** «Makka 12 · Madina 8 — 10.4 ish birligi»: where the month's MUROJAAT actually came
 *  from, and its city-weighted total (Makka 0.6 / Madina 0.4).
 *
 *  Empty for anybody who worked in one city only — for them the split says nothing the
 *  murojaat count above has not already said. Not to be confused with SG below, which
 *  weighs the GROUPS a person was assigned rather than the cards they fielded. */
function cityLoad(w: Worker): string {
   const entries = Object.entries(w.city_cards || {}).filter(([, n]) => n > 0)
   if (entries.length < 2) return ''
   const parts = entries
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${CITY_NAMES[c] || c} ${n}`)
   return `${parts.join(' · ')} — ${Number(w.weighted_load.toFixed(2))} ish birligi`
}

const TIER_NAMES: Record<string, string> = {
   comfort: 'Komfort', premium: 'Premium / Lux',
}
function tierName(t?: string | null) {
   return t ? (TIER_NAMES[t] || t) : ''
}
function cityShort(c?: string) {
   return c ? (CITY_NAMES[c] || c) : ''
}

/** The month's segments folded back into GROUPS — one row per group, its cities merged
 *  and its SG summed.
 *
 *  The server sends one entry per city-LEG (a whole trip under one leader is two), which
 *  is right for the arithmetic and wrong for the reader: counting entries would report
 *  two groups for one, which is the exact confusion this breakdown exists to end. Sorted
 *  heaviest first, so the group that moved the number most is the one read first. */
function sgGroups(w: Worker) {
   const by = new Map<number, { chat_id: number; title: string | null
                                cities: string[]; tier: string | null; sg: number }>()
   for (const s of w.sg_segments || []) {
      const row = by.get(s.chat_id) || {
         chat_id: s.chat_id, title: s.title, cities: [],
         tier: s.hotel_tier, sg: 0,
      }
      if (s.city && !row.cities.includes(s.city)) row.cities.push(s.city)
      row.sg += s.sg ?? 0
      by.set(s.chat_id, row)
   }
   return [...by.values()]
      .map((r) => ({ ...r, sg: Number(r.sg.toFixed(2)) }))
      .sort((a, b) => b.sg - a.sg || (a.title || '').localeCompare(b.title || ''))
}

/** How much of the month's load the BONUS was multiplied by, in words.
 *
 *  Never named by its letter (owner, 2026-08-20: «не пиши как SG, K … не знающий человек
 *  не поймет вообще»). It says «yuklama» and not «guruh» (owner, 2026-08-26): the count
 *  and the daraja-weighted load are different numbers — two Premium groups are 2 guruh
 *  and 1,0 yuklama — and one word for both was what made the payslip and the Guruhlar
 *  tab look like they disagreed. When every group was assigned as a reward this is simply
 *  the load; when only part of it was, both numbers are said out loud, because a 1,0
 *  multiplier printed beside a 1,6 load reads as a bug rather than as the rule working. */
function kBasis(sal: NonNullable<Worker['salary']>): string {
   const sg = dec(sal.sg ?? 0)
   const k = dec(sal.k_sg ?? sal.sg ?? 0)
   return k === sg ? `${sg} yuklama`
      : `${sg} yuklamadan ${k} tasi natija bo'yicha`
}

/** «0,4 guruh» — what was carried BEYOND the first one, which is what this line pays
 *  for. The whole load gets its own line below it. */
function extraText(sal: NonNullable<Worker['salary']>): string {
   return `${dec(Math.max(0, (sal.sg ?? 0) - 1))} guruh`
}

/** «1,2» — a coefficient with the decimal comma this panel writes numbers in. */
const dec = (v: number) => v.toFixed(v % 1 === 0 ? 1 : 2).replace('.', ',')

/** A SIGNED money figure: «+ 5 720 000» / «− 200 000». The sign is the whole point of
 *  the KPI line — it is the one number on this payslip that can go either way, and a
 *  bare 200 000 in red is a guess, not a statement. */
function signed(v: number): string {
   if (!v) return '0'
   return `${v < 0 ? '−' : '+'} ${soum(Math.abs(v))}`
}

/** Green earned, red deducted, plain zero. The colour is the only thing on the row that
 *  reads at arm's length on a phone; it must never be the ONLY thing that says the sign,
 *  which is what `signed` is for. */
function kpiTone(sal: NonNullable<Worker['salary']>): string {
   if (!sal.kpi) return ''
   return sal.kpi < 0 ? 'text-[#dc2626] dark:text-[#f87171]'
                      : 'text-[#059669] dark:text-[#34d399]'
}

/** The one quiet line under the name: pay for a leader, the job for everyone else.
 *  The total comes composed from the server (§3 + §5×K + §4.3 − §11) — no pay maths
 *  here. */
function subline(r: { w: Worker; job: string }): string {
   if (r.w.role === 'ellikboshi') {
      // The murojaat count rides along so the §7 star is legible at a glance: an
      // 80-ball month on 7 cards and a 35 on 30 cards are different animals, and
      // without the count the starred lower ball reads as a bug.
      const base = r.w.kpi ? `${r.w.kpi.base} murojaat` : ''
      if (!r.w.salary || !r.w.fiks_info)
         return ['Toifa tanlanmagan', base].filter(Boolean).join(' · ')
      return [`${r.w.fiks_info.unvon} · oylik ${soum(r.w.salary.total)} so'm`, base]
         .filter(Boolean).join(' · ')
   }
   return r.job
}

/** WHO may write pay. The same accounts the endpoint allows — admin and the full
 *  nazoratchi — so a field is never offered to a login whose save would 403. The
 *  scoped controllers curate evidence; they do not set salaries. */
const canWritePay = computed(() => s.scope === 'all' && s.period === 'month')

/** Every hand-written save goes through here: one place to report a refusal, and one
 *  place that knows the server's message is the useful one. The rules are the server's
 *  — a reason for an adjustment, 0..100 for a ball — and it says which was broken. */
async function saveManual(w: Worker, patch: Record<string, unknown>, ok: string) {
   const err = await s.setManual(w.username || '', patch)
   if (err) return toast.error(err)
   toast.success(ok)
}

function saveBall(w: Worker, ev: Event) {
   const raw = (ev.target as HTMLInputElement).value.trim()
   return saveManual(w, { ball: raw === '' ? null : Number(raw) },
                     raw === '' ? 'Ball olib tashlandi' : "Ball qo'yildi")
}

function saveBallNote(w: Worker, ev: Event) {
   return saveManual(w, { ball_note: (ev.target as HTMLInputElement).value }, 'Saqlandi')
}

function clearBall(w: Worker) {
   return saveManual(w, { ball: null, ball_note: null }, 'Ball olib tashlandi')
}

/** The amount and its reason are two fields and one rule: the server refuses a non-zero
 *  amount with no reason, so a save of either sends BOTH — typing the reason first and
 *  the amount second would otherwise be rejected on the first keystroke. */
function saveAdjust(w: Worker, ev: Event) {
   const raw = (ev.target as HTMLInputElement).value.trim()
   return saveManual(w, { adjust: raw === '' ? 0 : Number(raw),
                          adjust_reason: w.manual?.adjust_reason ?? null },
                     raw === '' || Number(raw) === 0 ? 'Tuzatish olib tashlandi' : 'Saqlandi')
}

function saveAdjustReason(w: Worker, ev: Event) {
   return saveManual(w, { adjust: w.manual?.adjust ?? 0,
                          adjust_reason: (ev.target as HTMLInputElement).value }, 'Saqlandi')
}

async function saveCategory(w: Worker, ev: Event) {
   const code = (ev.target as HTMLSelectElement).value || null
   if (!(await s.setCategory(w, code))) {
      toast.error("Saqlanmadi — ellikboshi ro'yxatda topilmadi")
   }
}

/** §3's pay SCALE. Editing one rung moves every leader on it, which is why it is the
 *  full nazoratchi's alone and why it sits in its own panel rather than inline on a
 *  person's card — an amount edited next to one name reads as that person's salary. */

/** A row is a way in to the person behind it — same rule as the Reyting. */
function open(id: number) {
   if (id) router.push(`/ai/nazorat/xodim/${id}`)
}
</script>

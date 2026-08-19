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

      <!-- The official close is monthly; on a shorter period this is a preview and
           must say so, or a daily 62 reads as somebody's pay. -->
      <p v-if="s.period !== 'month'" class="px-1 text-[12.5px] text-[color:var(--n-muted)]">
         Mo'ljal — rasmiy hisob oylik
      </p>

      <div v-if="!board" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu davr uchun ma'lumot yo'q
      </div>

      <!-- ONE number per collapsed row. The screen now answers three questions (ball,
           toifa, oylik), and a phone row that tries to say all three at once answers
           none — so the row states the ball and one quiet pay line, and everything
           else lives behind the tap. Single-open accordion: comparing two people is
           what the collapsed list is for. -->
      <section v-else class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">{{ board.scored ? 'Sifat reytingi' : 'Ko‘rsatkichlar' }}</h3>
            <span class="ml-auto text-[13px] text-[color:var(--n-muted)]">
               {{ board.scored ? '100 ball' : 'ball qo‘yilmaydi' }}
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
                     <template v-if="r.w.kpi.survey_ball !== null && r.w.kpi.survey_ball !== undefined">
                        <span>Operatsion ball</span>
                        <span></span>
                        <span class="font-semibold text-right">{{ r.w.kpi.total }}</span>
                        <span>Ziyoratchi bahosi</span>
                        <span class="text-[color:var(--n-muted)]">× 0,5</span>
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

                  <p v-if="board.scored && r.w.kpi && r.w.kpi.min_sample"
                     class="text-[12.5px] text-[color:var(--n-muted)]">
                     {{ r.w.kpi.base }} murojaat · qo'lda baholanadi
                  </p>

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
                     <!-- Straight from the server's composition — no pay maths here. -->
                     <div v-if="r.w.salary"
                        class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
                        <span class="text-[color:var(--n-muted)]">Fiks</span>
                        <span class="text-right">{{ soum(r.w.salary.fiks) }}</span>
                        <!-- Stated even at 1,0: a Mukofot silently carrying a ×1,2 is a
                             payslip nobody can check. -->
                        <template v-if="r.w.salary.sg !== null">
                           <span class="text-[color:var(--n-muted)]">Yuklama · SG</span>
                           <span class="text-right">{{ sgText(r.w.salary) }}</span>
                        </template>
                        <template v-if="r.w.salary.mukofot">
                           <span class="text-[color:var(--n-muted)]">
                              Mukofot
                              <span v-if="r.w.salary.k > 1" class="text-[11.5px]">
                                 ({{ soum(r.w.salary.mukofot_base) }} × {{ r.w.salary.k }})
                              </span>
                           </span>
                           <span class="text-right">+{{ soum(r.w.salary.mukofot) }}</span>
                        </template>
                        <template v-if="r.w.salary.yuklama">
                           <span class="text-[color:var(--n-muted)]">Yuklama to'lovi</span>
                           <span class="text-right">+{{ soum(r.w.salary.yuklama) }}</span>
                        </template>
                        <template v-if="r.w.salary.sovrin">
                           <span class="text-[color:var(--n-muted)]">Sovrin</span>
                           <span class="text-right">+{{ soum(r.w.salary.sovrin) }}</span>
                        </template>
                        <template v-if="r.w.salary.jarima">
                           <span class="text-[color:var(--n-muted)]">
                              Jarima · {{ jarimaWhy(r.w.salary) }}
                           </span>
                           <span class="text-right">−{{ soum(r.w.salary.jarima) }}</span>
                        </template>
                        <template v-if="r.w.salary.jarima_capped">
                           <span class="col-span-2 text-[12px] text-[color:var(--n-muted)]">
                              30% chegara qo'llandi
                           </span>
                        </template>
                        <span class="font-semibold">Oylik</span>
                        <b class="text-right">{{ soum(r.w.salary.total) }} so'm</b>
                     </div>
                     <!-- A group with no Daraja is an unanswered question, not a premium
                          group: SG counts it as a WHOLE group and says so here rather
                          than quietly paying half a load. -->
                     <p v-if="r.w.sg_tier_unset"
                        class="text-[12.5px] text-[color:var(--n-muted)]">
                        {{ r.w.sg_tier_unset }} ta guruhda daraja belgilanmagan
                     </p>
                     <p v-if="r.w.sg_over_ceiling"
                        class="text-[12.5px] text-[color:var(--n-muted)]">
                        2,0 SG dan ortiq · CEO ruxsati kerak
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

      <!-- The PAY SCALE — the full nazoratchi's alone, and its own panel below the
           people on purpose: an amount edited inline beside one name reads as that
           person's salary, and this moves everyone on the rung. -->
      <section v-if="canSetPayScale && s.categories.length" class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">Toifalar va fiks</h3>
         </div>
         <div class="mt-3 space-y-0.5">
            <div v-for="c in s.categories" :key="c.code"
               class="flex items-center gap-3 py-2.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">
               <span class="flex-1 min-w-0">
                  <span class="block text-[14px] font-semibold truncate">{{ c.title }}</span>
                  <span class="block text-[12px] text-[color:var(--n-muted)]">
                     {{ countIn(c.code) }} ta ellikboshi
                  </span>
               </span>
               <input type="number" min="0" step="100000"
                  class="w-36 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums text-right"
                  :value="c.fiks" @change="saveCategoryFiks(c.code, $event)" />
               <span class="text-[12.5px] text-[color:var(--n-muted)]">so'm</span>
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
function countIn(code: string) {
   return s.workers.filter((w) => w.role === 'ellikboshi' && w.category === code).length
}

// The ladder is needed to render an unvon and to fill the picker; the board itself
// arrives with the period slice the store already loads.
onMounted(() => { void s.loadCategories() })

/** «16 900 000» — thin-space thousands, the way a payslip writes it. */
const soum = (v: number) => v.toLocaleString('ru-RU')

/** The MERIT behind a fault percentage: «javobsiz 10%» is «javob berilgan 90%».
 *  Both halves of a scored row then move the same way — up is better — so the ball
 *  beside it never reads as payment for the fault. One decimal, because the server
 *  already rounded to one and 89.90000000000001 is what subtraction does to a float. */
const pct100 = (fault: number) => Math.round((100 - fault) * 10) / 10

/** What the jarima line is FOR — the §8 rows that actually fired. */
function jarimaWhy(sal: NonNullable<Worker['salary']>): string {
   const parts: string[] = []
   if (sal.day_javobsiz) parts.push(`${sal.day_javobsiz} ta kunduzgi javobsiz`)
   if (sal.sla_breaches) parts.push(`${sal.sla_breaches} ta SLA buzilish`)
   if (sal.bot_block) parts.push('bot bloklangan')
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

/** §4 — the load line: the month's SG, and the K it produced when K actually bit.
 *  Both numbers come from the server; this only formats them. Shown even at 1,0,
 *  because «Yuklama · SG 1,0» is what tells a reader the ×1,2 they are NOT seeing
 *  elsewhere is genuinely absent. */
function sgText(sal: NonNullable<Worker['salary']>): string {
   const sg = (sal.sg ?? 0).toFixed(1).replace('.', ',')
   return sal.k > 1 ? `${sg} · K ${sal.k.toFixed(1).replace('.', ',')}` : sg
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

async function saveCategory(w: Worker, ev: Event) {
   const code = (ev.target as HTMLSelectElement).value || null
   if (!(await s.setCategory(w, code))) {
      toast.error("Saqlanmadi — ellikboshi ro'yxatda topilmadi")
   }
}

/** §3's pay SCALE. Editing one rung moves every leader on it, which is why it is the
 *  full nazoratchi's alone and why it sits in its own panel rather than inline on a
 *  person's card — an amount edited next to one name reads as that person's salary. */
async function saveCategoryFiks(code: string, ev: Event) {
   const raw = (ev.target as HTMLInputElement).value.replace(/\s+/g, '')
   const fiks = Number(raw)
   if (raw === '' || Number.isNaN(fiks) || fiks < 0) {
      toast.error('Summani tekshiring')
      return
   }
   if (await s.setCategoryFiks(code, fiks)) toast.success('Toifa fiksi yangilandi')
   else toast.error('Saqlanmadi')
}

/** A row is a way in to the person behind it — same rule as the Reyting. */
function open(id: number) {
   if (id) router.push(`/ai/nazorat/xodim/${id}`)
}
</script>

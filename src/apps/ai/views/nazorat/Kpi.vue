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
                        {{ board.scored ? (r.w.kpi ? r.w.kpi.total : '—') : gradable(r.w) }}
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
                  <!-- §5.4's own entry bar, said out loud: the title is decided AMONG
                       leaders with 10+ gradable murojaat AND a full group's load, so a
                       higher ball on a small month neither wins nor blocks — without
                       this line the star on a 35 next to an unstarred 80 reads as a bug
                       (owner, 2026-08-15). v4.4 lowered the card count and added the SG
                       half; the sentence has to move with the document. -->
                  <span v-if="r.best" class="badge badge-indigo">
                     <font-awesome-icon icon="star" class="w-3 h-3" />
                     Oyning ellikboshisi — 10+ murojaat, 1,0 SG va kamida 90 ball
                  </span>

                  <!-- The four components in the reglament's own order, one per line,
                       so a person can be checked against the document. «—» is a vaqt
                       the period produced no daytime evidence of. -->
                  <div v-if="board.scored && r.w.kpi"
                     class="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 text-[13.5px] tabular-nums">
                     <span>Bajarilish</span>
                     <span class="text-[color:var(--n-muted)]">{{ r.w.kpi.bajarilish_pct }}%</span>
                     <span class="font-semibold text-right">{{ r.w.kpi.bajarilish_ball }}/40</span>
                     <span>Javobsiz</span>
                     <span class="text-[color:var(--n-muted)]">{{ r.w.kpi.javobsiz_pct }}%</span>
                     <span class="font-semibold text-right">{{ r.w.kpi.javobsiz_ball }}/25</span>
                     <span>Takroriy</span>
                     <span class="text-[color:var(--n-muted)]">{{ r.w.kpi.takroriy_pct }}%</span>
                     <span class="font-semibold text-right">{{ r.w.kpi.takroriy_ball }}/15</span>
                     <span>Javob vaqti</span>
                     <span class="text-[color:var(--n-muted)]">
                        {{ r.w.kpi.vaqt_measured ? dur(r.w.day_avg_response_seconds) : '—' }}
                     </span>
                     <span class="font-semibold text-right">
                        {{ r.w.kpi.vaqt_measured ? r.w.kpi.vaqt_ball + '/20' : '—' }}
                     </span>
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
                     {{ r.w.kpi.base }} ta murojaat — reglament bo'yicha qo'lda baholanadi (§5.5)
                  </p>

                  <!-- §3: category -> unvon + fiks, §5: ball -> mukofot. Only a REAL
                       ellikboshi has a pool row to hold a category — the doctor sits on
                       this board by display rule alone and is not paid by this table.
                       WHO MAY WRITE WHAT (owner, 2026-08-18): the ellikboshi controller
                       PLACES people on a rung — they run the leaders and know who is
                       where — while what a rung PAYS is the full nazoratchi's, below.
                       Nobody types a number of years any more. -->
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
                     <!-- §1 + §2 − §8, straight from the server's composition. The
                          jarima line carries its own health warnings: draft sums
                          (CEO), and the 30% cap when it bit. -->
                     <div v-if="r.w.salary"
                        class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
                        <span class="text-[color:var(--n-muted)]">Fiks</span>
                        <span class="text-right">{{ soum(r.w.salary.fiks) }}</span>
                        <!-- §4 — the month's load. Stated even at 1,0, because a
                             payslip whose Mukofot silently carries a ×1,2 somewhere is
                             a payslip nobody can check. The multiplication is written
                             out for the same reason: «5 000 000 × 1,2» is arguable,
                             a lone 6 000 000 is not. -->
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
                           <span class="text-[color:var(--n-muted)]">Yuklama to'lovi (§4.3)</span>
                           <span class="text-right">+{{ soum(r.w.salary.yuklama) }}</span>
                        </template>
                        <template v-if="r.w.salary.sovrin">
                           <span class="text-[color:var(--n-muted)]">Sovrin · Oyning ellikboshisi</span>
                           <span class="text-right">+{{ soum(r.w.salary.sovrin) }}</span>
                        </template>
                        <template v-if="r.w.salary.jarima">
                           <span class="text-[color:var(--n-muted)]">
                              Jarima · {{ jarimaWhy(r.w.salary) }}
                              <span class="text-[11.5px]">(tasdiqlanmagan jarima)</span>
                           </span>
                           <span class="text-right">−{{ soum(r.w.salary.jarima) }}</span>
                        </template>
                        <template v-if="r.w.salary.jarima_capped">
                           <span class="col-span-2 text-[12px] text-[color:var(--n-muted)]">
                              30% chegara qo'llandi (§11)
                           </span>
                        </template>
                        <span class="font-semibold">Oylik</span>
                        <b class="text-right">{{ soum(r.w.salary.total) }} so'm</b>
                     </div>
                     <!-- A group with no Daraja is an unanswered question, not a
                          premium group: SG counts it as a WHOLE group (neutral both
                          ways) and asks here rather than quietly paying half a load. -->
                     <p v-if="r.w.sg_tier_unset"
                        class="text-[12.5px] text-[color:var(--n-muted)]">
                        {{ r.w.sg_tier_unset }} ta guruhda daraja belgilanmagan — to'liq
                        guruh sifatida hisoblandi. Guruhlar sahifasida darajani tanlang.
                     </p>
                     <p v-if="r.w.sg_over_ceiling"
                        class="text-[12.5px] text-[color:var(--n-muted)]">
                        Yuklama 2,0 SG dan ortiq — reglament bo'yicha CEO ning yozma
                        ruxsati talab qilinadi (§4.3).
                     </p>
                     <p v-else class="text-[color:var(--n-muted)]">
                        Toifa tanlanmagan — fiks aniqlanmaydi
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

      <!-- §3's PAY SCALE — the full nazoratchi's alone (owner, 2026-08-18). Its own
           panel, below the people, on purpose: an amount edited inline next to one
           name reads as that person's salary, and this moves everyone on the rung. -->
      <section v-if="canSetPayScale && s.categories.length" class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">Toifalar va fiks</h3>
            <span class="ml-auto text-[13px] text-[color:var(--n-muted)]">§3</span>
         </div>
         <p class="mt-1 text-[12.5px] text-[color:var(--n-muted)]">
            Bu yerdagi summa shu toifadagi <b>barcha</b> ellikboshilarning fiksini
            o'zgartiradi. Kim qaysi toifada — har bir ellikboshining kartochkasida.
         </p>
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

/** What the jarima line is FOR — the §8 rows that actually fired. */
function jarimaWhy(sal: NonNullable<Worker['salary']>): string {
   const parts: string[] = []
   if (sal.day_javobsiz) parts.push(`${sal.day_javobsiz} ta kunduzgi javobsiz`)
   if (sal.sla_breaches) parts.push(`${sal.sla_breaches} ta SLA buzilish`)
   if (sal.bot_block) parts.push('bot bloklangan')
   return parts.join(' + ')
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

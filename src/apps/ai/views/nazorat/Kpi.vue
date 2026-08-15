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
           staj, oylik), and a phone row that tries to say all three at once answers
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
            <div v-for="r in board.rows" :key="r.w.telegram_id">
               <button type="button"
                  class="row-tap w-full flex items-center gap-3 py-3 -mx-2 px-2 rounded-[1.125rem]"
                  @click="toggle(r.w.telegram_id)">
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
                     :class="openId === r.w.telegram_id ? 'rotate-90' : ''" />
               </button>

               <div v-if="openId === r.w.telegram_id"
                  class="mx-1 mb-2 px-4 py-3 rounded-[1rem] bg-[color:var(--n-soft,rgba(0,0,0,0.04))] space-y-3">
                  <span v-if="r.best" class="badge badge-indigo">
                     <font-awesome-icon icon="star" class="w-3 h-3" />
                     Oyning ellikboshisi
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

                  <!-- §1: staj -> unvon + fiks, §2: ball -> mukofot. Only a REAL
                       ellikboshi has a pool row to hold staj — the doctor sits on this
                       board by display rule alone and is not paid by this table. The
                       staj write is the admin's; everyone else reads. -->
                  <div v-if="r.w.role === 'ellikboshi'"
                     class="pt-2 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] space-y-1.5 text-[13.5px]">
                     <div class="flex items-center gap-2">
                        <span class="text-[color:var(--n-muted)]">Ish staji</span>
                        <template v-if="isAdmin">
                           <input type="number" min="0" max="60" step="0.5"
                              class="w-16 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums"
                              :value="r.w.staj_years ?? ''" placeholder="—"
                              @click.stop @change="saveStaj(r.w, $event)" />
                           <span class="text-[color:var(--n-muted)]">yil</span>
                        </template>
                        <span v-else class="font-semibold tabular-nums">
                           {{ r.w.staj_years !== null ? r.w.staj_years + ' yil' : '—' }}
                        </span>
                        <span v-if="r.w.fiks_info" class="badge badge-indigo ml-auto">
                           {{ r.w.fiks_info.unvon }}
                        </span>
                     </div>
                     <!-- §1 + §2 − §8, straight from the server's composition. The
                          jarima line carries its own health warnings: draft sums
                          (CEO), and the 30% cap when it bit. -->
                     <div v-if="r.w.salary"
                        class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
                        <span class="text-[color:var(--n-muted)]">Fiks</span>
                        <span class="text-right">{{ soum(r.w.salary.fiks) }}</span>
                        <template v-if="r.w.salary.mukofot">
                           <span class="text-[color:var(--n-muted)]">Mukofot</span>
                           <span class="text-right">+{{ soum(r.w.salary.mukofot) }}</span>
                        </template>
                        <template v-if="r.w.salary.jarima">
                           <span class="text-[color:var(--n-muted)]">
                              Jarima · {{ r.w.salary.sla_breaches }} ta SLA buzilish
                              <span class="text-[11.5px]">(tasdiqlanmagan jarima)</span>
                           </span>
                           <span class="text-right">−{{ soum(r.w.salary.jarima) }}</span>
                        </template>
                        <template v-if="r.w.salary.jarima_capped">
                           <span class="col-span-2 text-[12px] text-[color:var(--n-muted)]">
                              30% chegara qo'llandi (§8)
                           </span>
                        </template>
                        <span class="font-semibold">Oylik</span>
                        <b class="text-right">{{ soum(r.w.salary.total) }} so'm</b>
                     </div>
                     <p v-else class="text-[color:var(--n-muted)]">
                        Staj kiritilmagan — fiks aniqlanmaydi
                     </p>
                  </div>

                  <button type="button" class="text-[13px] font-semibold text-[color:var(--n-accent,#4a3aa7)]"
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
import { computed, ref } from 'vue'
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

/** Staj decides pay, so writing it is the admin's alone — mirrors the API's rule
 *  rather than trusting the client: everyone else gets plain text. */
const isAdmin = computed(() => auth.role === 'admin')

const openId = ref<number | null>(null)
const toggle = (id: number) => { openId.value = openId.value === id ? null : id }

const gradable = (w: Worker) => w.completed + w.reopened + w.never_accepted

/** «16 900 000» — thin-space thousands, the way a payslip writes it. */
const soum = (v: number) => v.toLocaleString('ru-RU')

/** The one quiet line under the name: pay for a leader, the job for everyone else.
 *  The total comes composed from the server (§1 + §2 − §8) — no pay maths here. */
function subline(r: { w: Worker; job: string }): string {
   if (r.w.role === 'ellikboshi') {
      if (!r.w.salary || !r.w.fiks_info) return 'Staj kiritilmagan'
      return `${r.w.fiks_info.unvon} · oylik ${soum(r.w.salary.total)} so'm`
   }
   return r.job
}

async function saveStaj(w: Worker, ev: Event) {
   const raw = (ev.target as HTMLInputElement).value.trim()
   const years = raw === '' ? null : Number(raw)
   if (years !== null && (Number.isNaN(years) || years < 0 || years > 60)) {
      toast.error("Staj 0–60 yil oralig'ida bo'lsin")
      return
   }
   if (!(await s.setStaj(w, years))) {
      toast.error("Saqlanmadi — ellikboshi ro'yxatda topilmadi")
   }
}

/** A row is a way in to the person behind it — same rule as the Reyting. */
function open(id: number) {
   if (id) router.push(`/ai/nazorat/xodim/${id}`)
}
</script>

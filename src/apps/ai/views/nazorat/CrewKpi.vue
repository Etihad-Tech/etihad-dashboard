<template>
   <div class="space-y-3">
      <div v-if="loading && !board" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Yuklanmoqda…
      </div>
      <div v-else-if="error" class="card py-10 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">Ma'lumot yuklanmadi.</p>
         <button class="btn-primary" @click="load()">Qayta urinish</button>
      </div>

      <template v-else-if="board">
         <!-- A month before the scheme starts paying is shown, not paid (owner, 26.09:
              «для сентября тоже вывести было бы не плохо»). Said first, so nobody reads a
              trial sheet as a payslip. -->
         <div v-if="board.trial" class="card p-4 text-[13.5px] leading-snug">
            <b>Sinov hisobi.</b> {{ monthName(board.period) }} to'lanmaydi — ma'lumot uchun.
            To'lov {{ monthName(board.first_paid_period) }}dan boshlanadi.
         </div>

         <!-- THE MONTH: the plan share (V) is one number for everybody, so it is stated
              once, above the people, with where it came from. -->
         <section class="card p-5 n-enter">
            <div class="flex items-baseline gap-2.5">
               <h3 class="n-h">Oylik reja</h3>
               <span class="ml-auto text-[13px] text-[color:var(--n-muted)] tabular-nums">
                  reja: {{ board.flown.plan.toLocaleString('ru-RU') }} kishi
               </span>
            </div>
            <div class="mt-2 flex items-end gap-3">
               <span class="text-[34px] leading-none font-bold tabular-nums tracking-[-0.04em]">
                  {{ board.flown.value === null ? '—' : board.flown.value.toLocaleString('ru-RU') }}
               </span>
               <span class="pb-1 text-[14px] text-[color:var(--n-muted)]">
                  uchgan · bajarilishi {{ pct(board.flown.v) }}
               </span>
            </div>
            <p class="mt-1.5 text-[12.5px] text-[color:var(--n-muted)] leading-snug">{{ flownSource }}</p>

            <details v-if="board.flown.crm && board.flown.crm.departures.length" class="mt-2">
               <summary class="text-[13px] font-semibold cursor-pointer">
                  CRM bo'yicha reyslar ({{ board.flown.crm.departures.length }})
               </summary>
               <div class="mt-2 space-y-1 text-[13px] tabular-nums">
                  <div v-for="d in board.flown.crm.departures" :key="d.departure_id" class="flex gap-3">
                     <span class="w-24 shrink-0">{{ d.departure_date }}</span>
                     <span class="flex-1 min-w-0 truncate text-[color:var(--n-muted)]">{{ d.package_name || '—' }}</span>
                     <span class="font-semibold">{{ d.pilgrims }}</span>
                  </div>
               </div>
            </details>

            <!-- The hand figure — for when the CRM is unreachable or its number is wrong.
                 Always wins over the CRM; a source is mandatory. -->
            <div class="mt-3 flex flex-wrap items-center gap-2">
               <input v-model="flownInput" type="number" min="0" placeholder="Qo'lda: son"
                  class="w-32 px-3 py-2 rounded-xl border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[14px] tabular-nums" />
               <input v-model="flownNote" type="text" placeholder="Manba (masalan: manifest)"
                  class="flex-1 min-w-[10rem] px-3 py-2 rounded-xl border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[14px]" />
               <button class="btn-ghost" :disabled="busy" @click="saveFlown()">Saqlash</button>
               <button v-if="board.flown.manual !== null" class="btn-ghost" :disabled="busy"
                  @click="clearFlown()">CRM soniga qaytarish</button>
            </div>
         </section>

         <!-- THE SURVEY HALF, per city: every crew member of a city shares it. -->
         <section class="card p-5 n-enter">
            <div class="flex items-baseline gap-2.5">
               <h3 class="n-h">Ziyoratchilar so'rovi</h3>
               <span class="ml-auto text-[13px] text-[color:var(--n-muted)]">ballning {{ surveyPct }}%</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3">
               <div v-for="c in (['makka', 'madina'] as const)" :key="c" class="card-inset p-3.5">
                  <p class="text-[12.5px] text-[color:var(--n-muted)]">{{ cityName(c) }}</p>
                  <p class="text-[26px] leading-tight font-bold tabular-nums">
                     {{ board.survey[c].ball === null ? '—' : fmtBall(board.survey[c].ball) }}
                  </p>
                  <p class="text-[12px] text-[color:var(--n-muted)] leading-snug">
                     {{ board.survey[c].used }} ta so'rov hisobga kirdi
                     <template v-if="board.survey[c].surveys !== board.survey[c].used">
                        ({{ board.survey[c].surveys }} tadan)</template>
                  </p>
               </div>
            </div>
            <p class="mt-2 text-[12.5px] text-[color:var(--n-muted)] leading-snug">
               So'rov bo'lmasa yoki guruhning yarmidan kami so'ralgan bo'lsa, ball faqat bot va CRM bo'yicha.
            </p>
         </section>

         <!-- THE PEOPLE, by city. One number per collapsed row — the month's pay — and the
              whole calculation behind the tap. -->
         <section v-for="grp in groups" :key="grp.city" class="card p-5 n-enter">
            <div class="flex items-baseline gap-2.5">
               <h3 class="n-h">{{ cityName(grp.city) }}</h3>
               <span class="ml-auto text-[13px] text-[color:var(--n-muted)]">{{ grp.rows.length }} xodim</span>
            </div>
            <div class="mt-2 space-y-0.5">
               <div v-for="r in grp.rows" :key="r.id">
                  <button type="button" class="row-tap w-full flex items-center gap-3 py-3 -mx-2 px-2 rounded-[1.125rem]"
                     @click="openId = openId === r.id ? null : r.id">
                     <span class="min-w-0 flex-1 text-left">
                        <span class="block text-[15px] font-semibold tracking-[-0.015em] truncate">{{ personName(r) }}</span>
                        <span class="block mt-0.5 text-[12.5px] text-[color:var(--n-faint)] tabular-nums truncate">
                           {{ subline(r) }}
                        </span>
                     </span>
                     <span class="shrink-0 text-right">
                        <span class="block text-[20px] font-bold tabular-nums leading-none tracking-[-0.03em]">
                           {{ r.pay.total === null ? '—' : sar(r.pay.total) }}
                        </span>
                        <span class="block text-[12px] text-[color:var(--n-muted)] mt-1">
                           {{ r.ball === null ? (r.min_sample ? 'ball kutilmoqda' : 'ball yo\'q') : `${r.ball} ball · Q ${r.q}%` }}
                        </span>
                     </span>
                     <font-awesome-icon icon="chevron-right"
                        class="w-3 h-3 text-[color:var(--n-faint)] shrink-0 transition-transform duration-200"
                        :class="openId === r.id ? 'rotate-90' : ''" />
                  </button>

                  <div v-if="openId === r.id"
                     class="mx-1 mb-2 px-4 py-3 rounded-[1rem] bg-[color:var(--n-soft,rgba(0,0,0,0.04))] space-y-3 text-[13.5px]">
                     <!-- The ball, component by component. -->
                     <div v-if="r.ops" class="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 tabular-nums">
                        <span>Bajarilgani</span>
                        <span class="text-[color:var(--n-muted)]">{{ r.ops.bajarish_pct }}%</span>
                        <span class="font-semibold text-right">{{ r.ops.bajarish_ball }}/{{ r.ops.weights.bajarish }}</span>
                        <span>Javob berilgani</span>
                        <span class="text-[color:var(--n-muted)]">{{ hundred(r.ops.javobsiz_pct) }}%</span>
                        <span class="font-semibold text-right">{{ r.ops.javobsiz_ball }}/{{ r.ops.weights.javobsiz }}</span>
                        <span>Takrorlanmagani</span>
                        <span class="text-[color:var(--n-muted)]">{{ hundred(r.ops.takroriy_pct) }}%</span>
                        <span class="font-semibold text-right">{{ r.ops.takroriy_ball }}/{{ r.ops.weights.takroriy }}</span>
                        <span>Javob tezligi</span>
                        <span class="text-[color:var(--n-muted)]">{{ r.ops.tezlik_measured ? dur(r.cards.day_avg_response_seconds) : '—' }}</span>
                        <span class="font-semibold text-right">{{ r.ops.tezlik_ball }}/{{ r.ops.weights.tezlik }}</span>
                        <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">Bot va CRM</span>
                        <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] text-[color:var(--n-muted)]">× {{ 100 - surveyPct }}%</span>
                        <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-semibold text-right">{{ r.ops.total }}</span>
                        <span>So'rov ({{ cityName(r.location) }})</span>
                        <span class="text-[color:var(--n-muted)]">× {{ surveyPct }}%</span>
                        <span class="font-semibold text-right">{{ r.survey_ball === null ? '—' : fmtBall(r.survey_ball) }}</span>
                        <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-semibold">Umumiy ball</span>
                        <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] text-[color:var(--n-muted)]">
                           {{ r.q === null ? '' : `KPI ning ${r.q}%` }}
                        </span>
                        <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-bold text-right">
                           {{ r.ball === null ? '—' : r.ball }}<template v-if="r.hand_ball"> (qo'lda)</template>
                        </span>
                     </div>
                     <p v-else class="text-[color:var(--n-muted)]">Bu oyda baholanadigan murojaat yo'q.</p>

                     <!-- Under the minimum sample: the ball is written by hand. -->
                     <div v-if="r.min_sample" class="card-inset p-3 space-y-2">
                        <p class="leading-snug">
                           Murojaatlar kam ({{ r.ops ? r.ops.base : 0 }} ta) — ballni Sifat nazorati qo'lda qo'yadi.
                        </p>
                        <div class="flex flex-wrap items-center gap-2">
                           <input type="number" min="0" max="100" placeholder="ball"
                              class="w-24 px-2 py-1.5 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent tabular-nums text-right"
                              :value="r.manual?.ball ?? ''" @change="saveBall(r, $event)" />
                           <input type="text" placeholder="izoh"
                              class="flex-1 min-w-[8rem] px-2 py-1.5 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent"
                              :value="r.manual?.ball_note ?? ''" @change="saveBallNote(r, $event)" />
                        </div>
                     </div>

                     <!-- The month in SAR. Every line that makes the total, in order. -->
                     <div class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 tabular-nums">
                        <span>Maosh bazasi</span>
                        <span class="text-right">
                           <input v-if="board.can_set_pay" type="number" min="0" step="100"
                              class="w-28 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-right"
                              :value="r.salary_sar ?? ''" @change="savePay(r, 'salary_sar', $event)" />
                           <template v-else>{{ sar(r.salary_sar) }}</template>
                        </span>
                        <template v-if="board.can_set_pay">
                           <span>Ishga kelgan sana</span>
                           <span class="text-right">
                              <input type="date" class="px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent"
                                 :value="r.work_start ?? ''" @change="savePay(r, 'work_start', $event)" />
                           </span>
                           <span>Ishdan ketgan sana</span>
                           <span class="text-right">
                              <input type="date" class="px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent"
                                 :value="r.work_end ?? ''" @change="savePay(r, 'work_end', $event)" />
                           </span>
                        </template>
                        <template v-if="r.pay.missing_salary">
                           <span class="col-span-2 text-[color:var(--n-muted)]">
                              Maosh bazasi kiritilmagan — oylik hisoblanmaydi.
                           </span>
                        </template>
                        <template v-else>
                           <template v-if="r.pay.worked_days !== r.pay.month_days">
                              <span>Ishlagan kunlar</span>
                              <span class="text-right">{{ r.pay.worked_days }} / {{ r.pay.month_days }}</span>
                           </template>
                           <span>Doimiy qism ({{ r.pay.doimiy_pct }}%)</span>
                           <span class="text-right font-semibold">{{ sar(r.pay.doimiy) }}</span>
                           <span>KPI ({{ 100 - r.pay.doimiy_pct }}%)</span>
                           <span class="text-right font-semibold">{{ r.pay.kpi === null ? 'kutilmoqda' : sar(r.pay.kpi) }}</span>
                           <span class="col-span-2 -mt-1 text-[12.5px] text-[color:var(--n-muted)]">{{ kpiLine(r) }}</span>
                           <template v-if="r.pay.airport_trips">
                              <span>Aeroport: {{ r.pay.airport_trips }} × {{ sar(r.pay.airport_sum) }}</span>
                              <span class="text-right font-semibold">{{ sar(r.pay.airport) }}</span>
                           </template>
                           <template v-if="r.pay.ziyorat_trips">
                              <span>Makka ziyorati: {{ r.pay.ziyorat_trips }} × {{ sar(r.pay.ziyorat_sum) }}</span>
                              <span class="text-right font-semibold">{{ sar(r.pay.ziyorat) }}</span>
                           </template>
                           <template v-if="r.pay.jarima">
                              <span>Jarima <span class="text-[color:var(--n-muted)]">— {{ fineWhy(r) }}</span></span>
                              <span class="text-right font-semibold">{{ sar(-r.pay.jarima) }}</span>
                           </template>
                           <span>Qo'lda tuzatish</span>
                           <span class="text-right font-semibold">{{ r.pay.manual_adjust ? sar(r.pay.manual_adjust) : '—' }}</span>
                           <!-- Amount and reason together: a non-zero correction without its
                                reason is refused, so they are one save, not two. -->
                           <div class="col-span-2 flex flex-wrap items-center gap-2">
                              <input v-model="adj(r).amount" type="number" step="10" placeholder="± SAR"
                                 class="w-24 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-right" />
                              <input v-model="adj(r).reason" type="text" placeholder="sababi (majburiy)"
                                 class="flex-1 min-w-[8rem] px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent" />
                              <button class="btn-ghost !py-1 !px-3 text-[13px]" @click="saveAdjust(r)">Saqlash</button>
                           </div>
                           <p v-if="r.manual?.adjust && r.manual?.adjust_reason"
                              class="col-span-2 -mt-1 text-[12px] text-[color:var(--n-muted)]">
                              {{ r.manual.adjust_reason }}<template v-if="r.manual.updated_by"> · {{ r.manual.updated_by }}</template>
                           </p>
                           <span class="pt-1.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-semibold">Jami</span>
                           <span class="pt-1.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] text-right text-[16px] font-bold">{{ sar(r.pay.total) }}</span>
                        </template>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         <div v-if="!board.rows.length" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
            Ishchi guruh ro'yxatida faol xodim yo'q.
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '../../../../api'
import { useToast } from '../../../../composables/useToast'
import { useNazoratStore } from '../../stores/nazorat'
import { dur } from './shared'
import {
   apiError, cityName, monthName, pct, personName, sar,
   type CrewBoard, type CrewRow,
} from './crew'

const s = useNazoratStore()
const toast = useToast()

const board = ref<CrewBoard | null>(null)
const loading = ref(false)
const error = ref(false)
const busy = ref(false)
const openId = ref<number | null>(null)
const flownInput = ref<string>('')
const flownNote = ref('')

async function load() {
   loading.value = true
   error.value = false
   try {
      board.value = (await api.get(`/control/crew/board?month=${encodeURIComponent(s.kpiMonth)}`)).data
      flownInput.value = board.value?.flown.manual !== null && board.value?.flown.manual !== undefined
         ? String(board.value.flown.manual) : ''
      flownNote.value = board.value?.flown.manual_note || ''
   } catch {
      error.value = true
   } finally {
      loading.value = false
   }
}

onMounted(load)
watch(() => s.kpiMonth, () => { openId.value = null; void load() })

const surveyPct = computed(() => Number(board.value?.settings.survey_pct ?? 50))

const flownSource = computed(() => {
   const f = board.value?.flown
   if (!f) return ''
   if (f.source === 'manual') {
      return `Qo'lda kiritilgan${f.manual_note ? ` (${f.manual_note})` : ''}${f.manual_by ? ` · ${f.manual_by}` : ''}.`
         + (f.crm ? ` CRM bo'yicha: ${f.crm.count}.` : '')
   }
   if (f.source === 'crm') return 'CRM bo\'yicha: shu oyda uchgan, guruhga joylashtirilgan ziyoratchilar.'
   return f.crm_error === 'not_configured'
      ? 'CRM ulanmagan — sonni qo\'lda kiriting. Son bo\'lmaguncha KPI hisoblanmaydi.'
      : 'CRM javob bermadi — sonni qo\'lda kiriting. Son bo\'lmaguncha KPI hisoblanmaydi.'
})

const groups = computed(() => {
   const rows = board.value?.rows || []
   return (['makka', 'madina'] as const)
      .map((city) => ({ city, rows: rows.filter((r) => r.location === city) }))
      .filter((g) => g.rows.length)
})

const fmtBall = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')
const hundred = (v: number) => Math.round((100 - v) * 10) / 10

function subline(r: CrewRow): string {
   const n = r.ops ? r.ops.base : 0
   const trips = r.pay.airport_trips + r.pay.ziyorat_trips
   return [`${n} murojaat`, trips ? `${trips} chiqish` : '', r.salary_sar === null ? 'maosh kiritilmagan' : '']
      .filter(Boolean).join(' · ')
}

function kpiLine(r: CrewRow): string {
   const p = r.pay
   if (p.pending.includes('ball')) return 'Ball qo\'lda qo\'yilishini kutmoqda.'
   if (p.pending.includes('flown')) return 'Oylik reja soni yo\'q — CRM yoki qo\'lda kiritilgan son kerak.'
   return `${sar(p.kpi_target)} × ${p.q}% × ${pct(p.v)}`
}

function fineWhy(r: CrewRow): string {
   const p = r.pay
   return [p.bot_block ? 'botni bloklagan' : '',
      p.false_completions ? `${p.false_completions} ta soxta «Bajarildi»` : '',
      p.xatolik_abuse ? 'ketma-ket asossiz «Xatolik»' : ''].filter(Boolean).join(', ')
}

async function saveFlown() {
   const raw = flownInput.value === '' ? null : Number(flownInput.value)
   if (raw === null) return clearFlown()
   busy.value = true
   try {
      await api.put(`/control/crew/month/${board.value!.period}/flown`, { value: raw, note: flownNote.value })
      toast.success('Saqlandi')
      await load()
   } catch (e) {
      toast.error(apiError(e))
   } finally {
      busy.value = false
   }
}

async function clearFlown() {
   busy.value = true
   try {
      await api.put(`/control/crew/month/${board.value!.period}/flown`, { value: null, note: null })
      toast.success('CRM soni qo\'llanadi')
      await load()
   } catch (e) {
      toast.error(apiError(e))
   } finally {
      busy.value = false
   }
}

async function manual(r: CrewRow, patch: Record<string, unknown>, ok = 'Saqlandi') {
   try {
      await api.put(`/control/crew/manual/${board.value!.period}/${encodeURIComponent(r.username)}`, patch)
      toast.success(ok)
      await load()
      openId.value = r.id
   } catch (e) {
      toast.error(apiError(e))
   }
}

function numberOrNull(ev: Event): number | null {
   const v = (ev.target as HTMLInputElement).value
   return v === '' ? null : Number(v)
}

const saveBall = (r: CrewRow, ev: Event) => manual(r, { ball: numberOrNull(ev) })
const saveBallNote = (r: CrewRow, ev: Event) => manual(r, { ball_note: (ev.target as HTMLInputElement).value })

/** The correction being typed, per person — seeded from what is saved. */
const adjEdits = ref<Record<number, { amount: string; reason: string }>>({})
function adj(r: CrewRow) {
   if (!adjEdits.value[r.id]) {
      adjEdits.value[r.id] = {
         amount: r.manual?.adjust ? String(r.manual.adjust) : '',
         reason: r.manual?.adjust_reason || '',
      }
   }
   return adjEdits.value[r.id]
}
function saveAdjust(r: CrewRow) {
   const e = adj(r)
   const v = e.amount === '' ? 0 : Number(e.amount)
   void manual(r, { adjust: v, adjust_reason: v ? e.reason : null })
}
watch(board, () => { adjEdits.value = {} })

async function savePay(r: CrewRow, field: 'salary_sar' | 'work_start' | 'work_end', ev: Event) {
   const raw = (ev.target as HTMLInputElement).value
   const value = raw === '' ? null : field === 'salary_sar' ? Number(raw) : raw
   try {
      await api.put(`/control/crew/staff/${r.id}/pay`, { [field]: value })
      toast.success('Saqlandi')
      await load()
      openId.value = r.id
   } catch (e) {
      toast.error(apiError(e))
   }
}
</script>

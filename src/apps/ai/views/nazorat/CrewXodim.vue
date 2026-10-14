<template>
   <!-- A Tashkiliy guruh member's month (owner, 14.10.2026: «как у kpi ellikboshi… можно
        было зайти в страницу сотрудника»). Everything entered by hand lives here. -->
   <div class="space-y-3" v-bind="crewDir()">
      <div v-if="loading && !board" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         {{ tr('loading') }}
      </div>
      <div v-else-if="error" class="card py-10 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">{{ tr('load_failed') }}</p>
         <button class="btn-primary" @click="load()">{{ tr('retry') }}</button>
      </div>
      <div v-else-if="board && !row" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         {{ tr('not_found') }}
      </div>

      <template v-else-if="board && row">
         <section class="card p-5 n-enter" style="--i: 0">
            <div class="flex items-center gap-3.5 min-w-0">
               <span class="n-avatar">{{ initials(personName(row)) }}</span>
               <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                     <h2 class="text-[20px] font-bold tracking-[-0.025em] leading-tight">{{ personName(row) }}</h2>
                     <span class="badge badge-amber shrink-0">{{ tr('job') }}</span>
                  </div>
                  <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1">
                     {{ cityName(row.location) }} · {{ monthName(board.period) }}
                  </p>
               </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-4">
               <div class="card-inset p-3">
                  <p class="n-tile-label">{{ tr('tile_done') }}</p>
                  <p class="text-[20px] font-bold tracking-[-0.03em] tabular-nums leading-tight mt-1">{{ row.cards.completed }}</p>
               </div>
               <div class="card-inset p-3">
                  <p class="n-tile-label">{{ tr('tile_trips') }}</p>
                  <p class="text-[20px] font-bold tracking-[-0.03em] tabular-nums leading-tight mt-1">
                     {{ row.pay.airport_trips + row.pay.ziyorat_trips }}
                  </p>
               </div>
               <div class="card-inset p-3">
                  <p class="n-tile-label">{{ tr('team_ball') }}</p>
                  <p class="text-[20px] font-bold tracking-[-0.03em] tabular-nums leading-tight mt-1">
                     {{ row.ball === null ? '—' : row.ball }}
                  </p>
               </div>
            </div>
         </section>

         <!-- The month in SAR. Every line that makes the total, in order. -->
         <section class="card p-5 n-enter" style="--i: 1">
            <div class="flex flex-wrap items-center gap-2.5">
               <h3 class="n-h">{{ tr('month_pay') }}</h3>
               <div class="ms-auto"><CrewPlanSwitch :v="board.flown.v" /></div>
            </div>

            <div class="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 tabular-nums text-[13.5px]">
               <span>{{ tr('salary_base') }}</span>
               <span class="text-end">
                  <input v-if="board.can_set_pay" type="number" min="0" step="100"
                     class="w-28 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-end"
                     :value="row.salary_sar ?? ''" @change="savePay('salary_sar', $event)" />
                  <template v-else>{{ sar(row.salary_sar) }}</template>
               </span>
               <template v-if="board.can_set_pay">
                  <span>{{ tr('work_start') }}</span>
                  <span class="text-end">
                     <input type="date" class="px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent"
                        :value="row.work_start ?? ''" @change="savePay('work_start', $event)" />
                  </span>
                  <span>{{ tr('work_end') }}</span>
                  <span class="text-end">
                     <input type="date" class="px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent"
                        :value="row.work_end ?? ''" @change="savePay('work_end', $event)" />
                  </span>
               </template>

               <span v-if="pay.missing_salary" class="col-span-2 text-[color:var(--n-muted)]">{{ tr('salary_missing') }}</span>
               <template v-else>
                  <template v-if="pay.worked_days !== pay.month_days">
                     <span>{{ tr('worked_days') }}</span>
                     <span class="text-end">{{ pay.worked_days }} / {{ pay.month_days }}</span>
                  </template>
                  <span>{{ tr('fixed_part', { n: pay.doimiy_pct }) }}</span>
                  <span class="text-end font-semibold">{{ sar(pay.doimiy) }}</span>
                  <span>{{ tr('kpi_part', { n: 100 - pay.doimiy_pct }) }}</span>
                  <span class="text-end font-semibold">{{ pay.kpi === null ? tr('pending') : sar(pay.kpi) }}</span>
                  <span class="col-span-2 -mt-1 text-[12.5px] text-[color:var(--n-muted)]">{{ kpiLine }}</span>
                  <template v-if="pay.airport_trips">
                     <span>{{ tr('airport_line', { n: pay.airport_trips, sum: sar(pay.airport_sum) }) }}</span>
                     <span class="text-end font-semibold">{{ sar(pay.airport) }}</span>
                  </template>
                  <template v-if="pay.ziyorat_trips">
                     <span>{{ tr('ziyorat_line', { n: pay.ziyorat_trips, sum: sar(pay.ziyorat_sum) }) }}</span>
                     <span class="text-end font-semibold">{{ sar(pay.ziyorat) }}</span>
                  </template>
                  <span>{{ tr('bonus') }}</span>
                  <span class="text-end">
                     <input v-if="board.can_set_manual" type="number" min="0" step="10" placeholder="0"
                        class="w-28 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-end font-semibold"
                        :value="pay.bonus || ''" @change="saveBonus($event)" />
                     <template v-else>{{ pay.bonus ? sar(pay.bonus) : '—' }}</template>
                  </span>
                  <template v-if="pay.jarima">
                     <span>{{ tr('fine') }} <span class="text-[color:var(--n-muted)]">— {{ fineWhy }}</span></span>
                     <span class="text-end font-semibold">{{ sar(-pay.jarima) }}</span>
                  </template>
                  <span>{{ tr('adjust') }}</span>
                  <span class="text-end font-semibold">{{ pay.manual_adjust ? sar(pay.manual_adjust) : '—' }}</span>
                  <!-- Amount and reason together: a non-zero correction without its reason
                       is refused, so they are one save, not two. -->
                  <div v-if="board.can_set_manual" class="col-span-2 flex flex-wrap items-center gap-2">
                     <input v-model="adjAmount" type="number" step="10" :placeholder="tr('ph_adjust')"
                        class="w-24 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-end" />
                     <input v-model="adjReason" type="text" :placeholder="tr('ph_reason')"
                        class="flex-1 min-w-[8rem] px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent" />
                     <button class="btn-ghost !py-1 !px-3 text-[13px]" @click="saveAdjust()">{{ tr('save') }}</button>
                  </div>
                  <p v-if="row.manual?.adjust && row.manual?.adjust_reason"
                     class="col-span-2 -mt-1 text-[12px] text-[color:var(--n-muted)]">
                     {{ row.manual.adjust_reason }}<template v-if="row.manual.updated_by"> · {{ row.manual.updated_by }}</template>
                  </p>
                  <span class="pt-1.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-semibold">{{ tr('total') }}</span>
                  <span class="pt-1.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] text-end text-[16px] font-bold">{{ sar(pay.total) }}</span>
               </template>
            </div>
         </section>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../../../api'
import { useToast } from '../../../../composables/useToast'
import { useNazoratStore } from '../../stores/nazorat'
import { initials } from './shared'
import CrewPlanSwitch from './CrewPlanSwitch.vue'
import {
   apiError, cityName, crewDir, crewLang, monthName, payOf, pct, personName, sar, tr,
   type CrewBoard,
} from './crew'

const s = useNazoratStore()
const toast = useToast()
const route = useRoute()

const board = ref<CrewBoard | null>(null)
const loading = ref(false)
const error = ref(false)
const adjAmount = ref('')
const adjReason = ref('')

const row = computed(() => board.value?.rows.find((r) => r.id === Number(route.params.id)) || null)
const pay = computed(() => payOf(row.value!))

async function load() {
   loading.value = true
   error.value = false
   try {
      board.value = (await api.get(`/control/crew/board?month=${encodeURIComponent(s.kpiMonth)}`)).data
   } catch {
      error.value = true
   } finally {
      loading.value = false
   }
}

onMounted(load)
watch(() => route.params.id, load)
watch(row, (r) => {
   adjAmount.value = r?.manual?.adjust ? String(r.manual.adjust) : ''
   adjReason.value = r?.manual?.adjust_reason || ''
})

const kpiLine = computed(() => {
   const p = pay.value
   if (p.pending.includes('ball')) return tr('kpi_wait_ball')
   if (p.pending.includes('flown')) return tr('kpi_wait_flown')
   return `${sar(p.kpi_target)} × ${p.q}% × ${pct(p.v)}`
})

const fineWhy = computed(() => {
   const p = pay.value
   return [p.bot_block ? tr('fine_block') : '',
      p.false_completions ? tr('fine_false', { n: p.false_completions }) : '',
      p.xatolik_abuse ? tr('fine_abuse') : ''].filter(Boolean).join(crewLang.value === 'ar' ? '، ' : ', ')
})

async function manual(patch: Record<string, unknown>) {
   try {
      await api.put(`/control/crew/manual/${board.value!.period}/${encodeURIComponent(row.value!.username)}`, patch)
      toast.success(tr('saved'))
      await load()
   } catch (e) {
      toast.error(apiError(e))
   }
}

function saveBonus(ev: Event) {
   const raw = (ev.target as HTMLInputElement).value
   void manual({ bonus: raw === '' ? 0 : Number(raw) })
}

function saveAdjust() {
   const v = adjAmount.value === '' ? 0 : Number(adjAmount.value)
   void manual({ adjust: v, adjust_reason: v ? adjReason.value : null })
}

async function savePay(field: 'salary_sar' | 'work_start' | 'work_end', ev: Event) {
   const raw = (ev.target as HTMLInputElement).value
   const value = raw === '' ? null : field === 'salary_sar' ? Number(raw) : raw
   try {
      await api.put(`/control/crew/staff/${row.value!.id}/pay`, { [field]: value })
      toast.success(tr('saved'))
      await load()
   } catch (e) {
      toast.error(apiError(e))
   }
}
</script>

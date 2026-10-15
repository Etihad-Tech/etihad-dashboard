<template>
   <!-- The language switch lives on the KPI tab, above the month chips it also turns. -->
   <div class="space-y-3" v-bind="crewDir()">
      <div v-if="loading && !board" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         {{ tr('loading') }}
      </div>
      <div v-else-if="error" class="card py-10 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">{{ tr('load_failed') }}</p>
         <button class="btn-primary" @click="load()">{{ tr('retry') }}</button>
      </div>

      <template v-else-if="board">
         <!-- A month before the scheme starts paying is shown, not paid. -->
         <div v-if="board.trial" class="card p-4 text-[13.5px] leading-snug">
            <b>{{ tr('trial_title') }}</b>
            {{ tr('trial_body', { month: monthName(board.period), first: monthName(board.first_paid_period) }) }}
         </div>

         <!-- THE MONTH: the plan share (V) is one number for everybody. -->
         <section class="card p-5 n-enter">
            <div class="flex items-baseline gap-2.5">
               <h3 class="n-h">{{ tr('plan_title') }}</h3>
               <span class="ms-auto text-[13px] text-[color:var(--n-muted)] tabular-nums">
                  {{ tr('plan_count', { n: num(board.flown.plan) }) }}
               </span>
            </div>
            <div class="mt-2 flex items-end gap-3">
               <span class="text-[34px] leading-none font-bold tabular-nums tracking-[-0.04em]">
                  {{ board.flown.value === null ? '—' : num(board.flown.value) }}
               </span>
               <span class="pb-1 text-[14px] text-[color:var(--n-muted)]">
                  {{ tr('flown_line', { pct: pct(board.flown.v) }) }}
               </span>
            </div>
            <p class="mt-1.5 text-[12.5px] text-[color:var(--n-muted)] leading-snug">{{ flownSource }}</p>

            <!-- «Reja 100%» — view only, the pay stays on the real plan. -->
            <div class="mt-3"><CrewPlanSwitch :v="board.flown.v" /></div>

            <details v-if="board.flown.crm && board.flown.crm.departures.length" class="mt-3">
               <summary class="text-[13px] font-semibold cursor-pointer">
                  {{ tr('crm_flights', { n: board.flown.crm.departures.length }) }}
               </summary>
               <div class="mt-2 space-y-1 text-[13px] tabular-nums">
                  <div v-for="d in board.flown.crm.departures" :key="d.departure_id" class="flex gap-3">
                     <span class="w-24 shrink-0">{{ d.departure_date }}</span>
                     <span class="flex-1 min-w-0 truncate text-[color:var(--n-muted)]">{{ d.package_name || '—' }}</span>
                     <span class="font-semibold">{{ d.pilgrims }}</span>
                  </div>
               </div>
            </details>

            <!-- The hand figure: always wins over the CRM; a source is mandatory. -->
            <div class="mt-3 flex flex-wrap items-center gap-2">
               <input v-model="flownInput" type="number" min="0" :placeholder="tr('flown_input')"
                  class="w-32 px-3 py-2 rounded-xl border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[14px] tabular-nums" />
               <input v-model="flownNote" type="text" :placeholder="tr('flown_source')"
                  class="flex-1 min-w-[10rem] px-3 py-2 rounded-xl border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[14px]" />
               <button class="btn-ghost" :disabled="busy" @click="saveFlown()">{{ tr('save') }}</button>
               <button v-if="board.flown.manual !== null" class="btn-ghost" :disabled="busy"
                  @click="clearFlown()">{{ tr('back_to_crm') }}</button>
            </div>
         </section>

         <!-- ONE CARD PER CITY TEAM (owner, 14.10.2026): the team's ball behind a tap,
              then the people — a row opens the person's own page. -->
         <section v-for="grp in groups" :key="grp.city" class="card p-5 n-enter">
            <button type="button" class="row-tap w-full flex items-center gap-3 py-1 -mx-2 px-2 rounded-[1.125rem]"
               @click="openTeam = openTeam === grp.city ? null : grp.city">
               <h3 class="n-h flex-1 text-start">{{ cityName(grp.city) }}</h3>
               <span class="shrink-0 text-end">
                  <span class="block text-[22px] font-bold tabular-nums leading-none tracking-[-0.04em]">
                     {{ grp.team.ball === null ? '—' : grp.team.ball }}
                  </span>
                  <span class="block text-[12px] text-[color:var(--n-muted)] mt-1">
                     {{ grp.team.q === null ? tr('team_ball') : tr('q_line', { q: grp.team.q }) }}
                  </span>
               </span>
               <font-awesome-icon icon="chevron-right"
                  class="w-3 h-3 text-[color:var(--n-faint)] shrink-0 transition-transform duration-200"
                  :class="openTeam === grp.city ? 'rotate-90' : 'rtl:rotate-180'" />
            </button>

            <div v-if="openTeam === grp.city"
               class="mt-2 px-4 py-3 rounded-[1rem] bg-[color:var(--n-soft,rgba(0,0,0,0.04))] space-y-3 text-[13.5px]">
               <div v-if="grp.team.ops" class="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 tabular-nums">
                  <span>{{ tr('ops_done') }}</span>
                  <span class="text-[color:var(--n-muted)]">{{ grp.team.ops.bajarish_pct }}%</span>
                  <span class="font-semibold text-end">{{ grp.team.ops.bajarish_ball }}/{{ grp.team.ops.weights.bajarish }}</span>
                  <span>{{ tr('ops_answered') }}</span>
                  <span class="text-[color:var(--n-muted)]">{{ hundred(grp.team.ops.javobsiz_pct) }}%</span>
                  <span class="font-semibold text-end">{{ grp.team.ops.javobsiz_ball }}/{{ grp.team.ops.weights.javobsiz }}</span>
                  <span>{{ tr('ops_unrepeated') }}</span>
                  <span class="text-[color:var(--n-muted)]">{{ hundred(grp.team.ops.takroriy_pct) }}%</span>
                  <span class="font-semibold text-end">{{ grp.team.ops.takroriy_ball }}/{{ grp.team.ops.weights.takroriy }}</span>
                  <span>{{ tr('ops_speed') }}</span>
                  <span class="text-[color:var(--n-muted)]">{{ grp.team.ops.tezlik_measured ? durL(grp.team.cards.day_avg_response_seconds) : '—' }}</span>
                  <span class="font-semibold text-end">{{ grp.team.ops.tezlik_ball }}/{{ grp.team.ops.weights.tezlik }}</span>
                  <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">{{ tr('ops_bot') }}</span>
                  <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] text-[color:var(--n-muted)]">× {{ 100 - surveyPct }}%</span>
                  <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-semibold text-end">{{ grp.team.ops.total }}</span>
                  <span>{{ tr('ops_survey') }}</span>
                  <span class="text-[color:var(--n-muted)]">× {{ surveyPct }}%</span>
                  <span class="font-semibold text-end">{{ grp.team.survey_ball === null ? '—' : fmtBall(grp.team.survey_ball) }}</span>
                  <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-semibold">{{ tr('ops_total') }}</span>
                  <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] text-[color:var(--n-muted)]">
                     {{ grp.team.q === null ? '' : tr('ops_kpi_share', { q: grp.team.q }) }}
                  </span>
                  <span class="pt-1 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] font-bold text-end">
                     {{ grp.team.ball === null ? '—' : grp.team.ball }}<template v-if="grp.team.hand_ball !== null"> {{ tr('by_hand') }}</template>
                  </span>
               </div>

               <!-- Under the minimum sample: the team's ball is written by hand. -->
               <div v-if="grp.team.min_sample" class="flex flex-wrap items-center gap-2">
                  <span class="flex-1 min-w-[10rem]">{{ tr('min_sample', { n: grp.team.ops ? grp.team.ops.base : 0 }) }}</span>
                  <input type="number" min="0" max="100" :placeholder="tr('ph_ball')"
                     class="w-24 px-2 py-1.5 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent tabular-nums text-end"
                     :value="grp.team.hand_ball ?? ''" @change="saveTeamBall(grp.city, $event)" />
               </div>
            </div>

            <div class="mt-2 space-y-0.5">
               <button v-for="r in grp.rows" :key="r.id" type="button"
                  class="row-tap w-full flex items-center gap-3 py-3 -mx-2 px-2 rounded-[1.125rem]"
                  @click="openPerson(r)">
                  <span class="min-w-0 flex-1 text-start">
                     <span class="block text-[15px] font-semibold tracking-[-0.015em] truncate">{{ personName(r) }}</span>
                     <span class="block mt-0.5 text-[12.5px] text-[color:var(--n-faint)] tabular-nums truncate">
                        {{ subline(r) }}
                     </span>
                  </span>
                  <span class="shrink-0 text-end">
                     <span class="block text-[20px] font-bold tabular-nums leading-none tracking-[-0.03em]">
                        {{ payOf(r).total === null ? '—' : sar(payOf(r).total) }}
                     </span>
                     <span class="block text-[12px] text-[color:var(--n-muted)] mt-1">
                        {{ payOf(r).kpi === null ? tr('pending') : tr('kpi_small', { sum: sar(payOf(r).kpi) }) }}
                     </span>
                  </span>
                  <!-- Points to the reading direction's END: right in Uzbek, left in Arabic. -->
                  <font-awesome-icon icon="chevron-right"
                     class="w-3 h-3 text-[color:var(--n-faint)] shrink-0 rtl:rotate-180" />
               </button>
            </div>
         </section>

         <div v-if="!board.rows.length" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
            {{ tr('no_staff') }}
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../../../api'
import { useToast } from '../../../../composables/useToast'
import { useNazoratStore } from '../../stores/nazorat'
import CrewPlanSwitch from './CrewPlanSwitch.vue'
import {
   apiError, cityName, crewDir, dec, durL, monthName, num, payOf, pct, personName, sar, tr,
   type CrewBoard, type CrewRow,
} from './crew'

const s = useNazoratStore()
const toast = useToast()
const router = useRouter()

const board = ref<CrewBoard | null>(null)
const loading = ref(false)
const error = ref(false)
const busy = ref(false)
const openTeam = ref<string | null>(null)
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
watch(() => s.kpiMonth, () => { openTeam.value = null; void load() })

const surveyPct = computed(() => Number(board.value?.settings.survey_pct ?? 50))

const flownSource = computed(() => {
   const f = board.value?.flown
   if (!f) return ''
   if (f.source === 'manual') {
      return `${tr('flown_manual')}${f.manual_note ? ` (${f.manual_note})` : ''}${f.manual_by ? ` · ${f.manual_by}` : ''}.`
         + (f.crm ? ` ${tr('flown_manual_crm', { n: f.crm.count })}` : '')
   }
   if (f.source === 'crm') return tr('flown_crm')
   return tr(f.crm_error === 'not_configured' ? 'flown_not_configured' : 'flown_crm_failed')
})

const groups = computed(() => {
   const b = board.value
   if (!b) return []
   return (['makka', 'madina'] as const)
      .map((city) => ({ city, team: b.teams[city], rows: b.rows.filter((r) => r.location === city) }))
      .filter((g) => g.rows.length)
})

const fmtBall = (v: number) => dec(Math.round(v * 10) / 10)
const hundred = (v: number) => Math.round((100 - v) * 10) / 10

function subline(r: CrewRow): string {
   const trips = r.pay.airport_trips + r.pay.ziyorat_trips
   return [tr('sub_done', { n: r.cards.completed }), trips ? tr('sub_trips', { n: trips }) : '',
      r.salary_sar === null ? tr('sub_no_salary') : '']
      .filter(Boolean).join(' · ')
}

function openPerson(r: CrewRow) {
   router.push(`/ai/nazorat/xodim/tashkiliy/${r.id}`)
}

async function saveFlown() {
   const raw = flownInput.value === '' ? null : Number(flownInput.value)
   if (raw === null) return clearFlown()
   busy.value = true
   try {
      await api.put(`/control/crew/month/${board.value!.period}/flown`, { value: raw, note: flownNote.value })
      toast.success(tr('saved'))
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
      toast.success(tr('crm_used'))
      await load()
   } catch (e) {
      toast.error(apiError(e))
   } finally {
      busy.value = false
   }
}

async function saveTeamBall(city: string, ev: Event) {
   const raw = (ev.target as HTMLInputElement).value
   try {
      await api.put(`/control/crew/month/${board.value!.period}/team-ball/${city}`,
         { ball: raw === '' ? null : Number(raw) })
      toast.success(tr('saved'))
      await load()
      openTeam.value = city
   } catch (e) {
      toast.error(apiError(e))
   }
}
</script>

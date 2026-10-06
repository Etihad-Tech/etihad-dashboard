<template>
   <div class="space-y-3" v-bind="crewDir()">
      <CrewLangSwitch />

      <!-- The same calendar month as the KPI tab: a trip is paid in the month it
           happened, and this screen is where that month's trips are entered. -->
      <div class="no-bar flex gap-2 overflow-x-auto -mx-5 px-5 py-0.5 lg:mx-0 lg:px-0">
         <button v-for="m in months" :key="m" class="fchip shrink-0"
            :class="s.kpiMonth === m ? 'is-on' : ''" @click="s.setKpiMonth(m)">
            {{ monthName(m) }}
         </button>
      </div>

      <div v-if="error" class="card py-10 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">{{ tr('load_failed') }}</p>
         <button class="btn-primary" @click="load()">{{ tr('retry') }}</button>
      </div>

      <template v-else>
         <!-- NEW TRIP: a date, the kind, the person and the status — nothing else
              (owner, 26.09: no flights, no groups, no bot message). -->
         <section class="card p-5 n-enter space-y-3">
            <h3 class="n-h">{{ tr('trip_add_title') }}</h3>
            <div class="grid grid-cols-2 gap-2">
               <label class="text-[12.5px] text-[color:var(--n-muted)]">{{ tr('trip_date') }}
                  <input v-model="form.trip_date" type="date"
                     class="mt-1 w-full px-3 py-2 rounded-xl border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[14px] text-[color:var(--n-ink)]" />
               </label>
               <label class="text-[12.5px] text-[color:var(--n-muted)]">{{ tr('trip_kind') }}
                  <select v-model="form.kind" class="filter-select mt-1 w-full">
                     <option v-for="k in TRIP_KINDS" :key="k.value" :value="k.value">{{ tr(k.key) }}</option>
                  </select>
               </label>
               <label class="col-span-2 text-[12.5px] text-[color:var(--n-muted)]">{{ tr('trip_person') }}
                  <select v-model.number="form.staff_id" class="filter-select mt-1 w-full">
                     <option :value="0" disabled>{{ tr('pick') }}</option>
                     <optgroup v-for="g in rosterGroups" :key="g.city" :label="cityName(g.city)">
                        <option v-for="p in g.people" :key="p.id" :value="p.id">{{ personName(p) }}</option>
                     </optgroup>
                  </select>
               </label>
               <label class="text-[12.5px] text-[color:var(--n-muted)]">{{ tr('trip_status') }}
                  <select v-model="form.status" class="filter-select mt-1 w-full">
                     <option v-for="st in TRIP_STATUSES" :key="st.value" :value="st.value">{{ tr(st.key) }}</option>
                  </select>
               </label>
               <label v-if="form.status === 'almashtirildi'" class="text-[12.5px] text-[color:var(--n-muted)]">{{ tr('trip_instead') }}
                  <select v-model.number="form.replacement_staff_id" class="filter-select mt-1 w-full">
                     <option :value="0" disabled>{{ tr('pick') }}</option>
                     <option v-for="p in roster.filter((x) => x.id !== form.staff_id)" :key="p.id" :value="p.id">
                        {{ personName(p) }}
                     </option>
                  </select>
               </label>
               <input v-model="form.note" type="text" :placeholder="tr('trip_note')"
                  class="col-span-2 px-3 py-2 rounded-xl border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[14px]" />
            </div>
            <button class="btn-primary" :disabled="busy || !form.staff_id || !form.trip_date" @click="add()">
               {{ tr('add') }}
            </button>
         </section>

         <!-- WHO IS PAID FOR WHAT this month — the same rule the payslip applies:
              Bordi -> that person, Almashtirildi -> the one who went instead. -->
         <section v-if="paidSummary.length" class="card p-5 n-enter">
            <h3 class="n-h">{{ tr('trips_paid', { m: monthName(s.kpiMonth) }) }}</h3>
            <div class="mt-3 space-y-1.5 text-[14px] tabular-nums">
               <div v-for="p in paidSummary" :key="p.id" class="flex items-center gap-3">
                  <span class="flex-1 min-w-0 truncate">{{ p.name }}</span>
                  <span v-if="p.airport" class="chip">{{ tr('chip_airport', { n: p.airport }) }}</span>
                  <span v-if="p.ziyorat" class="chip">{{ tr('chip_ziyorat', { n: p.ziyorat }) }}</span>
               </div>
            </div>
         </section>

         <section class="card p-5 n-enter">
            <div class="flex items-baseline gap-2.5">
               <h3 class="n-h">{{ tr('trips_title') }}</h3>
               <span class="ms-auto text-[13px] text-[color:var(--n-muted)]">{{ tr('trips_count', { n: trips.length }) }}</span>
            </div>
            <div v-if="loading && !trips.length" class="py-8 text-center text-[14px] text-[color:var(--n-muted)]">{{ tr('loading') }}</div>
            <div v-else-if="!trips.length" class="py-8 text-center text-[14px] text-[color:var(--n-muted)]">
               {{ tr('trips_none') }}
            </div>
            <div v-for="t in trips" :key="t.id"
               class="py-3 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))] space-y-2">
               <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[13px] tabular-nums text-[color:var(--n-muted)] w-[5.5rem]">{{ t.trip_date }}</span>
                  <span class="badge" :class="t.kind === 'airport' ? 'badge-indigo' : 'badge-amber'">
                     {{ tr(t.kind === 'airport' ? 'kind_airport' : 'kind_ziyorat') }}
                  </span>
                  <span class="text-[15px] font-semibold truncate">{{ t.staff_name || t.staff_username || '—' }}</span>
                  <button class="ms-auto text-[12.5px] text-[color:var(--n-muted)] underline" @click="remove(t)">{{ tr('remove') }}</button>
               </div>
               <div class="flex items-center gap-2 flex-wrap">
                  <select :value="t.status" class="filter-select !py-1.5 text-[14px]" @change="setStatus(t, $event)">
                     <option v-for="st in TRIP_STATUSES" :key="st.value" :value="st.value">{{ tr(st.key) }}</option>
                  </select>
                  <select v-if="t.status === 'almashtirildi' || pendingRepl[t.id]"
                     :value="t.replacement_staff_id || 0" class="filter-select !py-1.5 text-[14px]"
                     @change="setReplacement(t, $event)">
                     <option :value="0" disabled>{{ tr('who_instead') }}</option>
                     <option v-for="p in roster.filter((x) => x.id !== t.staff_id)" :key="p.id" :value="p.id">
                        {{ personName(p) }}
                     </option>
                  </select>
                  <span class="text-[12.5px] text-[color:var(--n-muted)]">{{ paidText(t) }}</span>
               </div>
               <p v-if="t.note" class="text-[12.5px] text-[color:var(--n-muted)]">{{ t.note }}</p>
            </div>
         </section>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../../../../api'
import { useToast } from '../../../../composables/useToast'
import { useConfirm } from '../../../../composables/useConfirm'
import { useNazoratStore } from '../../stores/nazorat'
import {
   TRIP_KINDS, TRIP_STATUSES, apiError, cityName, crewDir, monthName, personName, tr,
   type CrewPerson, type CrewTrip,
} from './crew'
import CrewLangSwitch from './CrewLangSwitch.vue'

const s = useNazoratStore()
const toast = useToast()
const { confirm } = useConfirm()

const trips = ref<CrewTrip[]>([])
const roster = ref<CrewPerson[]>([])
const loading = ref(false)
const error = ref(false)
const busy = ref(false)
/** A status just switched to «Almashtirildi» whose replacement is not picked yet. */
const pendingRepl = ref<Record<number, boolean>>({})

/** Today on the Makka clock — the day a trip is usually entered for. */
function todayMakka(): string {
   return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Riyadh' })
}

const form = reactive({
   trip_date: todayMakka(),
   kind: 'airport' as 'airport' | 'ziyorat',
   staff_id: 0,
   status: 'bordi' as 'bordi' | 'bormadi' | 'almashtirildi',
   replacement_staff_id: 0,
   note: '',
})

const months = computed(() => {
   const out: string[] = []
   const d = new Date()
   for (let i = 0; i < 6; i++) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
      out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`)
   }
   return out
})

const rosterGroups = computed(() => (['makka', 'madina'] as const)
   .map((city) => ({ city, people: roster.value.filter((p) => p.location === city) }))
   .filter((g) => g.people.length))

const byId = computed(() => new Map(roster.value.map((p) => [p.id, p])))

const paidSummary = computed(() => {
   const acc = new Map<number, { id: number; name: string; airport: number; ziyorat: number }>()
   for (const t of trips.value) {
      if (!t.paid_staff_id) continue
      const who = t.paid_staff_id === t.staff_id
         ? (t.staff_name || t.staff_username || '—')
         : (t.replacement_name || t.replacement_username || '—')
      const row = acc.get(t.paid_staff_id) || { id: t.paid_staff_id, name: who, airport: 0, ziyorat: 0 }
      row[t.kind] += 1
      acc.set(t.paid_staff_id, row)
   }
   return [...acc.values()].sort((a, b) => a.name.localeCompare(b.name))
})

function paidText(t: CrewTrip): string {
   if (t.status === 'bormadi') return tr('unpaid')
   if (t.status === 'almashtirildi') {
      const who = t.replacement_name || t.replacement_username
      return who ? tr('paid_to', { who }) : tr('pick_instead')
   }
   return tr('paid')
}

async function load() {
   loading.value = true
   error.value = false
   try {
      const { data } = await api.get(`/control/crew/trips?month=${encodeURIComponent(s.kpiMonth)}`)
      trips.value = data.trips || []
      roster.value = data.roster || []
      pendingRepl.value = {}
   } catch {
      error.value = true
   } finally {
      loading.value = false
   }
}

async function add() {
   busy.value = true
   try {
      await api.post('/control/crew/trips', {
         trip_date: form.trip_date, kind: form.kind, staff_id: form.staff_id,
         status: form.status,
         replacement_staff_id: form.status === 'almashtirildi' ? form.replacement_staff_id || null : null,
         note: form.note || null,
      })
      toast.success(tr('added'))
      form.staff_id = 0
      form.status = 'bordi'
      form.replacement_staff_id = 0
      form.note = ''
      // Entered for another month than the one on screen: show where it went.
      if (form.trip_date.slice(0, 7) !== s.kpiMonth) s.setKpiMonth(form.trip_date.slice(0, 7))
      else await load()
   } catch (e) {
      toast.error(apiError(e))
   } finally {
      busy.value = false
   }
}

async function update(t: CrewTrip, patch: Record<string, unknown>) {
   try {
      await api.put(`/control/crew/trips/${t.id}`, patch)
      toast.success(tr('saved'))
      await load()
   } catch (e) {
      toast.error(apiError(e))
      await load()
   }
}

function setStatus(t: CrewTrip, ev: Event) {
   const status = (ev.target as HTMLSelectElement).value
   if (status === 'almashtirildi' && !t.replacement_staff_id) {
      // The replacement is part of the status: wait for it before saving.
      pendingRepl.value = { ...pendingRepl.value, [t.id]: true }
      return
   }
   void update(t, { status })
}

function setReplacement(t: CrewTrip, ev: Event) {
   const id = Number((ev.target as HTMLSelectElement).value)
   if (!id || !byId.value.has(id)) return
   void update(t, { status: 'almashtirildi', replacement_staff_id: id })
}

async function remove(t: CrewTrip) {
   if (!(await confirm({ title: tr('remove_title'),
      message: tr('remove_ask', { what: `${t.trip_date} · ${t.staff_name || t.staff_username || ''}` }),
      confirmText: tr('remove'), cancelText: tr('cancel') }))) return
   try {
      await api.delete(`/control/crew/trips/${t.id}`)
      toast.success(tr('removed'))
      await load()
   } catch (e) {
      toast.error(apiError(e))
   }
}

onMounted(load)
watch(() => s.kpiMonth, () => { void load() })
</script>

<template>
   <div class="space-y-4">
      <!-- WHICH MONTH — the only control on this screen (owner, 2026-10-12: «remove all
           filters and leave only per month»). Chips, the same twelve the KPI tab offers;
           the panel's Kunlik/Haftalik picker and the group/city slice are not shown over
           this tab, so nothing here answers to a control the reader cannot see. -->
      <div class="no-bar flex gap-2 overflow-x-auto -mx-5 px-5 py-0.5 lg:mx-0 lg:px-0 n-enter" style="--i: 0">
         <button v-for="m in MONTHS" :key="m.period" class="fchip shrink-0"
            :class="s.groupMonth === m.period ? 'is-on' : ''" @click="s.setGroupMonth(m.period)">
            {{ m.label }}
         </button>
      </div>

      <div v-if="s.periodCountsLoading" class="card divide-y divide-gray-100 overflow-hidden">
         <div v-for="i in 5" :key="i" class="flex items-center gap-3.5 px-5 py-3.5">
            <span class="w-9 h-9 rounded-full bg-gray-100 shrink-0 animate-pulse"></span>
            <div class="h-3 flex-1 max-w-[180px] rounded-full bg-gray-100 animate-pulse"></div>
         </div>
      </div>

      <!-- A refused read and a broken one are different facts and must not share a
           message: one is "not yours to see", the other is "try again". -->
      <div v-else-if="s.periodCountsError === 'forbidden'" class="card p-8 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] leading-snug">
            Bu bo'lim ellikboshilar bo'yicha, sizning doirangizdan tashqarida.
         </p>
      </div>
      <div v-else-if="s.periodCountsError === 'failed'" class="card p-8 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">Ma'lumot yuklanmadi.</p>
         <button @click="s.loadPeriodCounts()" class="btn-primary">Qayta urinish</button>
      </div>

      <div v-else-if="!s.periodCounts.length" class="card p-8 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)]">Hali birorta ellikboshi qo'shilmagan.</p>
      </div>

      <template v-else>
         <!-- ──────────────── WORKLOAD CHART ────────────────
              The month's numbers as a picture, biggest first. Only leaders who ran at
              least one group get a column — a row of flat zeroes is a wall, not a chart;
              the list under it names everyone, zeroes included, and is where a column is
              checked group by group. -->
         <div class="card p-5 n-enter" style="--i: 1">
            <h3 class="n-h">Yuklama</h3>
            <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1.5 leading-snug">
               Tanlangan oyda har bir ellikboshi olib borgan ish birligi (Makka
               {{ fmtUnits(CITY_WEIGHT_MAKKA) }} + Madina {{ fmtUnits(CITY_WEIGHT_MADINA) }} = 1 guruh).
            </p>

            <p v-if="!periodChart.cols.length"
               class="mt-5 text-[14.5px] text-[color:var(--n-muted)] leading-snug">
               Bu oyda birorta guruh yo'lda bo'lmagan.
            </p>

            <!-- Wide charts scroll inside their own box rather than squeezing every
                 column to a hairline: with a dozen ellikboshilar an equal-share row is
                 unreadable, and the value sits above each column anyway. -->
            <div v-else class="n-chart-scroll mt-5">
               <div class="n-chart" :style="{ minWidth: periodChart.cols.length * 4.25 + 'rem' }">
                  <div class="n-chart-plot">
                     <div class="n-chart-axis">
                        <div v-for="t in periodChart.ticks" :key="t.at" class="n-chart-tick"
                           :style="{ bottom: t.at + '%' }">
                           <span>{{ t.label }}</span><i></i>
                        </div>
                     </div>
                     <div class="n-chart-cols">
                        <div v-for="c in periodChart.cols" :key="c.username" class="n-chart-col"
                           :title="`${c.name || c.username} · ${c.group_count} guruh · ${fmtUnits(c.weighted_units)} ish birligi`">
                           <span class="n-chart-val">{{ fmtUnits(c.weighted_units) }}</span>
                           <span class="n-chart-bar"
                              :style="{ height: c.height + '%', '--c': c.color }"></span>
                        </div>
                     </div>
                  </div>
                  <div class="n-chart-names">
                     <span v-for="c in periodChart.cols" :key="c.username" class="n-chart-name">
                        {{ c.short }}
                     </span>
                  </div>
               </div>
            </div>
         </div>

         <div class="card overflow-hidden n-enter" style="--i: 2">
            <!-- Totals first: the sum is what makes a single row arguable ("he had 4 of
                 our 21 this month"), and the idle count is the number the office acts on.
                 Groups are counted ONCE however they are split between two city leaders,
                 so the total is the month's groups, not the sum of the rows. -->
            <div class="flex flex-wrap gap-x-6 gap-y-1 px-5 py-3.5 border-b border-gray-100 text-[13.5px] text-[color:var(--n-muted)]">
               <span><b class="text-[color:var(--n-ink)] tabular-nums">{{ s.periodCounts.length }}</b> ellikboshi</span>
               <span><b class="text-[color:var(--n-ink)] tabular-nums">{{ totalGroups }}</b> guruh</span>
               <span v-if="withoutGroups" class="text-amber-700">
                  <b class="tabular-nums">{{ withoutGroups }}</b> ellikboshida guruh yo'q
               </span>
               <!-- The same caveat the API carries: a group with no trip dates cannot be
                    placed in any month, so it is counted nowhere. Said out loud, because
                    silence about it reads as "there were none". -->
               <span v-if="s.periodUnscheduled" class="text-[color:var(--n-faint)]">
                  {{ s.periodUnscheduled }} ta guruhda safar sanasi yo'q — hisobga olinmadi
               </span>
            </div>

            <ul class="divide-y divide-gray-100">
               <li v-for="l in s.periodCounts" :key="l.username" class="px-5 py-3">
                  <button class="row-tap flex items-center gap-3.5 -mx-2 px-2 rounded-[1.125rem]"
                          @click="open = open === l.username ? '' : l.username">
                     <span class="n-avatar">
                        {{ initials(l.name || l.username) }}
                     </span>
                     <span class="min-w-0 flex-1">
                        <span class="block text-[15.5px] font-semibold tracking-[-0.015em] truncate">
                           {{ l.name || l.username }}
                        </span>
                        <span class="block text-[12.5px] text-[color:var(--n-faint)] truncate">
                           {{ l.name ? l.username : '' }}
                        </span>
                     </span>
                     <span class="text-right shrink-0">
                        <span class="block text-[14.5px] tabular-nums"
                              :class="l.group_count ? 'font-semibold' : 'text-[color:var(--n-faint)]'">
                           {{ l.group_count }} guruh
                        </span>
                        <!-- The weighted figure appears ONLY when this leader actually
                             held a half-group (Makka 0,6 / Madina 0,4). For everybody else
                             it would be the same number in a second row. -->
                        <span v-if="l.weighted_units !== l.group_count"
                              class="block text-[11.5px] tabular-nums text-[color:var(--n-faint)]">
                           {{ fmtUnits(l.weighted_units) }} birlik
                        </span>
                     </span>
                     <!-- chevron-RIGHT rotated, because that one is already in the icon
                          library; an unregistered glyph renders nothing at all. -->
                     <font-awesome-icon v-if="l.group_count" icon="chevron-right"
                        class="w-3 h-3 text-[color:var(--n-faint)] shrink-0 transition-transform duration-300"
                        :class="open === l.username ? 'rotate-90' : ''" />
                  </button>

                  <!-- The drill-down: WHICH groups, and the trip dates that put each one
                       in this month. A total nobody can check is not evidence. -->
                  <ul v-if="open === l.username && l.group_count" class="mt-2.5 ml-[3.25rem] space-y-1.5">
                     <li v-for="g in l.groups" :key="g.telegram_id"
                        class="text-[13.5px] text-[color:var(--n-muted)]">
                        {{ g.title || ('Guruh ' + g.telegram_id) }}
                        <!-- Which HALF of the group is theirs. Named only on a split one:
                             it is what makes the weighted figure checkable. -->
                        <span v-if="g.cities.length < 2" class="text-[color:var(--n-faint)]">
                           · faqat {{ cityName(g.cities[0]) }} ({{ fmtUnits(g.weight) }})
                        </span>
                        <span class="text-[color:var(--n-faint)] tabular-nums">
                           · {{ dmy(g.trip_start_date) }} — {{ dmy(g.trip_end_date) }}
                        </span>
                     </li>
                  </ul>
               </li>
            </ul>
         </div>
      </template>

      <!-- ──────────────── BOT ANSWERS PER GROUP ────────────────
           Owner rule 2026-08-25: only the ADMIN and the MAIN nazoratchi may silence
           the bot in a group. The two scoped controller logins (staff / ellikboshi)
           see this panel too, so the section is gated by EXACT role — and the API
           enforces the same rule regardless of what renders here. "JIM" means the
           bot posts nothing in that group while staff DM cards, Nazorat records and
           worker-group forwards keep flowing. -->
      <div v-if="canSilence" class="card n-enter overflow-hidden" style="--i: 3">
         <div class="flex items-start gap-3.5 p-5 border-b border-gray-100">
            <span class="n-ico n-ico-sm" style="--c: #e0534f">
               <!-- 'gear', because it is already in the icon library (same rule as the
                    chevron above: an unregistered glyph renders NOTHING). -->
               <font-awesome-icon icon="gear" class="w-4 h-4" />
            </span>
            <div>
               <h3 class="n-h">Bot javoblari</h3>
               <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1.5 leading-snug">
                  JIM rejimda bot guruhga hech narsa yozmaydi — lekin murojaat
                  kartochkalari, DMlar va Nazorat yozuvlari baribir boradi.
               </p>
            </div>
         </div>
         <div v-if="botGroupsLoading" class="p-5">
            <div class="h-24 rounded-2xl bg-gray-100 animate-pulse"></div>
         </div>
         <div v-else-if="botGroupsError" class="p-5 text-center">
            <p class="text-[14.5px] text-[color:var(--n-muted)] mb-3">Guruhlar yuklanmadi.</p>
            <button @click="loadBotGroups" class="btn-primary">Qayta urinish</button>
         </div>
         <ul v-else class="divide-y divide-gray-100">
            <li v-for="g in botGroups" :key="g.id"
                class="px-5 py-3 flex items-center gap-3.5">
               <span class="min-w-0 flex-1 text-[14.5px] font-medium truncate">
                  {{ g.title || ('Guruh ' + g.id) }}
               </span>
               <button @click="toggleBotSilent(g)" :disabled="botSavingId === g.id"
                  class="shrink-0 px-3 py-1.5 rounded-2xl text-[12.5px] font-semibold border transition-colors"
                  :class="g.bot_silent
                     ? 'bg-rose-50 text-rose-600 border-rose-200'
                     : 'bg-emerald-50 text-emerald-700 border-emerald-200'">
                  {{ botSavingId === g.id ? '...' : (g.bot_silent ? 'JIM' : 'Faol') }}
               </button>
            </li>
         </ul>
      </div>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNazoratStore } from '../../stores/nazorat'
import { initials, lastMonths, PIE_COLORS } from './shared'
import api from '../../../../api'
import { useAuthStore } from '../../../../stores/auth'
import { byGroupNumber } from '../../../../utils/groupOrder'

const s = useNazoratStore()

// ── Bot-answers switch (admin + MAIN nazoratchi only) ─────────────────────────
// Exact-role match on purpose: the scoped controller logins also start with
// "nazoratchi" and must not see (or be able to use) the switch.
const auth = useAuthStore()
const canSilence = computed(() => auth.role === 'admin' || auth.role === 'nazoratchi')

interface BotGroup { id: number; title: string | null; bot_silent: boolean }
const botGroups = ref<BotGroup[]>([])
const botGroupsLoading = ref(false)
const botGroupsError = ref(false)
const botSavingId = ref<number | null>(null)

async function loadBotGroups() {
  botGroupsLoading.value = true
  botGroupsError.value = false
  try {
    const { data } = await api.get('/groups')
    botGroups.value = data
      .map((g: any): BotGroup => ({ id: g.id, title: g.title, bot_silent: !!g.bot_silent }))
      .sort(byGroupNumber)
  } catch {
    botGroupsError.value = true
    botGroups.value = []
  } finally {
    botGroupsLoading.value = false
  }
}

async function toggleBotSilent(g: BotGroup) {
  botSavingId.value = g.id
  try {
    const { data } = await api.put(`/groups/${g.id}/bot-silent`, { silent: !g.bot_silent })
    g.bot_silent = !!data.bot_silent
  } catch {
    /* the button simply stays as it was — no state was changed on the server */
  } finally {
    botSavingId.value = null
  }
}

/** The month chips — newest first, the same twelve the KPI tab shows. */
const MONTHS = lastMonths()

const open = ref('')

/** The month's GROUPS, each counted once. A group led by one leader in Makka and another
 *  in Madina sits in both rows, so summing the rows would count it twice. */
const totalGroups = computed(() =>
   new Set(s.periodCounts.flatMap((l) => l.groups.map((g) => g.telegram_id))).size)
const withoutGroups = computed(() => s.periodCounts.filter((l) => !l.group_count).length)

/** 2.6, not 2.60 and not 2.5999999999. Whole numbers lose the decimal entirely: "3
 *  birlik" is the same fact as "3.0 birlik" and reads as a count, which it is. */
function fmtUnits(n: number) {
   return Number(n.toFixed(2)).toString()
}

// Mirrors server/bot/services/kpi.py CITY_WEIGHTS. Duplicated ONLY to caption the
// chart — every weighted number rendered here is computed on the server, so these two
// constants drifting apart can mislabel the rule but can never change a total.
const CITY_WEIGHT_MAKKA = 0.6
const CITY_WEIGHT_MADINA = 0.4

const CITY_NAMES: Record<string, string> = {
   makka: 'Makkada', madina: 'Madinada', jidda: 'Jiddada',
}
function cityName(c?: string) {
   return c ? (CITY_NAMES[c] || c) : ''
}

/** 2026-08-10 -> 10.08. The year is dropped: a trip is under two weeks long, and the
 *  pair has to fit on a phone. */
function dmy(iso: string) {
   const [, m, d] = (iso || '').split('-')
   return d && m ? `${d}.${m}` : ''
}

/** The columns, biggest workload first — a ranking is exactly what this number is for:
 *  more groups IS more work.
 *
 *  Ranked and drawn on the WEIGHTED units, not the leg count: two leaders can hold the
 *  same number of legs and not the same amount of work. Until a group is actually split
 *  the two are identical.
 *
 *  The axis stays in whole groups — the ticks are the familiar unit, the bars land
 *  between them. AXIS_STEPS is not reused: it is a duration ladder (30 daq, 1 soat…). */
const periodChart = computed(() => {
   const cols = s.periodCounts
      .filter((l) => l.group_count > 0)
      .slice()
      .sort((a, b) => b.weighted_units - a.weighted_units
         || (a.name || a.username).localeCompare(b.name || b.username))
   const peak = cols.reduce((m, c) => Math.max(m, c.weighted_units), 0)
   // One line per group up to 5, then a coarser step, so the axis never becomes a comb.
   const step = peak <= 5 ? 1 : Math.ceil(peak / 4)
   const top = Math.max(Math.ceil(peak / step) * step, step)
   const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => ({
      at: (i * step / top) * 100, label: String(i * step),
   }))
   return {
      ticks,
      cols: cols.map((c, i) => ({
         ...c,
         short: (c.name || c.username).replace(/^@/, '').split(/\s+/)[0],
         // Floor of 4%: one group must still be a visible block, not a hairline.
         height: Math.max((c.weighted_units / top) * 100, 4),
         color: PIE_COLORS[i % PIE_COLORS.length],
      })),
   }
})

// Loaded here rather than in the panel's load(): this read takes no group/city slice and
// answers to its own month, so it must not be re-pulled when the panel's picker moves.
onMounted(() => {
   if (!s.periodCounts.length) s.loadPeriodCounts()
   if (canSilence.value) loadBotGroups()
})
</script>

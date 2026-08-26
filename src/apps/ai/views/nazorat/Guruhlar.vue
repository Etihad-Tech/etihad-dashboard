<template>
   <div class="space-y-4">
      <!-- The one screen in this panel that does NOT answer to the period selector, so it
           says so before showing a number. Without the line, a reader who has just set
           "Kunlik" next door reasonably assumes these totals are daily too. -->
      <div class="card p-5 n-enter" style="--i: 0">
         <div class="flex items-start gap-3.5">
            <span class="n-ico n-ico-sm" style="--c: #7c5cfc">
               <font-awesome-icon icon="users" class="w-4 h-4" />
            </span>
            <div>
               <h3 class="n-h">Guruhlar taqsimoti</h3>
               <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1.5 leading-snug">
                  Har bir ellikboshiga nechta guruh biriktirilgan. Bu son davrga bog'liq
                  emas: Kunlik / Haftalik / Oylik tanlovi uni o'zgartirmaydi.
               </p>
               <!-- Said once, here, and not repeated beside every number: the weights are
                    the same everywhere on the screen, and a rule restated three times
                    reads as three different rules. -->
               <p class="text-[12.5px] text-[color:var(--n-faint)] mt-1.5 leading-snug">
                  Bitta guruhni Makkada bir ellikboshi, Madinada boshqasi olib borishi
                  mumkin. Ish birligi: Makka {{ fmtUnits(CITY_WEIGHT_MAKKA) }} +
                  Madina {{ fmtUnits(CITY_WEIGHT_MADINA) }} = 1 to'liq guruh.
               </p>
               <!-- The SECOND weight, said here for the same reason the city one is: it
                    is the same rule everywhere on the screen. Until 26.08 this caption
                    named only the city half, so «2 guruh» here and «1,0 yuklama» on the
                    KPI payslip looked like a contradiction rather than two questions. -->
               <p class="text-[12.5px] text-[color:var(--n-faint)] mt-1.5 leading-snug">
                  Guruh SONI darajaga bog'liq emas. Oylikda hisoblanadigan
                  <b>yuklama</b> esa darajani ham qo'shadi: Komfort 1,0 · Premium / Lux
                  0,5 — ya'ni ikkita Premium guruh 2 guruh, lekin 1,0 yuklama.
               </p>
            </div>
         </div>
      </div>

      <!-- ──────────────── WORKLOAD IN A WINDOW ────────────────
           The same people, the other question: not "how many groups are theirs" but "how
           many were they running THIS week / THIS month" — the workload figure the extra
           reward is decided on (owner, 2026-08-10).

           Its own Haftalik/Oylik switch, not the panel's period selector: the roster
           below is deliberately period-free and says so in as many words, and one screen
           obeying two different period controls is how a reader ends up misreading both
           numbers. The window it actually got is printed under the switch, so the chart
           never leaves you guessing which days you are looking at.

           Only leaders who ran at least one group get a column — a row of flat zeroes is
           a wall, not a chart — and the count of those who ran none is stated beneath it,
           so nothing is silently dropped. -->
      <div v-if="s.periodCountsError !== 'forbidden'" class="card p-5 n-enter" style="--i: 1">
         <h3 class="n-h">Davr bo'yicha yuklama</h3>
         <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1.5 leading-snug">
            Tanlangan davrda har bir ellikboshi qancha ish birligini olib borgan.
         </p>

         <div class="seg mt-3.5 lg:inline-flex lg:w-auto">
            <button v-for="p in GROUP_PERIODS" :key="p.value"
               @click="s.setGroupPeriod(p.value)"
               :class="s.groupPeriod === p.value ? 'is-on' : ''">
               {{ p.label }}
            </button>
         </div>
         <p v-if="s.periodRange.from" class="text-[12.5px] text-[color:var(--n-faint)] mt-2 tabular-nums">
            {{ dmy(s.periodRange.from) }} — {{ dmy(s.periodRange.to) }}
         </p>

         <div v-if="s.periodCountsLoading" class="mt-5 h-[10.5rem] rounded-2xl bg-gray-100 animate-pulse"></div>

         <div v-else-if="s.periodCountsError === 'failed'" class="mt-5 text-center py-6">
            <p class="text-[15px] text-[color:var(--n-muted)] mb-4">Ma'lumot yuklanmadi.</p>
            <button @click="s.loadPeriodCounts()" class="btn-primary">Qayta urinish</button>
         </div>

         <p v-else-if="!periodChart.cols.length"
            class="mt-5 text-[14.5px] text-[color:var(--n-muted)] leading-snug">
            Bu davrda birorta guruh yo'lda bo'lmagan.
         </p>

         <div v-else class="mt-5">
            <!-- Wide charts scroll inside their own box rather than squeezing every
                 column to a hairline: with a dozen ellikboshilar an equal-share row is
                 unreadable, and the value sits above each column anyway. -->
            <div class="n-chart-scroll">
               <div class="n-chart" :style="{ minWidth: periodChart.cols.length * 4.25 + 'rem' }">
                  <div class="n-chart-plot">
                     <div class="n-chart-axis">
                        <div v-for="t in periodChart.ticks" :key="t.at" class="n-chart-tick"
                           :style="{ bottom: t.at + '%' }">
                           <span>{{ t.label }}</span><i></i>
                        </div>
                     </div>
                     <div class="n-chart-cols">
                        <button v-for="c in periodChart.cols" :key="c.username" type="button"
                           class="n-chart-col"
                           :title="`${c.name} · ${c.group_count} guruh · ${fmtUnits(c.weighted_units)} ish birligi`"
                           @click="openCol = openCol === c.username ? '' : c.username">
                           <span class="n-chart-val">{{ fmtUnits(c.weighted_units) }}</span>
                           <span class="n-chart-bar"
                              :style="{ height: c.height + '%', '--c': c.color }"></span>
                        </button>
                     </div>
                  </div>
                  <div class="n-chart-names">
                     <span v-for="c in periodChart.cols" :key="c.username" class="n-chart-name">
                        {{ c.short }}
                     </span>
                  </div>
               </div>
            </div>

            <!-- Tapping a column names ITS OWN groups, with the trip dates that put each
                 one inside this window. The roster's drill-down below answers a different
                 question (everything ever assigned), so the two must not share a list. -->
            <div v-if="openGroups.length" class="mt-3.5 pt-3.5" style="border-top: 1px solid var(--n-line-soft)">
               <p class="n-tile-label">{{ openName }}</p>
               <ul class="mt-2 space-y-1.5">
                  <li v-for="g in openGroups" :key="g.telegram_id"
                     class="text-[13.5px] text-[color:var(--n-muted)]">
                     {{ g.title || ('Guruh ' + g.telegram_id) }}
                     <span v-if="g.cities.length < 2" class="text-[color:var(--n-faint)]">
                        · faqat {{ cityName(g.cities[0]) }}
                     </span>
                     <span class="text-[color:var(--n-faint)] tabular-nums">
                        · {{ dmy(g.trip_start_date) }} — {{ dmy(g.trip_end_date) }}
                     </span>
                  </li>
               </ul>
            </div>

            <p class="mt-3.5 text-[12.5px] text-[color:var(--n-faint)] leading-snug">
               <span v-if="periodIdle">{{ periodIdle }} ellikboshida bu davrda guruh bo'lmagan.</span>
               <!-- The same caveat the API carries: a group with no trip dates cannot be
                    placed in any window, so it is counted nowhere. Said out loud, because
                    silence about it reads as "there were none". -->
               <span v-if="s.periodUnscheduled">
                  {{ s.periodUnscheduled }} ta guruhda safar sanasi yo'q — hisobga olinmadi.
               </span>
            </p>
         </div>
      </div>

      <div v-if="s.leaderGroupsLoading" class="card divide-y divide-gray-100 overflow-hidden">
         <div v-for="i in 5" :key="i" class="flex items-center gap-3.5 px-5 py-3.5">
            <span class="w-9 h-9 rounded-full bg-gray-100 shrink-0 animate-pulse"></span>
            <div class="h-3 flex-1 max-w-[180px] rounded-full bg-gray-100 animate-pulse"></div>
         </div>
      </div>

      <!-- A refused read and a broken one are different facts and must not share a
           message: one is "not yours to see", the other is "try again". -->
      <div v-else-if="s.leaderGroupsError === 'forbidden'" class="card p-8 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] leading-snug">
            Bu bo'lim ellikboshilar bo'yicha, sizning doirangizdan tashqarida.
         </p>
      </div>
      <div v-else-if="s.leaderGroupsError === 'failed'" class="card p-8 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">Ma'lumot yuklanmadi.</p>
         <button @click="s.loadLeaderGroups()" class="btn-primary">Qayta urinish</button>
      </div>

      <div v-else-if="!s.leaderGroups.length" class="card p-8 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)]">Hali birorta ellikboshi qo'shilmagan.</p>
      </div>

      <div v-else class="card overflow-hidden n-enter" style="--i: 1">
         <!-- Totals first: the sum is what makes a single row arguable ("he has 4 of our
              21"), and the unassigned count is the number the office has to act on. -->
         <div class="flex flex-wrap gap-x-6 gap-y-1 px-5 py-3.5 border-b border-gray-100 text-[13.5px] text-[color:var(--n-muted)]">
            <span><b class="text-[color:var(--n-ink)] tabular-nums">{{ s.leaderGroups.length }}</b> ellikboshi</span>
            <span><b class="text-[color:var(--n-ink)] tabular-nums">{{ totalGroups }}</b> guruh biriktirilgan</span>
            <!-- Only when a group is actually split: on a roster where every leader
                 holds both cities the weighted total equals the raw one, and showing
                 the same number twice would just make the reader hunt for a difference
                 that is not there. -->
            <span v-if="anySplit"><b class="text-[color:var(--n-ink)] tabular-nums">{{ fmtUnits(totalUnits) }}</b> ish birligi</span>
            <span v-if="withoutGroups" class="text-amber-700">
               <b class="tabular-nums">{{ withoutGroups }}</b> ellikboshida guruh yo'q
            </span>
         </div>

         <ul class="divide-y divide-gray-100">
            <li v-for="l in s.leaderGroups" :key="l.username" class="px-5 py-3">
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
                        <!-- Still holds groups, but no longer in the Ellikboshilar pool.
                             Flagged rather than hidden: the groups are really theirs, and
                             dropping the row would make the total stop adding up. -->
                        <span v-if="!l.in_pool" class="text-amber-700">
                           · ro'yxatdan olib tashlangan
                        </span>
                     </span>
                  </span>
                  <span class="text-right shrink-0">
                     <span class="block text-[14.5px] tabular-nums"
                           :class="l.group_count ? 'font-semibold' : 'text-[color:var(--n-faint)]'">
                        {{ l.group_count }} guruh
                     </span>
                     <!-- The weighted figure appears ONLY when this leader actually
                          holds a half-group. For everybody else it would be the same
                          number in a second row, which teaches the reader to ignore it. -->
                     <span v-if="l.weighted_units !== l.group_count"
                           class="block text-[11.5px] tabular-nums text-[color:var(--n-faint)]">
                        {{ fmtUnits(l.weighted_units) }} birlik
                     </span>
                     <!-- ...and the DARAJA-weighted figure, which is what the KPI payslip
                          pays on (owner, 2026-08-26). Same rule as the line above: shown
                          only when Daraja actually changed something, so a roster of
                          comfort groups does not print one number three times. Two
                          premium groups read «2 guruh» here and «1,0 yuklama» there —
                          before this line the two tabs simply disagreed. -->
                     <span v-if="l.sg !== l.weighted_units"
                           class="block text-[11.5px] tabular-nums text-[color:var(--n-faint)]">
                        {{ fmtUnits(l.sg) }} yuklama · daraja b-n
                     </span>
                  </span>
                  <!-- chevron-RIGHT rotated, because that one is already in the icon
                       library; adding chevron-down for the same job would ship a second
                       glyph and, if forgotten, render nothing at all. -->
                  <font-awesome-icon v-if="l.group_count" icon="chevron-right"
                     class="w-3 h-3 text-[color:var(--n-faint)] shrink-0 transition-transform duration-300"
                     :class="open === l.username ? 'rotate-90' : ''" />
               </button>

               <!-- The drill-down. A total nobody can check is not evidence, and "which
                    four?" is the immediate next question in any conversation about it. -->
               <ul v-if="open === l.username && l.group_count" class="mt-2.5 ml-[3.25rem] space-y-1.5">
                  <li v-for="g in l.groups" :key="g.telegram_id"
                     class="text-[13.5px] text-[color:var(--n-muted)]">
                     {{ g.title || ('Guruh ' + g.telegram_id) }}
                     <!-- Which HALF of the group is theirs. Named only on a split one:
                          on a whole group the city adds nothing and costs a line on a
                          phone. This is also what makes the weighted total checkable. -->
                     <span v-if="g.cities.length < 2" class="text-[color:var(--n-faint)]">
                        · faqat {{ cityName(g.cities[0]) }} ({{ fmtUnits(g.weight) }})
                     </span>
                     <!-- The Daraja and what this group is worth under it — the same
                          reason the city is named: a total nobody can check by hand is
                          not evidence. Only when Daraja moved the number, so a comfort
                          group (which is worth exactly its city weight) stays a
                          one-line entry. -->
                     <span v-if="g.tier_set && g.sg !== g.weight" class="text-[color:var(--n-faint)]">
                        · {{ tierName(g.tier) }} ({{ fmtUnits(g.sg) }})
                     </span>
                     <!-- An unset Daraja is an unanswered question, not a premium group.
                          It was counted as a WHOLE group, and this says so here rather
                          than leaving a reader to wonder why the totals do not divide. -->
                     <span v-else-if="!g.tier_set" class="text-amber-700">
                        · daraja belgilanmagan
                     </span>
                  </li>
               </ul>
            </li>
         </ul>
      </div>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNazoratStore } from '../../stores/nazorat'
import { initials, PIE_COLORS } from './shared'

const s = useNazoratStore()
const open = ref('')
// Separate from `open` on purpose: the chart's drill-down lists the groups that ran in
// THIS WINDOW, the roster's lists everything ever assigned. One ref would make tapping a
// column silently answer the other question.
const openCol = ref('')

const totalGroups = computed(() => s.leaderGroups.reduce((n, l) => n + l.group_count, 0))
const withoutGroups = computed(() => s.leaderGroups.filter((l) => !l.group_count).length)

/** City-weighted workload across the roster (Makka 0.6 / Madina 0.4 — owner,
 *  2026-08-16). Rounded at the end, not per row: summing already-rounded halves is how
 *  a total ends up one hundredth off the rows it is meant to be the sum of. */
const totalUnits = computed(() =>
   s.leaderGroups.reduce((n, l) => n + l.weighted_units, 0))
/** Is any group actually split between two leaders? Until one is, every weighted figure
 *  on this screen equals its raw count and the whole column is noise. */
const anySplit = computed(() =>
   s.leaderGroups.some((l) => l.weighted_units !== l.group_count))

/** 2.6, not 2.60 and not 2.5999999999. Whole numbers lose the decimal entirely: "3
 *  birlik" is the same fact as "3.0 birlik" and reads as a count, which it is. */
function fmtUnits(n: number) {
   return Number(n.toFixed(2)).toString()
}

// Mirrors server/bot/services/kpi.py CITY_WEIGHTS. Duplicated ONLY to caption the
// screen — every weighted number rendered here is computed on the server, so these two
// constants drifting apart can mislabel the rule but can never change a total.
const CITY_WEIGHT_MAKKA = 0.6
const CITY_WEIGHT_MADINA = 0.4

const CITY_NAMES: Record<string, string> = {
   makka: 'Makkada', madina: 'Madinada', jidda: 'Jiddada',
}
function cityName(c?: string) {
   return c ? (CITY_NAMES[c] || c) : ''
}

// The Daraja names the Guruhlar SELECT already uses, so the roster calls a package what
// the person who set it called it. Only the two real tiers appear here: an unset Daraja
// is rendered by its own amber line, never as a tier name, because it is not one.
const TIER_NAMES: Record<string, string> = {
   comfort: 'Komfort', premium: 'Premium / Lux',
}
function tierName(t?: string | null) {
   return t ? (TIER_NAMES[t] || t) : ''
}

const GROUP_PERIODS = [
   { value: 'week' as const, label: 'Haftalik' },
   { value: 'month' as const, label: 'Oylik' },
]

/** 2026-08-10 -> 10.08. The year is dropped: both ends of a window this short are in the
 *  same one, and the pair has to fit on a phone. */
function dmy(iso: string) {
   const [, m, d] = (iso || '').split('-')
   return d && m ? `${d}.${m}` : ''
}

/** The columns, biggest workload first — unlike the response-time chart next door, a
 *  ranking is exactly what this number is for: more groups IS more work, and that is the
 *  question the extra reward is decided on.
 *
 *  Ranked and drawn on the WEIGHTED units, not the leg count: two leaders can hold the
 *  same number of legs and not the same amount of work, and this chart exists to answer
 *  "who carried more". Until a group is actually split the two are identical, so nothing
 *  about the picture changes on the day this ships.
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

/** Leaders in the pool who ran nothing in the window — stated under the chart rather
 *  than drawn as flat zero columns. */
const periodIdle = computed(() => s.periodCounts.filter((l) => !l.group_count).length)

const openRow = computed(() => s.periodCounts.find((l) => l.username === openCol.value))
const openGroups = computed(() => openRow.value?.groups || [])
const openName = computed(() => openRow.value ? (openRow.value.name || openRow.value.username) : '')

// Loaded here rather than in the panel's load(): both reads take no group/city slice and
// the roster takes no period at all, so neither must be re-pulled when the selector moves.
onMounted(() => {
   if (!s.leaderGroups.length) s.loadLeaderGroups()
   if (!s.periodCounts.length) s.loadPeriodCounts()
})
</script>

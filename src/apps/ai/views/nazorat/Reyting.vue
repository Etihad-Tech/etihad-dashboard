<template>
   <div class="space-y-3">
      <!-- ONE WINDOW PER POPULATION, never a mixed board: a crew member and an ellikboshi
           do not receive comparable work (the crew get every room/service need for their
           city, a leader only their own group's questions), so ranking them against each
           other would say nothing. -->
      <div class="flex flex-wrap items-center gap-2">
         <div class="seg flex-1 min-w-0">
            <button v-for="m in RANK_MODES" :key="m.key" @click="rankMode = m.key"
               :class="rankMode === m.key ? 'is-on' : ''">
               {{ m.label }}
            </button>
         </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
         <!-- Only the combined account ever sees both lavozim in the data. -->
         <!-- The doctor is ranked with the ellikboshilar (see isLeaderLevel), so the
              option says so — a filter that quietly returns a Shifokor under «Ellikboshi»
              would leave the reader wondering which of the two is wrong. -->
         <select v-if="s.scope === 'all'" v-model="s.filterRole" class="filter-select">
            <option value="">Barcha lavozimlar</option>
            <option value="staff">Xodim</option>
            <option value="ellikboshi">Ellikboshi va shifokor</option>
         </select>
         <select v-model="s.filterName" class="filter-select flex-1 min-w-0">
            <option value="">Barcha ismlar</option>
            <option v-for="n in workerNameOptions" :key="n" :value="n">{{ n }}</option>
         </select>
      </div>

      <div v-if="!hasRanking" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu davr uchun ma'lumot yo'q
      </div>
      <div v-else class="grid gap-3" :class="rankGroups.length > 1 ? 'xl:grid-cols-2' : ''">
         <section v-for="(g, gi) in rankGroups" :key="g.key" class="card p-4 n-enter"
            :style="{ '--i': gi }">
            <div class="flex items-baseline justify-between gap-2 px-1">
               <h4 class="n-h">{{ g.title }}</h4>
               <p class="text-[13px] text-[color:var(--n-muted)]">
                  {{ g.rows.length }} ta · {{ rankSort.unit }}
               </p>
            </div>

            <ol class="mt-2.5 divide-y divide-gray-100">
               <li v-for="(w, i) in g.rows" :key="w.telegram_id">
                  <button type="button"
                     class="row-tap flex items-center gap-3.5 rounded-[1.125rem] px-2 py-3 hover:bg-gray-50"
                     @click="open(w.telegram_id)">
                     <!-- Leads with the PERSON, the way the design's lists do; the rank
                          numeral rides on the avatar's corner. The tint judges the VALUE,
                          not the position — topping a weak list is not the same as doing
                          well, and a green "1" beside a red 44% would contradict itself. -->
                     <span class="relative shrink-0">
                        <span class="n-avatar" :class="w.leaderLevel ? 'n-avatar-leader' : ''">
                           {{ w.initials }}
                        </span>
                        <span class="n-rank"
                           :class="w.tone === 'good' ? 'is-good' : w.tone === 'bad' ? 'is-bad' : ''">
                           {{ i + 1 }}
                        </span>
                     </span>

                     <div class="min-w-0 flex-1">
                        <!-- The name WRAPS rather than truncates. «Bekzod Rahi…» beside a
                             job badge was the panel hiding the one thing a row is about. -->
                        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                           <span class="text-[16px] font-semibold tracking-[-0.015em]">{{ w.name }}</span>
                           <span class="badge shrink-0"
                              :class="w.leaderLevel ? 'badge-indigo' : 'badge-amber'">{{ w.job }}</span>
                           <!-- How many groups are PINNED to this leader, the standing
                                load behind the period's numbers (owner, 2026-08-04). -->
                        </div>
                        <!-- Same four colours as everywhere else, so a row here and a row
                             on the person's own screen read identically. -->
                        <div class="n-split h-1.5 mt-2 w-full max-w-[300px]" :title="w.splitHint">
                           <span v-for="sg in w.segments" :key="sg.key"
                              :style="{ width: sg.pct + '%', background: sg.color }"></span>
                        </div>
                        <p class="text-[13px] text-[color:var(--n-muted)] mt-1.5 leading-snug">
                           {{ w.detail }}
                        </p>
                     </div>

                     <div class="shrink-0 flex items-center gap-2 self-start pt-0.5">
                        <div class="text-right">
                           <p class="text-[22px] font-bold tabular-nums leading-none tracking-[-0.03em]"
                              :style="{ color: w.headlineColor }">{{ w.headline }}</p>
                           <p class="text-[12px] text-[color:var(--n-faint)] mt-1.5">{{ rankSort.unit }}</p>
                           <!-- The design's meter under the figure. Only for the RATE mode,
                                where the number really is out of 100; a count of
                                «bajarildi» has no denominator and a bar would invent one. -->
                           <div v-if="rankSort.key === 'rate'" class="n-meter mt-2 w-14"
                              :style="{ '--c': w.headlineColor }">
                              <i :style="{ width: Math.round(w.rate * 100) + '%' }"></i>
                           </div>
                        </div>
                        <font-awesome-icon icon="chevron-right"
                           class="w-3 h-3 text-[color:var(--n-faint)] shrink-0" />
                     </div>
                  </button>
               </li>
            </ol>

            <!-- Too few cards to rank fairly. Shown, never hidden: "received almost
                 nothing" is itself worth seeing, but one lucky card must not put somebody
                 at the top. -->
            <div v-if="g.unranked.length" class="mt-4 pt-4 px-1"
               style="border-top: 1px solid var(--n-line-soft)">
               <p class="text-[13.5px] text-[color:var(--n-muted)] mb-2.5">
                  Reyting uchun kam ma'lumot ({{ MIN_RANK_CARDS }} tadan kam kartochka):
               </p>
               <div class="flex flex-wrap gap-2">
                  <button v-for="w in g.unranked" :key="w.telegram_id" type="button"
                     class="chip inline-flex items-center gap-1.5" @click="open(w.telegram_id)">
                     {{ w.name }}
                     <span class="text-[color:var(--n-faint)]">{{ w.accountable }} ta</span>
                  </button>
               </div>
            </div>
         </section>
      </div>

      <!-- ──────────────── PER-PERSON EVIDENCE — DESKTOP ONLY ────────────────
           The sheet of numbers is a `min-w-[860px]` table. On a phone that meant only the
           name and the city column were ever on screen and every figure sat behind a
           sideways scroll inside a vertical one, so below `lg` it is not rendered at all
           — tapping a ranking row opens the same numbers as a screen instead. On a
           desktop it stays exactly as it was, because the office reads it in a meeting. -->
      <section class="hidden lg:block">
         <h3 class="n-group-h mb-3">{{ personWord }}lar nazorati</h3>
         <div v-if="filteredWorkers.length === 0"
            class="card py-16 text-center text-[15px] text-[color:var(--n-muted)]">
            {{ s.workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
               : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
         </div>
         <div v-else class="card overflow-x-auto">
            <table class="w-full text-[14px] min-w-[860px]">
               <thead>
                  <tr class="text-left text-[12.5px] text-[color:var(--n-muted)] bg-gray-50 border-b border-gray-100">
                     <th class="px-5 py-3 font-medium">{{ personWord }}</th>
                     <th class="px-3 py-3 font-medium" title="Qaysi shaharlarda va nechta guruhda ishlagan">Qayerda</th>
                     <!-- «Kartochka»: the column is w.dms, the cards sent to this person.
                          The right unit here — a person answers for what they were sent —
                          but it was labelled «Murojaat», the overview's unit, so one word
                          named two different things on two screens. -->
                     <th class="px-3 py-3 font-medium text-right" title="Shu odamga yuborilgan kartochkalar soni">Kartochka</th>
                     <th class="px-3 py-3 font-medium text-right">Qabul</th>
                     <th class="px-4 py-3 font-medium">Natija</th>
                     <th v-for="(b, bi) in BUCKETS" :key="b.key" class="py-3 font-medium text-right"
                        :class="bi === BUCKETS.length - 1 ? 'px-5' : 'px-3'" :title="b.hint">
                        <span class="inline-flex items-center gap-1.5">
                           <span class="w-1.5 h-1.5 rounded-full" :style="{ background: b.color }"></span>
                           {{ b.short }}
                        </span>
                     </th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="w in filteredWorkers" :key="w.telegram_id"
                     class="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors cursor-pointer"
                     @click="open(w.telegram_id)">
                     <td class="px-5 py-4">
                        <div class="flex items-center gap-2 min-w-0">
                           <span class="font-semibold truncate">{{ personLabel(w) }}</span>
                           <span class="badge shrink-0"
                              :class="isLeaderLevel(w) ? 'badge-indigo' : 'badge-amber'">
                              {{ jobLabel(w) }}
                           </span>
                        </div>
                        <p v-if="w.name && w.username" class="text-[12.5px] text-[color:var(--n-faint)] mt-0.5">
                           {{ w.username }}
                        </p>
                     </td>
                     <td class="px-3 py-4 text-[13.5px] text-[color:var(--n-muted)] whitespace-nowrap">
                        {{ whereLabel(w) }}
                        <!-- The standing assignment beside the period's own figure — they
                             answer different questions (see whereLabel). -->
                     </td>
                     <td class="px-3 py-4 text-right tabular-nums">{{ w.dms }}</td>
                     <td class="px-3 py-4 text-right tabular-nums">{{ w.accepted }}</td>
                     <!-- The row's own composition, so a sheet of numbers can be scanned
                          at a glance for who is mostly red or mostly blue. -->
                     <td class="px-4 py-4">
                        <div v-if="w.dms" class="n-split h-2 w-[120px]" :title="rowSplitHint(w)">
                           <span v-for="sg in rowSegments(w)" :key="sg.key"
                              :style="{ width: sg.pct + '%', background: sg.color }"></span>
                        </div>
                     </td>
                     <!-- Values in ink, identity from the dot in the header: an amber
                          numeral on white is unreadable at this size. -->
                     <td v-for="(b, bi) in BUCKETS" :key="b.key" class="py-4 text-right tabular-nums"
                        :class="[bi === BUCKETS.length - 1 ? 'px-5' : 'px-3',
                                 (w as any)[b.key] ? 'font-semibold' : 'text-[color:var(--n-faint)]']">
                        {{ (w as any)[b.key] }}
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNazoratStore } from '../../stores/nazorat'
import {
   BUCKETS, MIN_RANK_CARDS, RANK_MODES, rankMode, isLeaderLevel,
   jobLabel, personLabel, rowSegments, rowSplitHint, whereLabel, useNazoratView,
} from './shared'

const s = useNazoratStore()
const router = useRouter()
const {
   personWord, personWordLower, workerNameOptions, filteredWorkers,
   rankSort, rankGroups, hasRanking,
} = useNazoratView()

/** A ranking row is a question — "why is this person at 44%" — so it opens the evidence
 *  rather than only stating the figure. */
function open(id: number) {
   router.push(`/ai/nazorat/xodim/${id}`)
}
</script>

<template>
   <div class="space-y-3">
      <!-- ONE BOARD PER POPULATION, never a mixed one: a crew member and an ellikboshi do
           not receive comparable work — the crew get every room/service need for their
           city, a leader only their own group's questions — so ranking them against each
           other would say nothing. The lavozim dropdown that used to say this is now the
           tabs themselves (owner, 2026-08-07); one tab is not a choice, so a lone board
           renders without the control. -->
      <div v-if="boards.length > 1" class="seg">
         <button v-for="b in boards" :key="b.key" @click="ratingTab = b.key as any"
            :class="ratingTab === b.key ? 'is-on' : ''">
            {{ b.title }}
         </button>
      </div>

      <div v-if="!board" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu davr uchun ma'lumot yo'q
      </div>

      <!-- One pie per outcome. A pie because the question this screen is actually asked
           is «who are the javobsiz ones» — a share of a whole — rather than «rank these
           people», which is what the table it replaced answered at the cost of making
           you read down it. -->
      <template v-else>
         <section v-for="(p, pi) in board.pies" :key="p.key" class="card p-5 n-enter"
            :style="{ '--i': pi }">
            <div class="flex items-baseline gap-2.5">
               <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: p.color }"></span>
               <h3 class="n-h">{{ p.label }}</h3>
               <span class="ml-auto text-[15px] font-bold tabular-nums">{{ p.total }}</span>
            </div>

            <p v-if="!p.total" class="text-[13.5px] text-[color:var(--n-muted)] mt-3">
               Bu davrda yo'q.
            </p>

            <template v-else>
               <div class="n-donut-wrap n-donut-sm mt-4 mb-1">
                  <svg class="n-donut" viewBox="0 0 120 120" role="img" :aria-label="ariaFor(p)">
                     <g class="n-donut-rot">
                        <g transform="rotate(-90 60 60)">
                           <circle class="n-donut-track" cx="60" cy="60" :r="R" />
                           <!-- aria-hidden: every slice already has a real <button> in the
                                legend, and a screen reader offered both would read the
                                same destinations twice. -->
                           <circle v-for="(sg, i) in p.slices" :key="i" class="n-donut-seg"
                              cx="60" cy="60" :r="R" :stroke="sg.color"
                              :stroke-dasharray="sg.dash" :stroke-dashoffset="sg.offset"
                              aria-hidden="true" @click="open(sg.telegram_id)">
                              <title>{{ sg.name }}: {{ sg.value }} ({{ pct(sg.pct) }})</title>
                           </circle>
                        </g>
                     </g>
                  </svg>
                  <div class="n-donut-mid">
                     <p class="text-[28px] font-bold tabular-nums leading-none tracking-[-0.04em]">
                        {{ p.total }}
                     </p>
                     <p class="text-[12px] text-[color:var(--n-muted)] mt-1">murojaat</p>
                  </div>
               </div>

               <!-- The legend IS the list: name, share, count — and the way in to the
                    person. «Yana N kishi» carries telegram_id 0 and opens nothing, so it
                    is rendered as a plain row rather than a dead button. -->
               <div class="mt-3 space-y-0.5">
                  <component v-for="(sg, i) in p.slices" :key="i"
                     :is="sg.telegram_id ? 'button' : 'div'" type="button"
                     class="w-full flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-[1.125rem]"
                     :class="sg.telegram_id ? 'row-tap' : ''"
                     @click="open(sg.telegram_id)">
                     <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: sg.color }"></span>
                     <span class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-left">
                        <span class="text-[15px] font-semibold tracking-[-0.015em]">{{ sg.name }}</span>
                        <span v-if="sg.job" class="badge shrink-0"
                           :class="board.key === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">
                           {{ sg.job }}
                        </span>
                     </span>
                     <span class="shrink-0 text-right">
                        <span class="block text-[15px] font-bold tabular-nums leading-none">
                           {{ sg.value }}
                        </span>
                        <span class="block text-[12.5px] text-[color:var(--n-faint)] tabular-nums mt-1">
                           {{ pct(sg.pct) }}
                        </span>
                     </span>
                     <font-awesome-icon v-if="sg.telegram_id" icon="chevron-right"
                        class="w-3 h-3 text-[color:var(--n-faint)] shrink-0" />
                  </component>
               </div>
            </template>
         </section>
      </template>
   </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { PIE_R as R, ratingTab, useNazoratView } from './shared'

const router = useRouter()
const { ratingBoards: boards, ratingBoard: board } = useNazoratView()

const pct = (v: number) => `${Math.round(v)}%`

const ariaFor = (p: any) =>
   `${p.label}: ${p.total} ta murojaat — `
   + p.slices.map((s: any) => `${s.name} ${s.value} (${pct(s.pct)})`).join(', ')

/** A slice is a way in to the person behind it. «Yana N kishi» has no id and opens
 *  nothing rather than guessing which of them the reader meant. */
function open(id: number) {
   if (id) router.push(`/ai/nazorat/xodim/${id}`)
}
</script>

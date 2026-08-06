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
            </div>
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
                  <span class="text-[14.5px] tabular-nums shrink-0"
                        :class="l.group_count ? 'font-semibold' : 'text-[color:var(--n-faint)]'">
                     {{ l.group_count }} guruh
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
import { initials } from './shared'

const s = useNazoratStore()
const open = ref('')

const totalGroups = computed(() => s.leaderGroups.reduce((n, l) => n + l.group_count, 0))
const withoutGroups = computed(() => s.leaderGroups.filter((l) => !l.group_count).length)

// Loaded here rather than in the panel's load(): this read takes no period and no
// group/city slice, so it must not be re-pulled every time the selector moves.
onMounted(() => { if (!s.leaderGroups.length) s.loadLeaderGroups() })
</script>

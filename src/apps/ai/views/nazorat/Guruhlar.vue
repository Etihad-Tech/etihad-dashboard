<template>
   <div class="space-y-4">
      <!-- The one screen in this panel that does NOT answer to the period selector, so it
           says so before showing a number. Without the line, a reader who has just set
           "Kunlik" next door reasonably assumes these totals are daily too. -->
      <div class="bg-white rounded-3xl border border-gray-200 p-5">
         <div class="flex items-start gap-3">
            <font-awesome-icon icon="users" class="w-4 h-4 text-violet-600 mt-1" />
            <div>
               <h3 class="text-base font-semibold text-gray-900">Guruhlar taqsimoti</h3>
               <p class="text-xs text-gray-400 mt-1">
                  Har bir ellikboshiga nechta guruh biriktirilgan. Bu son davrga bog'liq
                  emas — Kunlik / Haftalik / Oylik tanlovi uni o'zgartirmaydi.
               </p>
            </div>
         </div>
      </div>

      <div v-if="s.leaderGroupsLoading" class="flex justify-center py-10">
         <div class="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- A refused read and a broken one are different facts and must not share a
           message: one is "not yours to see", the other is "try again". -->
      <div v-else-if="s.leaderGroupsError === 'forbidden'"
           class="bg-white rounded-3xl border border-gray-200 p-6 text-center">
         <p class="text-sm text-gray-500">Bu bo'lim ellikboshilar bo'yicha — sizning doirangizdan tashqarida.</p>
      </div>
      <div v-else-if="s.leaderGroupsError === 'failed'"
           class="bg-white rounded-3xl border border-gray-200 p-6 text-center">
         <p class="text-sm text-gray-500 mb-3">Ma'lumot yuklanmadi.</p>
         <button @click="s.loadLeaderGroups()" class="btn-primary">Qayta urinish</button>
      </div>

      <div v-else-if="!s.leaderGroups.length"
           class="bg-white rounded-3xl border border-gray-200 p-6 text-center">
         <p class="text-sm text-gray-500">Hali birorta ellikboshi qo'shilmagan.</p>
      </div>

      <div v-else class="bg-white rounded-3xl border border-gray-200 overflow-hidden">
         <!-- Totals first: the sum is what makes a single row arguable ("he has 4 of our
              21"), and the unassigned count is the number the office has to act on. -->
         <div class="flex flex-wrap gap-x-6 gap-y-1 px-5 py-3 border-b border-gray-100 text-xs text-gray-500">
            <span><b class="text-gray-900">{{ s.leaderGroups.length }}</b> ellikboshi</span>
            <span><b class="text-gray-900">{{ totalGroups }}</b> guruh biriktirilgan</span>
            <span v-if="withoutGroups" class="text-amber-600">
               <b>{{ withoutGroups }}</b> ellikboshida guruh yo'q
            </span>
         </div>

         <ul class="divide-y divide-gray-100">
            <li v-for="l in s.leaderGroups" :key="l.username" class="px-5 py-3">
               <button class="w-full flex items-center gap-3 text-left"
                       @click="open = open === l.username ? '' : l.username">
                  <span class="w-8 h-8 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                     {{ initials(l.name || l.username) }}
                  </span>
                  <span class="min-w-0 flex-1">
                     <span class="block text-sm font-medium text-gray-900 truncate">
                        {{ l.name || l.username }}
                     </span>
                     <span class="block text-[11px] text-gray-400 truncate">
                        {{ l.name ? l.username : '' }}
                        <!-- Still holds groups, but no longer in the Ellikboshilar pool.
                             Flagged rather than hidden: the groups are really theirs, and
                             dropping the row would make the total stop adding up. -->
                        <span v-if="!l.in_pool" class="text-amber-600">
                           · ro'yxatdan olib tashlangan
                        </span>
                     </span>
                  </span>
                  <span class="text-sm tabular-nums shrink-0"
                        :class="l.group_count ? 'font-semibold text-gray-900' : 'text-gray-400'">
                     {{ l.group_count }} guruh
                  </span>
                  <!-- chevron-RIGHT rotated, because that one is already in the icon
                       library; adding chevron-down for the same job would ship a second
                       glyph and, if forgotten, render nothing at all. -->
                  <font-awesome-icon v-if="l.group_count" icon="chevron-right"
                     class="w-3 h-3 text-gray-300 shrink-0 transition-transform"
                     :class="open === l.username ? 'rotate-90' : ''" />
               </button>

               <!-- The drill-down. A total nobody can check is not evidence, and "which
                    four?" is the immediate next question in any conversation about it. -->
               <ul v-if="open === l.username && l.group_count" class="mt-2 ml-11 space-y-1">
                  <li v-for="g in l.groups" :key="g.telegram_id" class="text-xs text-gray-500">
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

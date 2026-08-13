<template>
   <div class="space-y-3">
      <!-- A skeleton in the shape of the list rather than a spinner, the same way the
           journal waits: the wait should look like what is coming. -->
      <div v-if="s.personalLoading" class="card divide-y divide-gray-100 overflow-hidden">
         <div v-for="i in 3" :key="i" class="flex gap-3.5 px-4 py-4">
            <span class="w-10 h-10 rounded-[1.125rem] bg-gray-100 shrink-0 animate-pulse"></span>
            <div class="flex-1 space-y-2 py-1">
               <div class="h-3 rounded-full bg-gray-100 animate-pulse"></div>
               <div class="h-3 w-2/3 rounded-full bg-gray-100 animate-pulse"></div>
            </div>
         </div>
      </div>

      <!-- The empty state says WHY it is empty. Until the cabinet can open a request
           this list is empty for a reason that has nothing to do with the period, and
           a bare "no requests" would read as a quiet week instead of a feature that is
           not switched on yet. -->
      <div v-else-if="!rows.length"
         class="card py-16 px-6 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu davrda shaxsiy murojaat bo'lmagan.
         <p class="mt-1.5 text-[13.5px] text-[color:var(--n-faint)]">
            Bu yerga ziyoratchi o'z kabinetidan yozgan murojaatlar tushadi —
            guruhdagi xabarlar «Jurnal»da qoladi.
         </p>
      </div>

      <div v-else class="card divide-y divide-gray-100 overflow-hidden">
         <!-- Same row as the journal's, deliberately: one murojaat, led by its outcome
              colour. A controller reads both screens and they must not look like two
              different kinds of record. -->
         <article v-for="r in rows" :key="r.id" class="flex gap-3.5 px-4 py-4">
            <span class="n-ico mt-0.5" :style="{ '--c': r.outcome.color }">
               <font-awesome-icon :icon="r.outcome.icon" class="w-4 h-4" />
            </span>
            <div class="min-w-0 flex-1">
               <p class="text-[15.5px] leading-snug clamp2">
                  <span v-if="r.is_repeat" class="badge badge-amber mr-1 align-middle">Takroriy</span>
                  <span v-if="r.text">{{ r.text }}</span>
                  <span v-else class="text-[color:var(--n-faint)]">Matnsiz</span>
               </p>

               <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                  <span class="pill" :style="{ color: r.outcome.color, background: r.outcome.color + '17' }">
                     <i></i>{{ r.outcome.label }}
                  </span>
                  <span class="text-[13.5px] text-[color:var(--n-muted)] min-w-0">{{ r.outcome.detail }}</span>
               </div>

               <!-- No «Xabarni ko'rish» link, and its absence is correct rather than an
                    omission: a cabinet request has no message in any chat to jump to.
                    The group is still named, because it is what decides who the request
                    was routed to. -->
               <p class="flex flex-wrap gap-x-1.5 gap-y-0.5 mt-2 text-[12.5px] text-[color:var(--n-faint)]">
                  <span>{{ fmtDateTime(r.created_at) }}</span>
                  <span class="text-[color:var(--n-muted)]">· {{ r.group_label }}</span>
                  <span v-if="r.city">· {{ cityLabel(r.city) }}</span>
                  <span v-if="r.room_no">· {{ r.room_no }}-xona</span>
                  <span v-if="r.pilgrim_username">· {{ r.pilgrim_username }}</span>
               </p>
            </div>
         </article>
      </div>
   </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useNazoratStore } from '../../stores/nazorat'
import { cityLabel, fmtDateTime, useNazoratView } from './shared'

/**
 * «Shaxsiy murojat» — what pilgrims sent from their own cabinet.
 *
 * Its own screen rather than a chip on the journal, because it answers a different
 * question. The journal is "what happened in the groups"; this is "who wrote to us
 * directly" — and those requests behave differently enough to be worth separating:
 * there is no group message behind them, so there is nothing to jump to, and nobody
 * else in the group saw the pilgrim ask.
 *
 * The rows come from a SEPARATE fetch (`source=miniapp`), not a filter over the
 * journal's window. See `loadPersonal` for why: private requests are a small minority,
 * so filtering the last N of everything would routinely show none while older ones
 * existed.
 */
const s = useNazoratStore()
const { personalFeed: rows } = useNazoratView()

// This screen is the only reader of that list, so it is the one that pays for it.
onMounted(() => s.loadPersonal())
</script>

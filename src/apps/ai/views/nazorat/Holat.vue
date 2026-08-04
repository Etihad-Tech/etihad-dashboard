<template>
   <div class="space-y-3">
      <!-- «Diqqat talab qiladi» is no longer here. It led the page, which put five
           notices between the reader and every other number on every visit — including
           the days when nothing was wrong. It now lives behind the bell in the title
           bar, which carries the count. See Ogohlantirishlar.vue. -->

      <!-- ──────────────── 1. THE HEADLINE ────────────────
           The design leads with one big figure and its shape over the period. Ours is
           the period's murojaat count, and the "shape" is the composition it ended up in
           — the same proportional bar the legend below explains, so the hero is not a
           second, decorative reading of the data. -->
      <section v-if="headline" class="card p-4">
         <div class="flex items-start gap-3">
            <span class="n-ico" :style="{ '--c': headline.color }">
               <font-awesome-icon :icon="headline.icon" class="w-4 h-4" />
            </span>
            <div class="min-w-0 flex-1">
               <p class="n-tile-label">{{ headline.label }}</p>
               <p class="text-[30px] font-bold tracking-tight text-gray-900 tabular-nums leading-none mt-1">
                  {{ headline.value }}
               </p>
               <p class="n-tile-hint mt-1.5">{{ headline.hint }}</p>
            </div>
         </div>

         <div v-if="bucketTotal" class="mt-4 flex gap-0.5 h-2.5" role="img"
            :aria-label="bucketSegments.map(sg => `${sg.label}: ${sg.value}`).join(', ')">
            <div v-for="sg in bucketSegments" :key="sg.key" class="rounded-[3px] transition-all"
               :style="{ width: sg.pct + '%', background: sg.color }" :title="`${sg.label}: ${sg.value}`">
            </div>
         </div>
         <div v-else class="mt-4 h-2.5 rounded-[3px] bg-gray-100"></div>
      </section>

      <!-- ──────────────── 2. THE PERIOD'S OTHER TWO FACTS ────────────────
           Tiles rather than a divided strip. Same numbers, same wording — «O'rtacha javob
           vaqti» is the owner's phrase and a tile lets it WRAP instead of being clipped
           to «O'rtacha jav…», which was the old row's only way of fitting it. -->
      <section v-if="sideStats.length" class="grid grid-cols-2 gap-3">
         <div v-for="c in sideStats" :key="c.key" class="n-tile">
            <span class="n-ico n-ico-sm" :style="{ '--c': c.color }">
               <font-awesome-icon :icon="c.icon" class="w-3.5 h-3.5" />
            </span>
            <p class="n-tile-label mt-2">{{ c.label }}</p>
            <p class="n-tile-value mt-0.5">{{ c.value }}</p>
            <p v-if="c.hint" class="n-tile-hint mt-0.5">{{ c.hint }}</p>
         </div>
      </section>

      <!-- ──────────────── 3. THE SPLIT ────────────────
           The four outcomes with their explanations, in full. The bar itself has already
           been drawn above; this is the legend that says what each colour MEANS, and the
           hint under every line is the owner's wording, kept verbatim (2026-07-31). -->
      <section class="card p-4">
         <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <h3 class="n-h">{{ personWord }} javoblari — natija</h3>
            <p class="text-[12px] text-gray-500">
               Jami {{ bucketTotal }} ta kartochka · har bir {{ personWordLower }} uchun
               alohida sanaladi
            </p>
         </div>

         <div class="mt-3 divide-y divide-gray-50">
            <div v-for="b in bucketRows" :key="b.key" class="flex items-start gap-2.5 py-2.5 first:pt-1">
               <span class="n-ico n-ico-sm" :style="{ '--c': b.color }">
                  <span class="w-2 h-2 rounded-full" :style="{ background: b.color }"></span>
               </span>
               <div class="min-w-0 flex-1">
                  <p class="text-sm leading-tight">
                     <span class="text-gray-900 font-semibold">{{ b.label }}</span>
                     <span v-if="bucketTotal" class="text-gray-400 ml-1.5 tabular-nums">{{ b.pctLabel }}</span>
                  </p>
                  <p class="text-[12.5px] text-gray-500 leading-snug mt-0.5">{{ b.hint }}</p>
               </div>
               <span class="text-[17px] font-bold text-gray-900 tabular-nums leading-none shrink-0">
                  {{ b.value }}
               </span>
            </div>
         </div>
      </section>

      <!-- confirmed bot mistakes, by kind -->
      <section v-if="errorKinds.length" class="card p-4">
         <h3 class="n-h mb-3">Bot xatolari — turlari bo'yicha</h3>
         <div class="space-y-3">
            <div v-for="k in errorKinds" :key="k.label" class="flex items-center gap-3">
               <span class="text-[13px] text-gray-600 w-32 sm:w-44 shrink-0 truncate">{{ k.label }}</span>
               <div class="n-meter flex-1" style="--c: #e11d48">
                  <i :style="{ width: (s.report && s.report.bot_mistakes ? (k.count / s.report.bot_mistakes * 100) : 0) + '%' }"></i>
               </div>
               <span class="text-sm font-bold text-gray-900 tabular-nums w-6 text-right">{{ k.count }}</span>
            </div>
         </div>
      </section>

      <!-- tuning — ADMIN ONLY: these fields decide who turns red, and the toggle can stop
           the recording entirely, so the nazoratchi does not get them (the API enforces
           it too; this only avoids showing a button that 403s) -->
      <section v-if="isAdmin" class="card p-4">
         <h3 class="n-h mb-1">Sozlamalar</h3>
         <p class="text-[13px] text-gray-500 mb-4">
            Bir xil so'rov qayta kelganda: xodim uchun oyna tugagach — yangi so'rov;
            ellikboshi uchun 0 = hech qachon tugamaydi (doim hal qilinmagan deb sanaladi).
         </p>
         <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
               <label class="lbl">Xodim oynasi (soat)</label>
               <input v-model.number="s.form.staff_repeat_window_hours" type="number" min="0" class="inp" />
            </div>
            <div>
               <label class="lbl">Ellikboshi oynasi (soat, 0 = cheksiz)</label>
               <input v-model.number="s.form.ellikboshi_repeat_window_hours" type="number" min="0" class="inp" />
            </div>
            <div>
               <label class="lbl">IT guruh ID</label>
               <input v-model.number="s.form.it_group_id" type="number" class="inp" />
            </div>
            <div>
               <label class="lbl">IT mavzu (topic) ID</label>
               <input v-model.number="s.form.it_topic_id" type="number" class="inp" />
            </div>
         </div>
         <div class="flex flex-wrap gap-3 items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button @click="s.form.is_enabled = !s.form.is_enabled"
               class="flex items-center gap-2 text-sm font-medium transition-colors"
               :class="s.form.is_enabled ? 'text-gray-900' : 'text-gray-400'">
               <font-awesome-icon :icon="s.form.is_enabled ? 'toggle-on' : 'toggle-off'" class="w-5 h-5" />
               {{ s.form.is_enabled ? 'Nazorat yoqilgan' : 'Nazorat o\'chirilgan' }}
            </button>
            <div class="flex items-center gap-3">
               <span v-if="s.savedMsg" class="text-[13px] text-gray-500">{{ s.savedMsg }}</span>
               <button @click="s.save()" :disabled="s.saving" class="btn-primary">
                  {{ s.saving ? 'Saqlanmoqda...' : 'Saqlash' }}
               </button>
            </div>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNazoratStore } from '../../stores/nazorat'
import { useAuthStore } from '../../../../stores/auth'
import { useNazoratView } from './shared'

const s = useNazoratStore()
const auth = useAuthStore()
const {
   personWord, personWordLower, bucketRows, bucketTotal, bucketSegments,
   contextStats, errorKinds,
} = useNazoratView()

/** The design's hero figure is the first context stat (Murojaatlar); the other two sit
 *  beside each other as tiles. Split here rather than in the composable so the numbers
 *  and their wording stay defined in exactly one place. */
const headline = computed(() => contextStats.value[0] || null)
const sideStats = computed(() => contextStats.value.slice(1))

// Only the admin may tune the control system (the API enforces it; this hides the form).
const isAdmin = computed(() => !auth.role || auth.role === 'admin')
</script>

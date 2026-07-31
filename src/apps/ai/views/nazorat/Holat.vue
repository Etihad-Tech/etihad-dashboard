<template>
   <div class="space-y-3">
      <!-- «Diqqat talab qiladi» is no longer here. It led the page, which put five
           notices between the reader and every other number on every visit — including
           the days when nothing was wrong. It now lives behind the bell in the title
           bar, which carries the count. See Ogohlantirishlar.vue. -->

      <!-- ──────────────── THE SPLIT ────────────────
           One proportional bar instead of four equal cards: the question is "how did the
           work end up", and that is a composition, not four unrelated numbers. Direct-
           labelled underneath, so identity never rests on colour alone. -->
      <section class="card p-4">
         <div class="flex flex-wrap items-baseline justify-between gap-x-2">
            <h3 class="text-[15px] font-semibold text-gray-900">
               {{ personWord }} javoblari — natija
            </h3>
            <p class="text-[13px] text-gray-500">
               Jami {{ bucketTotal }} ta kartochka · har bir {{ personWordLower }} uchun
               alohida sanaladi
            </p>
         </div>

         <div v-if="bucketTotal" class="mt-3 flex gap-0.5 h-3" role="img"
            :aria-label="bucketSegments.map(sg => `${sg.label}: ${sg.value}`).join(', ')">
            <div v-for="sg in bucketSegments" :key="sg.key" class="rounded-[3px] transition-all"
               :style="{ width: sg.pct + '%', background: sg.color }" :title="`${sg.label}: ${sg.value}`">
            </div>
         </div>
         <div v-else class="mt-3 h-3 rounded-[3px] bg-gray-100"></div>

         <div class="grid gap-x-5 gap-y-2.5 mt-4 sm:grid-cols-2">
            <div v-for="b in bucketRows" :key="b.key" class="flex gap-2">
               <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" :style="{ background: b.color }"></span>
               <div class="min-w-0">
                  <p class="text-sm">
                     <span class="font-semibold text-gray-900 tabular-nums">{{ b.value }}</span>
                     <span class="text-gray-900 font-medium ml-1.5">{{ b.label }}</span>
                     <span v-if="bucketTotal" class="text-gray-500 ml-1.5 tabular-nums">{{ b.pctLabel }}</span>
                  </p>
                  <p class="text-[13px] text-gray-500 leading-snug">{{ b.hint }}</p>
               </div>
            </div>
         </div>
      </section>

      <!-- ──────────────── 3. CONTEXT NUMBERS ────────────────
           Deliberately small: they describe the period, they are not the verdict on
           anybody. One row even on a phone — stacked they took three full-width rows and
           read as three findings rather than one footnote. -->
      <section class="card flex divide-x divide-gray-100">
         <!-- Labels WRAP rather than truncate: «O'rtacha javob vaqti» is the owner's
              wording and clipping it to «O'rtacha jav…» would be shortening it by other
              means. -->
         <div v-for="c in contextStats" :key="c.label" class="flex-1 min-w-0 px-3 py-2.5">
            <p class="text-[11px] text-gray-500 leading-tight">{{ c.label }}</p>
            <p class="text-[17px] font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">
               {{ c.value }}
            </p>
            <p v-if="c.hint" class="text-[11px] text-gray-400 leading-tight mt-0.5">{{ c.hint }}</p>
         </div>
      </section>

      <!-- confirmed bot mistakes, by kind -->
      <section v-if="errorKinds.length" class="card p-4">
         <h3 class="text-[15px] font-semibold text-gray-900 mb-3">Bot xatolari — turlari bo'yicha</h3>
         <div class="space-y-2.5">
            <div v-for="k in errorKinds" :key="k.label" class="flex items-center gap-3">
               <span class="text-[13px] text-gray-600 w-32 sm:w-44 shrink-0 truncate">{{ k.label }}</span>
               <div class="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-gray-500"
                     :style="{ width: (s.report && s.report.bot_mistakes ? (k.count / s.report.bot_mistakes * 100) : 0) + '%' }"></div>
               </div>
               <span class="text-sm font-semibold text-gray-900 tabular-nums w-6 text-right">{{ k.count }}</span>
            </div>
         </div>
      </section>

      <!-- tuning — ADMIN ONLY: these fields decide who turns red, and the toggle can stop
           the recording entirely, so the nazoratchi does not get them (the API enforces
           it too; this only avoids showing a button that 403s) -->
      <section v-if="isAdmin" class="card p-4">
         <h3 class="text-[15px] font-semibold text-gray-900 mb-1">Sozlamalar</h3>
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

// Only the admin may tune the control system (the API enforces it; this hides the form).
const isAdmin = computed(() => !auth.role || auth.role === 'admin')
</script>

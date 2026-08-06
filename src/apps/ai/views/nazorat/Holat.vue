<template>
   <div class="space-y-3">
      <!-- «Diqqat talab qiladi» is no longer here. It led the page, which put five
           notices between the reader and every other number on every visit, including
           the days when nothing was wrong. It now lives behind the bell in the title
           bar, which carries the count. See Ogohlantirishlar.vue. -->

      <!-- ──────────────── 1. THE HEADLINE ────────────────
           One figure, given the whole card. The composition bar used to sit under it,
           which quietly implied the two were the same set of things: they are not. This
           number counts NEEDS (13 murojaat) while the bar counts RECIPIENT ROWS (17
           kartochka), and the two denominators sitting in one card with no boundary
           between them is how a reader ends up thinking 13 and 17 must reconcile. The
           bar now lives in section 3, directly above the legend that states its total. -->
      <section v-if="headline" class="card p-5 n-enter" style="--i: 0">
         <div class="flex items-start gap-3.5">
            <span class="n-ico" :style="{ '--c': headline.color }">
               <font-awesome-icon :icon="headline.icon" class="w-[18px] h-[18px]" />
            </span>
            <div class="min-w-0 flex-1">
               <p class="n-tile-label">{{ headline.label }}</p>
               <p class="text-[42px] font-bold tracking-[-0.045em] tabular-nums leading-[0.95] mt-1.5">
                  {{ headline.value }}
               </p>
               <p class="n-tile-hint mt-2.5">{{ headline.hint }}</p>
            </div>
         </div>
      </section>

      <!-- ──────────────── 2. THE VERDICT ────────────────
           The bar and the legend that explains it, in one card, with the total they are
           both drawn from stated at the top. The hint under every line is the owner's
           wording, kept verbatim (2026-07-31). -->
      <section class="card p-5 n-enter" style="--i: 1">
         <h3 class="n-h">{{ personWord }} javoblari</h3>
         <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1 leading-snug">
            Jami {{ bucketTotal }} ta kartochka, har bir {{ personWordLower }} uchun
            alohida sanaladi
         </p>

         <div v-if="bucketTotal" class="n-split h-3 mt-4" role="img"
            :aria-label="bucketSegments.map(sg => `${sg.label}: ${sg.value}`).join(', ')">
            <span v-for="sg in bucketSegments" :key="sg.key"
               :style="{ width: sg.pct + '%', background: sg.color }"
               :title="`${sg.label}: ${sg.value}`"></span>
         </div>
         <div v-else class="h-3 mt-4 rounded-full bg-[color:var(--n-sunken)]"></div>

         <div class="mt-4 space-y-0.5">
            <!-- Each outcome opens the Jurnal already filtered to it. A count here is
                 always the same question ("which twenty?") and the answer was two taps
                 and a chip away; the row that states the number is the natural place to
                 ask from. Rows with a zero still open, because "show me the none" is a
                 legitimate check rather than a dead end.

                 The count and its share are one reading, so they are one block: stacked
                 on the right, the figure leading and the share under it. They used to
                 sit at opposite ends of the row, a grey percentage beside the label and
                 a bold count against the far edge, and neither one won. -->
            <button v-for="b in bucketRows" :key="b.key" type="button"
               class="row-tap flex items-start gap-3 py-3 -mx-2 px-2 rounded-[1.125rem]"
               @click="openJurnal(b.key)">
               <span class="n-ico n-ico-sm mt-0.5" :style="{ '--c': b.color }">
                  <span class="w-2.5 h-2.5 rounded-full" :style="{ background: b.color }"></span>
               </span>
               <div class="min-w-0 flex-1">
                  <p class="text-[16px] font-semibold tracking-[-0.015em] leading-tight">
                     {{ b.label }}
                  </p>
                  <p class="text-[13.5px] text-[color:var(--n-muted)] leading-snug mt-1">
                     {{ b.hint }}
                  </p>
               </div>
               <div class="shrink-0 flex items-center gap-1.5">
                  <div class="text-right">
                     <p class="text-[22px] font-bold tabular-nums leading-none tracking-[-0.03em]"
                        :class="b.value ? '' : 'text-[color:var(--n-faint)]'">
                        {{ b.value }}
                     </p>
                     <p v-if="bucketTotal" class="text-[12.5px] text-[color:var(--n-faint)] tabular-nums mt-1.5">
                        {{ b.pctLabel }}
                     </p>
                  </div>
                  <font-awesome-icon icon="chevron-right"
                     class="w-3 h-3 text-[color:var(--n-faint)] shrink-0" />
               </div>
            </button>
         </div>
      </section>

      <!-- ──────────────── 3. THE PERIOD'S OTHER TWO FACTS ────────────────
           Tiles rather than a divided strip. Same numbers, same wording: «O'rtacha javob
           vaqti» is the owner's phrase and a tile lets it WRAP instead of being clipped
           to «O'rtacha jav…», which was the old row's only way of fitting it. -->
      <section v-if="sideStats.length" class="grid grid-cols-2 gap-3">
         <div v-for="(c, i) in sideStats" :key="c.key" class="n-tile n-enter"
            :style="{ '--i': 2 + i }">
            <span class="n-ico n-ico-sm" :style="{ '--c': c.color }">
               <font-awesome-icon :icon="c.icon" class="w-4 h-4" />
            </span>
            <p class="n-tile-label mt-3">{{ c.label }}</p>
            <p class="n-tile-value mt-1">{{ c.value }}</p>
            <p v-if="c.hint" class="n-tile-hint mt-1">{{ c.hint }}</p>
         </div>
      </section>

      <!-- confirmed bot mistakes, by kind -->
      <section v-if="errorKinds.length" class="card p-5 n-enter" style="--i: 4">
         <h3 class="n-h mb-4">Bot xatolari turlari</h3>
         <div class="space-y-3.5">
            <div v-for="k in errorKinds" :key="k.label" class="flex items-center gap-3">
               <span class="text-[14px] text-[color:var(--n-ink-2)] w-32 sm:w-44 shrink-0 truncate">
                  {{ k.label }}
               </span>
               <div class="n-meter flex-1" style="--c: #ef4444">
                  <i :style="{ width: (s.report && s.report.bot_mistakes ? (k.count / s.report.bot_mistakes * 100) : 0) + '%' }"></i>
               </div>
               <span class="text-[15px] font-bold tabular-nums w-6 text-right">{{ k.count }}</span>
            </div>
         </div>
      </section>

      <!-- tuning - ADMIN ONLY: these fields decide who turns red, and the toggle can stop
           the recording entirely, so the nazoratchi does not get them (the API enforces
           it too; this only avoids showing a button that 403s) -->
      <section v-if="isAdmin" class="card p-5 n-enter" style="--i: 5">
         <h3 class="n-h mb-1.5">Sozlamalar</h3>
         <p class="text-[13.5px] text-[color:var(--n-muted)] leading-snug mb-5">
            Bir xil so'rov qayta kelganda: xodim uchun oyna tugagach, yangi so'rov;
            ellikboshi uchun 0 = hech qachon tugamaydi (doim hal qilinmagan deb sanaladi).
         </p>
         <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
         <div class="flex flex-wrap gap-3 items-center justify-between mt-5 pt-4"
            style="border-top: 1px solid var(--n-line-soft)">
            <button @click="s.form.is_enabled = !s.form.is_enabled"
               class="flex items-center gap-2 text-[15px] font-semibold transition-colors"
               :class="s.form.is_enabled ? '' : 'text-[color:var(--n-faint)]'">
               <font-awesome-icon :icon="s.form.is_enabled ? 'toggle-on' : 'toggle-off'" class="w-6 h-6" />
               {{ s.form.is_enabled ? 'Nazorat yoqilgan' : 'Nazorat o\'chirilgan' }}
            </button>
            <div class="flex items-center gap-3">
               <span v-if="s.savedMsg" class="text-[13.5px] text-[color:var(--n-muted)]">{{ s.savedMsg }}</span>
               <button @click="s.save()" :disabled="s.saving" class="btn-primary">
                  {{ s.saving ? 'Saqlanmoqda...' : 'Saqlash' }}
               </button>
            </div>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useNazoratStore } from '../../stores/nazorat'
import { useAuthStore } from '../../../../stores/auth'
import { useNazoratView } from './shared'

const s = useNazoratStore()
const auth = useAuthStore()
const router = useRouter()

/** Open the Jurnal on one outcome. Carried in the URL rather than in a store, the same
 *  rule the panel's tabs follow: the phone's back gesture then undoes the filter, and a
 *  filtered feed can be sent to somebody.
 *
 *  On a desktop the four screens are one scroll rather than tabs, so navigating there
 *  changes which slice the Jurnal section shows but not what is on screen. Hence the
 *  scroll: without it the tap looks like it did nothing. */
async function openJurnal(key: string) {
   await router.push({ path: '/ai/nazorat/jurnal', query: { holat: key } })
   if (window.matchMedia('(min-width: 1024px)').matches) {
      await nextTick()
      document.getElementById('nazorat-jurnal')
         ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
   }
}
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

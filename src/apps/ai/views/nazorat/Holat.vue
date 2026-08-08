<template>
   <div class="space-y-3">
      <!-- «Diqqat talab qiladi» is no longer here. It led the page, which put five
           notices between the reader and every other number on every visit, including
           the days when nothing was wrong. It now lives behind the bell in the title
           bar, which carries the count. See Ogohlantirishlar.vue. -->

      <!-- ──────────────── 1. THE VERDICT ────────────────
           The donut and the legend that explains it, in one card, with the total they are
           both drawn from held in the ring's centre. The hint under every line is the
           owner's wording, kept verbatim (2026-07-31).

           A ring rather than the old stacked bar (owner, 2026-08-06). Four shares of one
           whole is what a donut is for, and the hole gives the denominator a home — so
           the card no longer has to open by spelling out «Jami N ta kartochka» in prose
           above a bar whose total was stated nowhere on it.

           The «Murojaatlar» headline used to lead this page and is gone (owner,
           2026-08-07). It was the period's total, which is what the ring's hole now
           holds — and it carried the only card-unit number on the screen, «N ta
           kartochka yetib bordi», which the office does not read the panel for. The
           fan-out is still on every jurnal card that has one («5 ta xodimga bordi»),
           where it explains that one complaint rather than colouring the whole day. -->
      <section class="card p-5 n-enter" style="--i: 1">
         <!-- No subtitle. The owner reads this panel every day and does not need the
              screen explained to them each time (2026-08-07); the four category lines
              below are the only prose kept, because they define what the colours MEAN
              and that is not deducible from a label. -->
         <h3 class="n-h">{{ personWord }} javoblari</h3>

         <!-- Every slice opens the same filtered Jurnal its legend row does, so the tap
              lands wherever the eye happened to stop. The slices are aria-hidden and the
              ring carries one description instead: each one already has a real <button>
              in the legend below, and a screen reader offered both would read the same
              destinations twice. -->
         <div class="n-donut-wrap mt-5 mb-1">
            <svg class="n-donut" viewBox="0 0 120 120" role="img" :aria-label="donutLabel">
               <g class="n-donut-rot">
                  <g transform="rotate(-90 60 60)">
                     <circle class="n-donut-track" cx="60" cy="60" :r="R" />
                     <circle v-for="sg in donutSegments" :key="sg.key" class="n-donut-seg"
                        cx="60" cy="60" :r="R" :stroke="sg.color"
                        :stroke-dasharray="sg.dash" :stroke-dashoffset="sg.offset"
                        aria-hidden="true" @click="openJurnal(sg.key)">
                        <title>{{ sg.label }}: {{ sg.value }} ({{ sg.pctLabel }})</title>
                     </circle>
                  </g>
               </g>
            </svg>
            <div class="n-donut-mid">
               <p class="text-[34px] font-bold tabular-nums leading-none tracking-[-0.04em]"
                  :class="bucketTotal ? '' : 'text-[color:var(--n-faint)]'">
                  {{ bucketTotal }}
               </p>
               <p class="text-[12.5px] text-[color:var(--n-muted)] mt-1.5">murojaat</p>
            </div>
         </div>

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
                  <!-- Takroriy, as the SUBSET it is. It used to be a fourth slice, which
                       counted one repeat twice — amber on the ask that proved the failure
                       and red on the ask that caused it — and put the person who picked
                       the complaint up and fixed it outside «Bajarildi». -->
                  <p v-if="b.key === 'completed' && takroriy"
                     class="text-[13.5px] text-[color:var(--n-faint)] leading-snug mt-1">
                     shundan {{ takroriy }} tasi — ziyoratchi oldin ham so'ragan edi
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

         <!-- The 🟡/🔴 pairing note that sat here is gone with the other prose. What
              stays is this: not a description but a COUNT, and the one number that would
              otherwise be missing from the screen entirely. Without it the ring reads as
              the whole period while the Jurnal's «Hammasi» quietly says something else —
              which is the exact defect this screen was fixed for. It renders only when
              there is a remainder, so on an ordinary day the card ends at the legend. -->
         <p v-if="ungraded"
            class="mt-3 pt-3 text-[12.5px] text-[color:var(--n-faint)] leading-snug"
            style="border-top: 1px solid var(--n-line-soft)">
            Yana {{ ungraded }} ta murojaat bu yerda baholanmaydi
            («Xatolik» yoki yetib bormagan) — Jurnalda ko'rinadi.
         </p>
      </section>

      <!-- ──────────────── 2. HOW LONG THE PILGRIM WAITED ────────────────
           A COLUMN CHART: a value axis, a baseline, one column per person (owner,
           2026-08-08, pointing at «Murojaatlar dinamikasi» as the shape). It was a row of
           horizontal bars sorted worst-first, which read as a leaderboard rather than as
           a chart — and worse, ranked an average: one leader with a single 5 soat answer
           stood above one who had answered twelve times.

           So the columns are ordered by HOW MANY answers each average is built from, not
           by the average. The best-evidenced person leads and the thinnest sits last,
           where a tall column reads as "we barely know yet" instead of "the worst". Those
           columns are drawn hollow and the footnote says why. Nothing is hidden: the
           number is real, it is its weight that differs.

           One scale across both groups — two charts each scaled to their own worst would
           draw a leader and a xodim the same height while meaning different things. -->
      <section v-if="responseChart.groups.length" class="card p-5 n-enter" style="--i: 2">
         <h3 class="n-h">O'rtacha javob vaqti</h3>

         <p class="text-[42px] font-bold tracking-[-0.045em] tabular-nums leading-[0.95] mt-3"
            :class="s.report && s.report.avg_response_seconds !== null ? '' : 'text-[color:var(--n-faint)]'">
            {{ dur(s.report ? s.report.avg_response_seconds : null) }}
         </p>

         <div v-for="(g, gi) in responseChart.groups" :key="g.key"
            :class="gi ? 'mt-6 pt-4' : 'mt-5'"
            :style="gi ? 'border-top: 1px solid var(--n-line-soft)' : ''">
            <p class="n-tile-label mb-3">{{ g.title }}</p>

            <div class="n-chart">
               <div class="n-chart-plot">
                  <!-- The axis. Gridlines are hairlines and solid: dashing a rule adds
                       noise to the one part of a chart that must stay behind the data. -->
                  <div class="n-chart-axis">
                     <div v-for="t in responseChart.ticks" :key="t.at" class="n-chart-tick"
                        :style="{ bottom: t.at + '%' }">
                        <span>{{ t.label }}</span><i></i>
                     </div>
                  </div>

                  <!-- One column each. Tapping opens that person, the same rule every
                       number about somebody on this panel follows. -->
                  <div class="n-chart-cols">
                     <button v-for="c in g.cols" :key="c.telegram_id" type="button"
                        class="n-chart-col"
                        :title="`${c.name} · ${c.label} · ${c.answered} ta javob`"
                        @click="openPerson(c.telegram_id)">
                        <span class="n-chart-val">{{ c.compact }}</span>
                        <span class="n-chart-bar"
                           :class="[c.thin ? 'is-thin' : '', c.over ? 'is-over' : '']"
                           :style="{ height: c.height + '%' }"></span>
                     </button>
                  </div>
               </div>

               <!-- The axis labels, in their OWN row so they cannot eat the plot's height
                    or be clipped by it. Same gap and flex basis, so they stay in step. -->
               <div class="n-chart-names">
                  <span v-for="c in g.cols" :key="c.telegram_id" class="n-chart-name">
                     {{ c.short }}
                     <b class="n-chart-n">{{ c.answered }} ta</b>
                  </span>
               </div>
            </div>
         </div>

         <p v-if="responseChart.hasThin"
            class="mt-4 pt-3 text-[12.5px] text-[color:var(--n-faint)] leading-snug"
            style="border-top: 1px solid var(--n-line-soft)">
            Ochiq ustunlar — {{ MIN_SAMPLE }} tadan kam javob. O'rtacha hali aniq emas.
         </p>
      </section>

      <!-- ──────────────── 3. THE PERIOD'S OTHER TWO FACTS ────────────────
           Tiles rather than a divided strip. Same numbers, same wording: «O'rtacha javob
           vaqti» is the owner's phrase and a tile lets it WRAP instead of being clipped
           to «O'rtacha jav…», which was the old row's only way of fitting it. -->
      <section v-if="contextStats.length" class="grid gap-3"
         :class="contextStats.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
         <div v-for="(c, i) in contextStats" :key="c.key" class="n-tile n-enter"
            :style="{ '--i': 3 + i }">
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
         <!-- The paragraph explaining the two windows is gone with the other prose. What
              it actually had to say is in the field labels, where it belongs: the unit
              (soat) and the one non-obvious value (0 = cheksiz). -->
         <h3 class="n-h mb-5">Sozlamalar</h3>
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
import { MIN_SAMPLE, PIE_R as R, dur, ringDashes, useNazoratView } from './shared'

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
/** A person's own screen — where their response time, and everything else about them,
 *  is evidence rather than a single figure. */
function openPerson(id: number) {
   router.push(`/ai/nazorat/xodim/${id}`)
}

const {
   personWord, bucketRows, bucketTotal, bucketSegments,
   contextStats, errorKinds, responseChart,
} = useNazoratView()

/** ── The composition donut ────────────────────────────────────────────────────
 *  One ring, drawn as dashes on one circle rather than as arc paths: a dash is a length
 *  along the circumference, which is exactly what a share of a whole is, so there is no
 *  arc-sweep arithmetic to get wrong at the 100% and 0% ends.
 *
 *  The arithmetic itself lives in shared.ts now that Reyting draws rings too — two
 *  copies of it would drift, and a gap rule that differed by a unit between screens is
 *  the kind of thing nobody notices and everybody feels. */
const donutSegments = computed(() => {
   const segs = bucketSegments.value
   const geo = ringDashes(segs.map((sg) => sg.pct), R)
   return segs.map((sg, i) => ({
      key: sg.key, label: sg.label, color: sg.color, value: sg.value,
      pctLabel: sg.pctLabel, ...geo[i],
   }))
})

/** The ring's single description, in the order the slices are drawn. */
const donutLabel = computed(() => {
   if (!bucketTotal.value) return 'Murojaat yo\'q'
   const parts = bucketSegments.value.map((sg) => `${sg.label} ${sg.value} (${sg.pctLabel})`)
   return `Jami ${bucketTotal.value} ta murojaat: ${parts.join(', ')}`
})

/** The needs the ring cannot grade: ruled «Xatolik» (a verdict on the BOT, deliberately
 *  outside the four-colour vocabulary) or never delivered to anyone they were sent to.
 *
 *  The ring's hole holds what the slices SUM TO, which is the only number a donut's
 *  centre can honestly hold. Since it is now the period's only total on this screen,
 *  anything it leaves out has to be said out loud — otherwise the ring reads as the
 *  whole day and the Jurnal's «Hammasi» quietly disagrees with it, which is the very
 *  defect this screen was just fixed for. */
const ungraded = computed(() =>
   Math.max(0, (s.report?.requests || 0) - bucketTotal.value))

/** How many of the completions were needs the pilgrim had already raised once. A subset
 *  of Bajarildi, never a bucket beside it — adding it to the ring would count one
 *  complaint twice. */
const takroriy = computed(() => s.report?.re_requests || 0)


// Only the admin may tune the control system (the API enforces it; this hides the form).
const isAdmin = computed(() => !auth.role || auth.role === 'admin')
</script>

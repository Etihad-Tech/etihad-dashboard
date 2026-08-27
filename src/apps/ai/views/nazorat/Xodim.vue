<template>
   <div class="space-y-3">
      <div v-if="!worker" class="card py-16 text-center text-[15px] text-[color:var(--n-muted)]">
         Bu davrda bu {{ personWordLower }} bo'yicha ma'lumot yo'q
      </div>

      <template v-else>
         <!-- The numbers that used to sit in the wide table's row. Here they are a grid
              a thumb can read, instead of seven columns behind a sideways scroll. -->
         <section class="card p-5 n-enter" style="--i: 0">
            <div class="flex items-center gap-3.5 min-w-0">
               <span class="n-avatar" :class="isLeaderLevel(worker) ? 'n-avatar-leader' : ''">
                  {{ initials(personLabel(worker)) }}
               </span>
               <div class="min-w-0 flex-1">
                  <!-- The name WRAPS rather than truncates, the same rule the ranking
                       rows follow: «Nurmuhammad Rahim…» is the screen hiding the one
                       thing it is about. -->
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                     <h2 class="text-[20px] font-bold tracking-[-0.025em] leading-tight">
                        {{ personLabel(worker) }}
                     </h2>
                     <span class="badge shrink-0"
                        :class="isLeaderLevel(worker) ? 'badge-indigo' : 'badge-amber'">
                        {{ jobLabel(worker) }}
                     </span>
                  </div>
                  <p class="text-[13.5px] text-[color:var(--n-muted)] mt-1">
                     <span v-if="worker.name && worker.username">{{ worker.username }} · </span>
                     {{ whereLabel(worker) }}
                  </p>
               </div>
            </div>

            <div v-if="worker.dms" class="n-split h-3 mt-4" :title="rowSplitHint(worker)">
               <span v-for="sg in rowSegments(worker)" :key="sg.key"
                  :style="{ width: sg.pct + '%', background: sg.color }"></span>
            </div>

            <!-- Sunken rather than raised: these sit INSIDE a card, and a second layer of
                 white-on-white with its own shadow reads as a stack of loose paper. -->
            <div class="grid grid-cols-3 gap-2 mt-4">
               <div v-for="t in headTiles" :key="t.label" class="card-inset p-3">
                  <p class="n-tile-label">{{ t.label }}</p>
                  <p class="text-[20px] font-bold tracking-[-0.03em] tabular-nums leading-tight mt-1">
                     {{ t.value }}
                  </p>
               </div>
            </div>

            <!-- The four outcomes on one row, in the panel's own order and colours, so
                 this block and a ranking row read as the same thing. -->
            <div class="grid grid-cols-4 gap-x-2 mt-4 pt-4" style="border-top: 1px solid var(--n-line-soft)">
               <div v-for="b in BUCKETS" :key="b.key" class="min-w-0">
                  <p class="text-[12px] text-[color:var(--n-muted)] flex items-center gap-1.5 truncate">
                     <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: b.color }"></span>
                     {{ b.short }}
                  </p>
                  <p class="text-[22px] font-bold tabular-nums tracking-[-0.03em] leading-tight mt-1"
                     :class="(worker as any)[b.key] ? '' : 'text-[color:var(--n-faint)]'">
                     {{ (worker as any)[b.key] }}
                  </p>
               </div>
            </div>

            <!-- The cards that left this person's accountability. Spelled out rather than
                 summed under a heading: "boshqa xodim oldi" is a fact anyone can act on. -->
            <p v-if="uncounted(worker)"
               class="text-[13.5px] text-[color:var(--n-muted)] mt-4 pt-4"
               style="border-top: 1px solid var(--n-line-soft)">
               <span v-if="worker.released">Boshqa {{ personWordLower }} oldi: {{ worker.released }}</span>
               <span v-if="worker.undelivered"> · Yetib bormadi: {{ worker.undelivered }}</span>
               <span v-if="worker.flagged"> · «Xatolik» deb belgilandi: {{ worker.flagged }}</span>
            </p>
         </section>

         <!-- WHY the money is what it is. This screen used to repeat the journal,
              which the Jurnal tab already shows per person; what it could not answer
              was «where did this number come from», and that is the question somebody
              opens a person's page with when they are about to be paid.
              Every row says three things: what it is, how it was worked out, and why
              the rule exists. A payslip a leader cannot argue with is a payslip the
              office has to argue about. -->
         <template v-if="worker.role === 'ellikboshi'">
            <h3 class="n-group-h pt-2 pb-1">Hisob-kitob</h3>

            <div v-if="!worker.salary"
               class="card py-10 text-center text-[15px] text-[color:var(--n-muted)]">
               Toifa tanlanmagan — oylik hisoblanmaydi
            </div>

            <template v-else>
               <!-- 1. The two lines the payslip actually has. -->
               <section class="card p-5 n-enter" style="--i: 1">
                  <div class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 tabular-nums">
                     <span class="text-[color:var(--n-muted)]">
                        Fiks
                        <span class="block text-[12.5px]">{{ worker.fiks_info?.unvon }}</span>
                     </span>
                     <span class="text-right">{{ soum(worker.salary.fiks) }}</span>
                     <span class="text-[color:var(--n-muted)]">KPI</span>
                     <span v-if="worker.salary.pending_manual"
                        class="text-right text-[color:var(--n-muted)]">qo'lda baholanadi</span>
                     <span v-else class="text-right font-semibold" :class="kpiTone">
                        {{ signed(worker.salary.kpi as number) }}
                     </span>
                     <span class="font-semibold pt-2" style="border-top: 1px solid var(--n-line-soft)">
                        Yakuniy oylik
                     </span>
                     <b class="text-right pt-2" style="border-top: 1px solid var(--n-line-soft)">
                        {{ soum(worker.salary.total) }} so'm
                     </b>
                  </div>
               </section>

               <!-- 2. WHERE THE BALL CAME FROM. The share of the fund is decided by this
                       number, so the number itself has to be openable. -->
               <section v-if="worker.kpi" class="card p-5 n-enter" style="--i: 2">
                  <div class="flex items-baseline gap-2.5">
                     <h3 class="n-h">Sifat reytingi</h3>
                     <span class="ml-auto text-[19px] font-bold tabular-nums">
                        {{ worker.kpi.combined ?? worker.kpi.total }}
                     </span>
                  </div>
                  <div class="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 text-[13.5px] tabular-nums">
                     <span>Bajarilgani</span>
                     <span class="text-[color:var(--n-muted)]">{{ worker.kpi.bajarilish_pct }}%</span>
                     <span class="font-semibold text-right">{{ worker.kpi.bajarilish_ball }}/40</span>
                     <span>Javob berilgani</span>
                     <span class="text-[color:var(--n-muted)]">{{ pct100(worker.kpi.javobsiz_pct) }}%</span>
                     <span class="font-semibold text-right">{{ worker.kpi.javobsiz_ball }}/25</span>
                     <span>Takrorlanmagani</span>
                     <span class="text-[color:var(--n-muted)]">{{ pct100(worker.kpi.takroriy_pct) }}%</span>
                     <span class="font-semibold text-right">{{ worker.kpi.takroriy_ball }}/15</span>
                     <span>Javob tezligi</span>
                     <span class="text-[color:var(--n-muted)]">
                        {{ worker.kpi.vaqt_measured ? dur(worker.day_avg_response_seconds) : '—' }}
                     </span>
                     <span class="font-semibold text-right">
                        {{ worker.kpi.vaqt_measured ? worker.kpi.vaqt_ball + '/20' : '—' }}
                     </span>
                     <template v-if="worker.kpi.survey_ball !== null && worker.kpi.survey_ball !== undefined">
                        <span class="pt-1.5" style="border-top: 1px solid var(--n-line-soft)">
                           Kartochkalar bo'yicha
                        </span>
                        <span class="text-[color:var(--n-muted)] pt-1.5"
                           style="border-top: 1px solid var(--n-line-soft)">yarmi</span>
                        <span class="font-semibold text-right pt-1.5"
                           style="border-top: 1px solid var(--n-line-soft)">{{ worker.kpi.total }}</span>
                        <span>Ziyoratchilar bahosi</span>
                        <span class="text-[color:var(--n-muted)]">yarmi</span>
                        <span class="font-semibold text-right">{{ worker.kpi.survey_ball }}</span>
                     </template>
                  </div>
                  <p class="mt-3 text-[12.5px] text-[color:var(--n-muted)]">
                     <template v-if="worker.kpi.survey_ball === null || worker.kpi.survey_ball === undefined">
                        So'rovnoma bu oyda hisobga kirmadi — ball faqat kartochkalardan.
                        Guruh ziyoratchilarining yarmidan kamiga qo'ng'iroq qilingan
                        bo'lsa, so'rovnoma sanalmaydi.
                     </template>
                     <template v-else>
                        Ball ikki manbadan: kartochkalar va ziyoratchilar so'rovnomasi,
                        har biri yarmi.
                     </template>
                  </p>
               </section>

               <!-- 3. EVERY TERM OF THE KPI LINE, with the rule beside it. -->
               <section v-if="!worker.salary.pending_manual" class="card p-5 n-enter" style="--i: 3">
                  <h3 class="n-h">KPI qatori</h3>
                  <div class="mt-3 space-y-3">
                     <div v-for="row in payRows" :key="row.label">
                        <div class="flex items-baseline gap-3 tabular-nums">
                           <span class="font-semibold">{{ row.label }}</span>
                           <span class="ml-auto text-right font-semibold"
                              :class="row.negative ? 'text-[#dc2626] dark:text-[#f87171]' : ''">
                              {{ row.amount }}
                           </span>
                        </div>
                        <p class="text-[12.5px] text-[color:var(--n-muted)] tabular-nums">
                           {{ row.how }}
                        </p>
                        <p class="text-[12.5px] text-[color:var(--n-faint)]">{{ row.why }}</p>
                     </div>
                     <div class="flex items-baseline gap-3 pt-2 tabular-nums"
                        style="border-top: 1px solid var(--n-line)">
                        <span class="font-semibold">KPI</span>
                        <b class="ml-auto text-right" :class="kpiTone">
                           {{ signed(worker.salary.kpi as number) }}
                        </b>
                     </div>
                     <p v-if="worker.salary.floored" class="text-[12.5px] text-[color:var(--n-muted)]">
                        Ushlab qolish chegarasi qo'llandi —
                        {{ soum(-worker.salary.floor) }} so'mdan ortig'i ushlab
                        qolinmadi.
                     </p>
                  </div>
               </section>
            </template>
         </template>

      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNazoratStore } from '../../stores/nazorat'
import {
   BUCKETS, dur, initials, isLeaderLevel, jobLabel,
   personLabel, rowSegments, rowSplitHint, uncounted, whereLabel, useNazoratView,
} from './shared'

const s = useNazoratStore()
const route = useRoute()
const { personWordLower } = useNazoratView()

const telegramId = computed(() => Number(route.params.id))
const worker = computed(() => s.workers.find((w) => w.telegram_id === telegramId.value) || null)

const soum = (v: number) => v.toLocaleString('ru-RU')
const dec = (v: number) => v.toFixed(v % 1 === 0 ? 1 : 2).replace('.', ',')
const pct100 = (fault: number) => Math.round((100 - fault) * 10) / 10

function signed(v: number): string {
   if (!v) return '0'
   return `${v < 0 ? '\u2212' : '+'} ${soum(Math.abs(v))}`
}

const kpiTone = computed(() => {
   const k = worker.value?.salary?.kpi
   if (!k) return ''
   return k < 0 ? 'text-[#dc2626] dark:text-[#f87171]' : 'text-[#059669] dark:text-[#34d399]'
})

/** Every term of the KPI line: what it is, HOW it was worked out, and WHY the rule
 *  exists. The «why» is the part a payslip normally leaves out and the part an appeal
 *  is actually about — a leader who can read the rule can check the number, and one
 *  who cannot has to take somebody's word for their salary.
 *
 *  Unit prices come from the server (`kpiSettings.fines`): a second copy in the panel
 *  is how a screen ends up explaining a fine the server no longer charges. */
const payRows = computed(() => {
   const w = worker.value
   const sal = w?.salary
   if (!w || !sal) return []
   const f = s.kpiSettings?.fines
   const rows: { label: string; how: string; why: string; amount: string
                 negative?: boolean }[] = []

   const ball = w.kpi ? (w.kpi.combined ?? w.kpi.total) : null
   rows.push({
      label: 'Ball mukofoti',
      how: sal.mukofot_base
         ? `${soum(sal.mukofot_base)} × ${dec(sal.k)} = ${soum(sal.earned)}`
         : `${ball ?? '—'} ball — pog'ona ochilmadi`,
      why: "Ball pog'onaga yetsa, o'sha pog'ona summasi beriladi va oylik yuklamaga "
         + "ko'paytiriladi. Yetmasa — mukofot yo'q.",
      amount: soum(sal.earned),
   })

   if (sal.k_sg !== null && sal.sg !== null && sal.k_sg !== sal.sg) {
      rows.push({
         label: 'Nega ko\u2019paytiruvchi to\u2019liq emas',
         how: `Yuklama ${dec(sal.sg)} guruh, shundan ${dec(sal.k_sg)} tasi «Natija bo'yicha»`,
         why: "Ko'paytiruvchi faqat rag'bat uchun berilgan guruhlarga tegishli. "
            + "Majburiy va tashkiliy biriktirish hajm uchun to'lanadi.",
         amount: '',
      })
   }

   if (sal.yuklama) {
      rows.push({
         label: "Ortiqcha guruh uchun",
         how: `${dec(sal.sg ?? 0)} − 1 = ${dec((sal.sg ?? 0) - 1)} guruh `
            + `× ${soum(s.kpiSettings?.load_rate ?? 0)}`,
         why: "Bitta guruhdan ortiq olib borilgan har bir guruh uchun. Ball qanday "
            + "bo'lishidan qat'i nazar beriladi — soatlar ishlangan.",
         amount: soum(sal.yuklama),
      })
   }

   if (sal.sovrin) {
      rows.push({
         label: 'Sovrin · Oyning ellikboshisi',
         how: soum(sal.sovrin),
         why: "Oyning eng yuqori reytingi uchun. Ushlab qolish chegarasidan tashqarida "
            + "to'lanadi — jarimalar yeya oladigan sovrin sovrin bo'lmasdi.",
         amount: soum(sal.sovrin),
      })
   }
   if (sal.day_javobsiz && f) {
      rows.push({
         label: 'Kunduzgi javobsiz',
         how: `${sal.day_javobsiz} × ${soum(f.day_javobsiz)}`,
         why: 'Kunduzi kelgan kartochka yetkazildi, lekin «Qabul qilish» bosilmadi. '
            + 'Tungi javobsizlik jarimaga tortilmaydi.',
         amount: soum(sal.day_javobsiz * f.day_javobsiz), negative: true,
      })
   }
   if (sal.sla_breaches && f) {
      rows.push({
         label: 'Kechikib qabul qilish',
         how: `${sal.sla_breaches} × ${soum(f.sla_breach)}`,
         why: 'Qabul qilish normatividan 2 barobar kech bosilgan kartochkalar '
            + '(kunduzi 30 daqiqa, tunda 90).',
         amount: soum(sal.sla_breaches * f.sla_breach), negative: true,
      })
   }
   if (sal.bot_block && f) {
      rows.push({
         label: 'Bot bloklangan',
         how: soum(f.bot_block),
         why: 'Bot bloklangani yoki akkaunt yaroqsizligi sababli kartochka yetib '
            + "bormadi. Necha kartochka bo'lishidan qat'i nazar — bitta hodisa.",
         amount: soum(f.bot_block), negative: true,
      })
   }
   if (sal.false_completions && f) {
      rows.push({
         label: "Soxta «bajarildi»",
         how: `${sal.false_completions} × ${soum(f.false_completion)}`,
         why: "So'rovnoma tasdiqladi: kartochka «Bajarildi» deb yopilgan, lekin muammo "
            + 'hal bo\'lmagan. Faqat Sifat nazorati tasdiqlagan kartochkalar bo\'yicha.',
         amount: soum(sal.false_completions * f.false_completion), negative: true,
      })
   }
   if (sal.xatolik_abuse && f) {
      rows.push({
         label: "«Xatolik» suiiste'moli",
         how: soum(f.xatolik_abuse),
         why: "Ketma-ket uchta neytral IT xulosasi — tugma himoya uchun emas, "
            + 'bazadan chiqish uchun ishlatilgan.',
         amount: soum(f.xatolik_abuse), negative: true,
      })
   }
   if (sal.manual_adjust) {
      rows.push({
         label: "Qo'lda tuzatish",
         how: signed(sal.manual_adjust),
         why: 'Ofis tomonidan kiritilgan tuzatish. Sababi jurnalda qoladi.',
         amount: signed(sal.manual_adjust), negative: sal.manual_adjust < 0,
      })
   }
   return rows
})

/** The three headline figures as tiles — same numbers, same order as before. */
const headTiles = computed(() => {
   const w = worker.value
   if (!w) return []
   return [
      // «Kartochka», not «Murojaat»: this is w.dms — the cards sent to THIS person, which
      // is the right unit on a person's own sheet (they answer for what they were sent,
      // not for a share of a complaint) but the wrong word for it. The overview counts
      // complaints; calling both «Murojaat» is what made the two disagree on screen.
      { label: 'Kartochka', value: String(w.dms) },
      { label: 'Qabul', value: String(w.accepted) },
      { label: "O'rtacha javob", value: dur(w.avg_response_seconds) },
   ]
})

onMounted(() => { void s.loadKpiSettings() })
</script>

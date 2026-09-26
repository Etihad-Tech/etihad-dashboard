<template>
   <div class="space-y-3">
      <!-- Every number the pay model reads, in one place and nowhere else. They were
           panels hanging off the KPI board, which put settings on a screen people open
           to READ a month — and a fund field beside somebody's payslip invites editing
           the scheme while looking at one person it affects. -->
      <p class="px-1 text-[12.5px] text-[color:var(--n-muted)]">
         Bu yerdagi har bir son oylikka ta'sir qiladi. O'zgartirish darhol kuchga
         kiradi — hali yopilmagan oyning hisobi qaytadan sanaladi.
      </p>

      <section v-for="grp in GROUPS" :key="grp.title" class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">{{ grp.title }}</h3>
         </div>
         <div class="mt-3 space-y-0.5">
            <div v-for="f in grp.rows" :key="f.key"
               class="flex items-center gap-3 py-2.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">
               <span class="flex-1 min-w-0">
                  <span class="block text-[14px] font-semibold">{{ f.label }}</span>
                  <span class="block text-[12px] text-[color:var(--n-muted)]">{{ f.hint }}</span>
               </span>
               <input v-if="f.kind === 'time'" type="time" step="60"
                  class="w-32 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums text-right"
                  :value="value(f)" @change="save(f, $event)" />
               <input v-else type="number" :min="f.min" :max="f.max" :step="f.step"
                  class="w-32 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums text-right"
                  :value="value(f)" @change="save(f, $event)" />
               <span class="w-8 text-[12.5px] text-[color:var(--n-muted)]">{{ f.unit }}</span>
            </div>
         </div>
         <p v-if="grp.note" class="mt-2 text-[12.5px] text-[color:var(--n-muted)]">
            {{ grp.note }}
         </p>
         <p v-if="grp.clock" class="mt-1 text-[12.5px] text-[color:var(--n-muted)]">
            Hozir Makka va Madinada: <b class="tabular-nums">{{ makkaNow }}</b>
         </p>
      </section>

      <!-- The pay scale, last: it is a list of people's money rather than a coefficient,
           and it moves everyone on a rung at once. -->
      <section v-if="s.categories.length" class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">Toifalar va asosiy oylik</h3>
         </div>
         <div class="mt-3 space-y-0.5">
            <div v-for="c in s.categories" :key="c.code"
               class="flex items-center gap-3 py-2.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">
               <span class="flex-1 min-w-0">
                  <span class="block text-[14px] font-semibold truncate">{{ c.title }}</span>
                  <span class="block text-[12px] text-[color:var(--n-muted)]">
                     {{ countIn(c.code) }} ta ellikboshi
                  </span>
               </span>
               <input type="number" min="0" step="100000"
                  class="w-36 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums text-right"
                  :value="c.fiks" @change="saveFiks(c.code, $event)" />
               <span class="text-[12.5px] text-[color:var(--n-muted)]">so'm</span>
            </div>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useNazoratStore, type KpiSettings } from '../../stores/nazorat'
import { useToast } from '../../../../composables/useToast'
import { MAKKA_TZ, clockText } from './shared'

const s = useNazoratStore()
const toast = useToast()

/** The Makka wall clock, live — so whoever moves a boundary can see which side of it
 *  «now» falls on without converting from Tashkent in their head. */
const makkaNow = ref('')
function tick() {
   makkaNow.value = new Date().toLocaleTimeString('uz-UZ', {
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: MAKKA_TZ,
   })
}
let clockTimer: number | undefined

onMounted(() => {
   void s.loadCategories(); void s.loadKpiSettings()
   tick()
   clockTimer = window.setInterval(tick, 20_000)
})
onUnmounted(() => window.clearInterval(clockTimer))

/** Only the EDITABLE numeric settings. `fines` rides on the same object but is
 *  read-only — §11 names each sum in its own table, so moving one is a document
 *  change, not an office adjustment — and excluding it here means the page cannot
 *  render a field for something it must not write. */
type EditableKey = {
   [K in keyof KpiSettings]: KpiSettings[K] extends number ? K : never
}[keyof KpiSettings]

type Row = {
   key: EditableKey; label: string; hint: string; unit: string
   min: number; max: number; step: number; scale: number
   /** A wall-clock time: minutes after midnight on the server, «HH:MM» on screen. */
   kind?: 'time'
}

/** Grouped the way the arithmetic reads, not the way the columns happen to sit in the
 *  table: what the fund pays, what the load pays, what a group weighs. A flat list of
 *  ten numbers is a list nobody can check against the reglament. */
const GROUPS: { title: string; rows: Row[]; note?: string; clock?: boolean }[] = [
   {
      title: 'Sifat mukofoti',
      rows: [
         { key: 'bonus_base_ball', label: 'Mukofot shu balldan boshlanadi', unit: 'ball',
           hint: 'Bundan past ball olgan mukofot olmaydi',
           min: 0, max: 100, step: 1, scale: 1 },
         { key: 'bonus_base_sum', label: 'Mukofot summasi', unit: "so'm",
           hint: '90–94 ball olgan ellikboshiga shuncha to‘lanadi',
           min: 0, max: 1_000_000_000, step: 100_000, scale: 1 },
         { key: 'bonus_high_ball', label: 'Katta mukofot shu balldan boshlanadi', unit: 'ball',
           hint: 'Yuqori ball uchun ikkinchi pog‘ona',
           min: 0, max: 100, step: 1, scale: 1 },
         { key: 'bonus_high_sum', label: 'Katta mukofot summasi', unit: "so'm",
           hint: '95–100 ball olgan ellikboshiga shuncha to‘lanadi',
           min: 0, max: 1_000_000_000, step: 100_000, scale: 1 },
         { key: 'sovrin_sum', label: '«Oyning ellikboshisi» sovrini', unit: "so'm",
           hint: 'Oyda eng yuqori ball olgan BITTA ellikboshiga',
           min: 0, max: 1_000_000_000, step: 100_000, scale: 1 },
         { key: 'max_deduction_pct', label: 'Jarima chegarasi', unit: '%',
           hint: 'Jarimalar fiksning shu qismidan ko‘p ushlay olmaydi',
           min: 0, max: 100, step: 5, scale: 1 },
      ],
      note: 'Ball 100 dan hisoblanadi. 89 ball — mukofot yo‘q, 90 ball — to‘liq '
          + 'summa; oraliq summa yo‘q.',
   },
   {
      // §10 (owner, 25.09.2026): «сделать день и ночь динамичным … по времени Мекки и
      // Мадины, а не по ташкентскому». Both are Makka wall-clock times; the server reads
      // them on UTC+3 whatever clock this browser is set to.
      title: 'Kunduz va tun (Makka vaqti)',
      rows: [
         { key: 'day_start_min', kind: 'time', label: 'Kunduz boshlanadi', unit: '',
           hint: 'Kunduzi: normativ 15 daqiqa, 30 daqiqadan kech qabul — jarima. '
               + 'Javobsiz kartochka ham jarimaga tortiladi',
           min: 0, max: 1439, step: 1, scale: 1 },
         { key: 'night_start_min', kind: 'time', label: 'Tun boshlanadi', unit: '',
           hint: 'Tunda: normativ 45 daqiqa, 90 daqiqadan kech qabul — jarima. '
               + 'Javobsiz kartochka jarimaga tortilmaydi',
           min: 0, max: 1439, step: 1, scale: 1 },
      ],
      note: 'Makka va Madina vaqti Toshkentdan 2 soat orqada: Toshkentda 08:00 bo‘lsa, '
          + 'Makkada 06:00. Kartochka kunduzgi yoki tungi ekanini ziyoratchi yozgan vaqt '
          + 'belgilaydi.',
      clock: true,
   },
   {
      // THE LIMIT RULE (owner, 18.09.2026): groups up to the limit are the ordinary
      // job — whole groups, no daraja, no city weight, no extra pay. Only the groups
      // beyond it are weighted, paid per group and multiplied by the coefficient.
      // The names say what each number IS, in the office's own words (owner: «сами
      // названия чтобы были понятными»); the hint says what it DOES.
      title: 'Ortiqcha guruhlar uchun to‘lov',
      rows: [
         { key: 'load_free_units', label: 'Oyiga oddiy guruhlar soni',
           unit: 'guruh',
           hint: 'Shu songacha guruh — oddiy ish, qo‘shimcha to‘lov yo‘q. Har bir guruh butun sanaladi',
           min: 1, max: 10, step: 1, scale: 100 },
         { key: 'load_rate', label: 'Har bir ortiqcha guruh uchun to‘lov',
           unit: "so'm",
           hint: 'Chegaradan oshgan har bir butun guruh uchun (yarim guruh — yarmi)',
           min: 0, max: 100_000_000, step: 100_000, scale: 1 },
         { key: 'k_max_units', label: 'Ortiqcha guruh koeffitsienti',
           unit: 'marta',
           hint: 'Ortiqcha guruh to‘lovi shunga ko‘paytiriladi. 1 = ko‘paymaydi. Mukofotga tegmaydi',
           min: 0.01, max: 10, step: 0.1, scale: 100 },
      ],
      note: 'Masalan, chegara 4 va ellikboshida 5,5 guruh bo‘lsa: 4 tasi oddiy, 1,5 tasi '
          + 'ortiqcha — 1,5 × to‘lov × koeffitsient. 4 guruh bo‘lsa — ustama yo‘q. '
          + 'Ball mukofoti bunga bog‘liq emas.',
   },
   {
      title: 'Ortiqcha guruhning shahar og‘irligi',
      rows: [
         { key: 'city_makka_units', label: 'Faqat Makka qismi', unit: 'guruh',
           hint: 'Ortiqcha guruhni faqat Makkada olib borsa — shuncha guruh sanaladi',
           min: 0.01, max: 10, step: 0.05, scale: 100 },
         { key: 'city_madina_units', label: 'Faqat Madina qismi', unit: 'guruh',
           hint: 'Ortiqcha guruhni faqat Madinada olib borsa — shuncha guruh sanaladi',
           min: 0.01, max: 10, step: 0.05, scale: 100 },
      ],
      note: 'Faqat chegaradan oshgan guruhlarga qo‘llanadi — oddiy guruh shahridan qat‘i '
          + 'nazar butun sanaladi. Ikkovi qo‘shilganda 1,0 chiqishi kerak.',
   },
   {
      title: 'Ortiqcha guruhning daraja og‘irligi',
      rows: [
         { key: 'pkg_comfort_units', label: 'Comfort guruh', unit: 'guruh',
           hint: 'Ortiqcha Comfort guruh shuncha guruh sanaladi',
           min: 0.01, max: 10, step: 0.05, scale: 100 },
         { key: 'pkg_premium_units', label: 'Premium / Lux guruh', unit: 'guruh',
           hint: 'Ortiqcha Premium guruh shuncha guruh sanaladi (tarkibi kichik)',
           min: 0.01, max: 10, step: 0.05, scale: 100 },
      ],
      note: 'Faqat chegaradan oshgan guruhlarga qo‘llanadi — chegara ichidagi Premium '
          + 'guruh ham butun sanaladi. Darajasi belgilanmagan guruh to‘liq sanaladi.',
   },
]

/** The city sum is the one cross-field rule in the whole page and it is worth naming:
 *  at 0,6 + 0,4 a whole-trip leader weighs exactly one group, which is what makes the
 *  per-city split a redistribution rather than a raise or a cut. */
function value(f: Row): number | string {
   const st = s.kpiSettings
   if (!st) return ''
   if (f.kind === 'time') return clockText(st[f.key])
   return f.scale === 1 ? st[f.key] : st[f.key] / f.scale
}

/** «HH:MM» -> minutes after midnight, or NaN for anything the time input let through
 *  half-typed. */
function minutesOf(text: string): number {
   const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
   if (!m) return NaN
   const h = Number(m[1]), min = Number(m[2])
   return h < 24 && min < 60 ? h * 60 + min : NaN
}

async function save(f: Row, ev: Event) {
   const el = ev.target as HTMLInputElement
   const typed = f.kind === 'time' ? minutesOf(el.value) : Number(el.value)
   if (!Number.isFinite(typed)) {
      el.value = String(value(f))
      return
   }
   if (await s.setKpiSetting(f.key, Math.round(typed * f.scale))) {
      toast.success('Saqlandi')
      const st = s.kpiSettings
      if (st && (f.key === 'city_makka_units' || f.key === 'city_madina_units')
          && st.city_makka_units + st.city_madina_units !== 100) {
         // Not refused — the office may genuinely want a different total — but said
         // out loud, because the 1,0 sum is what keeps a split group worth the same
         // as a whole one, and nothing else on this screen would reveal it.
         toast.error("Shahar koeffitsientlari yig'indisi 1,0 emas")
      }
   } else {
      el.value = String(value(f))
      toast.error("Saqlanmadi — qiymatni tekshiring")
   }
}

async function saveFiks(code: string, ev: Event) {
   const fiks = Number((ev.target as HTMLInputElement).value)
   if (!Number.isFinite(fiks) || fiks < 0) return
   if (await s.setCategoryFiks(code, fiks)) toast.success('Toifa fiksi yangilandi')
   else toast.error('Saqlanmadi')
}

function countIn(code: string): number {
   return s.workers.filter((w) => w.role === 'ellikboshi' && w.category === code).length
}
</script>

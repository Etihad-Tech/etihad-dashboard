<template>
   <div class="space-y-3">
      <!-- Every number the pay model reads, in one place and nowhere else. They were
           panels hanging off the KPI board, which put settings on a screen people open
           to READ a month — and a fund field beside somebody's payslip invites editing
           the scheme while looking at one person it affects. -->
      <p class="px-1 text-[12.5px] text-[color:var(--n-muted)]">
         Reglament nisbatlarni belgilaydi, summalarni ofis belgilaydi.
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
               <input type="number" :min="f.min" :max="f.max" :step="f.step"
                  class="w-32 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums text-right"
                  :value="value(f)" @change="save(f, $event)" />
               <span class="w-8 text-[12.5px] text-[color:var(--n-muted)]">{{ f.unit }}</span>
            </div>
         </div>
         <p v-if="grp.note" class="mt-2 text-[12.5px] text-[color:var(--n-muted)]">
            {{ grp.note }}
         </p>
      </section>

      <!-- The pay scale, last: it is a list of people's money rather than a coefficient,
           and it moves everyone on a rung at once. -->
      <section v-if="s.categories.length" class="card p-5 n-enter">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">Toifalar va fiks</h3>
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
import { onMounted } from 'vue'
import { useNazoratStore, type KpiSettings } from '../../stores/nazorat'
import { useToast } from '../../../../composables/useToast'

const s = useNazoratStore()
const toast = useToast()

onMounted(() => { void s.loadCategories(); void s.loadKpiSettings() })

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
}

/** Grouped the way the arithmetic reads, not the way the columns happen to sit in the
 *  table: what the fund pays, what the load pays, what a group weighs. A flat list of
 *  ten numbers is a list nobody can check against the reglament. */
const GROUPS: { title: string; rows: Row[]; note?: string }[] = [
   {
      title: 'Sifat mukofoti',
      rows: [
         { key: 'bonus_base_ball', label: 'Quyi pog‘ona — balldan', unit: 'ball',
           hint: "Shu balldan pastda mukofot to'lanmaydi",
           min: 0, max: 100, step: 1, scale: 1 },
         { key: 'bonus_base_sum', label: 'Quyi pog‘ona — summa', unit: "so'm",
           hint: 'K ga ko‘paytiriladi', min: 0, max: 1_000_000_000,
           step: 100_000, scale: 1 },
         { key: 'bonus_high_ball', label: 'Yuqori pog‘ona — balldan', unit: 'ball',
           hint: 'Quyi pog‘onadan past bo‘lmasin',
           min: 0, max: 100, step: 1, scale: 1 },
         { key: 'bonus_high_sum', label: 'Yuqori pog‘ona — summa', unit: "so'm",
           hint: 'K ga ko‘paytiriladi', min: 0, max: 1_000_000_000,
           step: 100_000, scale: 1 },
         { key: 'sovrin_sum', label: '«Oyning ellikboshisi»', unit: "so'm",
           hint: 'Oyning eng yuqori reytingi uchun sovrin',
           min: 0, max: 1_000_000_000, step: 100_000, scale: 1 },
         { key: 'max_deduction_pct', label: 'Maksimal ushlab qolish', unit: '%',
           hint: 'KPI fiksning shuncha qismidan ortiq manfiyga ketmaydi',
           min: 0, max: 100, step: 5, scale: 1 },
      ],
      note: "Ikki pog‘ona — §5 ning o‘z jadvali. Pog‘ona ochilgan joyda sakrash bor: "
          + "bir ball pastda mukofot yo‘q, bir ball yuqorida to‘liq summa. Sonlarni "
          + "o‘zgartirish mumkin, sakrashning o‘zi esa reglament qaroridir. Sovrin "
          + "ushlab qolish chegarasidan tashqarida to‘lanadi.",
   },
   {
      title: 'Yuklama',
      rows: [
         { key: 'load_rate', label: "Yuklama to'lovi", unit: "so'm",
           hint: "1,0 SG dan ortiq har bir SG uchun",
           min: 0, max: 100_000_000, step: 100_000, scale: 1 },
         { key: 'k_min_units', label: 'K — eng past', unit: '',
           hint: 'Mukofot koeffitsientining quyi chegarasi',
           min: 0.01, max: 10, step: 0.1, scale: 100 },
         { key: 'k_max_units', label: 'K — eng yuqori', unit: '',
           hint: 'Mukofot koeffitsientining yuqori chegarasi',
           min: 0.01, max: 10, step: 0.1, scale: 100 },
      ],
      note: "Yuklama to'lovi biriktirish turidan va balldan qat'i nazar to'lanadi; "
          + "K esa faqat «Natija bo'yicha» biriktirilgan segmentlarga tegishli.",
   },
   {
      title: 'Shahar koeffitsienti',
      rows: [
         { key: 'city_makka_units', label: 'Makka', unit: '',
           hint: "Ziyorat dasturi zich, murojaatlar ko'p",
           min: 0.01, max: 10, step: 0.05, scale: 100 },
         { key: 'city_madina_units', label: 'Madina', unit: '',
           hint: 'Dastur yengilroq', min: 0.01, max: 10, step: 0.05, scale: 100 },
      ],
      note: "Ikkalasining yig'indisi 1,0 bo'lishi kerak — butun safarni bitta "
          + "ellikboshi olib borsa, uning yuklamasi aynan bitta guruhga teng bo'ladi. "
          + "Jidda Makka segmentiga kiradi.",
   },
   {
      title: 'Guruh turi koeffitsienti',
      rows: [
         { key: 'pkg_comfort_units', label: 'Comfort', unit: '',
           hint: "To'liq guruh", min: 0.01, max: 10, step: 0.05, scale: 100 },
         { key: 'pkg_premium_units', label: 'Premium / Lux', unit: '',
           hint: 'Kichik tarkibli guruh', min: 0.01, max: 10, step: 0.05, scale: 100 },
      ],
      note: "Daraja belgilanmagan guruh to'liq guruh sifatida hisoblanadi — nomidan "
          + "taxmin qilish yarim yuklamani jimgina to'lab qo'yishi mumkin edi.",
   },
]

/** The city sum is the one cross-field rule in the whole page and it is worth naming:
 *  at 0,6 + 0,4 a whole-trip leader weighs exactly one group, which is what makes the
 *  per-city split a redistribution rather than a raise or a cut. */
function value(f: Row): number | string {
   const st = s.kpiSettings
   if (!st) return ''
   return f.scale === 1 ? st[f.key] : st[f.key] / f.scale
}

async function save(f: Row, ev: Event) {
   const el = ev.target as HTMLInputElement
   const typed = Number(el.value)
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

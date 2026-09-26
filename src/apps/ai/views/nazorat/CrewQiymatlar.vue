<template>
   <div class="space-y-3">
      <div v-if="loading && !data" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         Yuklanmoqda…
      </div>
      <div v-else-if="error" class="card py-10 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">Qiymatlar yuklanmadi.</p>
         <button class="btn-primary" @click="load()">Qayta urinish</button>
      </div>

      <template v-else-if="data">
         <!-- WHEN a change applies (owner, 26.09: from the next month). The main admin
              alone may apply one to the current month. -->
         <div class="card p-4 space-y-2">
            <p class="text-[13.5px] leading-snug">
               Bu raqamlar faqat <b>ishchi guruh</b> oyligiga ta'sir qiladi.
               O'zgartirish <b>{{ monthName(targetPeriod) }}</b>dan kuchga kiradi.
            </p>
            <div v-if="data.can_apply_current" class="seg">
               <button :class="mode === 'next' ? 'is-on' : ''" @click="setMode('next')">
                  Keyingi oydan ({{ monthName(data.next_period) }})
               </button>
               <button :class="mode === 'current' ? 'is-on' : ''" @click="setMode('current')">
                  Joriy oydan ({{ monthName(data.period) }})
               </button>
            </div>
         </div>

         <section v-for="sec in visibleSections" :key="sec.key" class="card p-5 n-enter">
            <div class="flex items-baseline gap-2.5">
               <h3 class="n-h">{{ sec.title }}</h3>
            </div>
            <div class="mt-3 space-y-0.5">
               <div v-for="f in sec.fields.filter((x) => has(x.k))" :key="f.k"
                  class="flex items-center gap-3 py-2.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">
                  <span class="flex-1 min-w-0">
                     <span class="block text-[14px] font-semibold">{{ f.label }}</span>
                     <span class="block text-[12px] text-[color:var(--n-muted)] leading-snug">{{ hintOf(f) }}</span>
                     <span v-if="differs(f.k)" class="block text-[12px] text-[color:var(--n-muted)]">
                        {{ monthName(data.period) }}da: {{ show(currentValues[f.k]) }}
                     </span>
                  </span>
                  <template v-if="f.bool">
                     <input type="checkbox" class="w-5 h-5" :disabled="!canEdit(f.k)"
                        v-model="draft[f.k]" />
                  </template>
                  <template v-else>
                     <input v-if="canEdit(f.k)" type="number" :min="f.min ?? 0" :max="f.max ?? 1000000" :step="f.step ?? 1"
                        v-model.number="draft[f.k]"
                        class="w-28 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums text-right" />
                     <span v-else class="w-28 text-right text-[14px] font-semibold tabular-nums">{{ show(targetValues[f.k]) }}</span>
                     <span class="w-10 text-[12.5px] text-[color:var(--n-muted)]">{{ f.unit }}</span>
                  </template>
               </div>
            </div>
            <p v-if="sec.note" class="mt-2 text-[12.5px] text-[color:var(--n-muted)] leading-snug">{{ sec.note }}</p>
            <p v-if="sec.key === 'q'" class="mt-1 text-[12.5px] text-[color:var(--n-muted)] leading-snug">{{ tiersText }}</p>
            <div v-if="sectionChanged(sec)" class="mt-3 flex items-center gap-2">
               <button class="btn-primary" :disabled="saving" @click="save(sec)">Saqlash</button>
               <button class="btn-ghost" :disabled="saving" @click="reset()">Bekor qilish</button>
            </div>
         </section>

         <p v-if="data.current.updated_by" class="px-1 text-[12px] text-[color:var(--n-muted)]">
            Oxirgi o'zgartirish: {{ data.next.updated_by || data.current.updated_by }}
         </p>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../../api'
import { useToast } from '../../../../composables/useToast'
import { apiError, monthName } from './crew'

interface Field {
   k: string
   label: string
   hint?: string
   unit?: string
   min?: number
   max?: number
   step?: number
   bool?: boolean
}
interface Section { key: string; title: string; note?: string; fields: Field[] }

interface SettingsBlock { values: Record<string, number | boolean>; effective_from: string | null; updated_by: string | null }
interface SettingsReply {
   period: string
   next_period: string
   current: SettingsBlock
   next: SettingsBlock
   editable: string[]
   can_apply_current: boolean
}

const toast = useToast()
const data = ref<SettingsReply | null>(null)
const loading = ref(false)
const error = ref(false)
const saving = ref(false)
const mode = ref<'next' | 'current'>('next')
const draft = ref<Record<string, any>>({})

/** Every number the crew's pay reads, in plain words. The API sends only the ones this
 *  login may see; a section with none of them does not render at all. */
const SECTIONS: Section[] = [
   { key: 'maosh', title: 'Maosh', fields: [
      { k: 'doimiy_pct', label: 'Maoshning doimiy qismi', unit: '%', max: 100,
        hint: 'Qolgani — KPI qismi. Har xodimning maosh bazasi uning kartasida.' },
   ] },
   { key: 'reja', title: 'Oylik reja', fields: [
      { k: 'plan_pilgrims', label: 'Bir oyda uchadigan ziyoratchilar rejasi', unit: 'kishi', min: 1, max: 100000, step: 10,
        hint: 'KPI rejaning bajarilishiga mutanosib: 50% bajarilsa — KPI ning 50% i to\'lanadi.' },
   ] },
   { key: 'sifat', title: 'Sifat bahosi — 100 ball', note: 'To\'rt ko\'rsatkich ballari yig\'indisi 100 bo\'lishi kerak.', fields: [
      { k: 'w_bajarish', label: 'Bajarish', unit: 'ball', max: 100, hint: 'Yopilgan murojaatlar ulushi' },
      { k: 'w_javobsiz', label: 'Javobsiz', unit: 'ball', max: 100, hint: 'Hech kim olmagan murojaatlar' },
      { k: 'w_takroriy', label: 'Takroriy', unit: 'ball', max: 100, hint: 'Ziyoratchi yana yozgan murojaatlar' },
      { k: 'w_tezlik', label: 'Javob tezligi', unit: 'ball', max: 100, hint: 'Kunduzgi o\'rtacha qabul qilish vaqti' },
      { k: 'survey_pct', label: 'Ziyoratchilar so\'rovining ulushi', unit: '%', max: 100,
        hint: 'Qolgani — bot va CRM ko\'rsatkichlari' },
      { k: 'min_sample', label: 'Qo\'lda baholanadi, agar murojaatlar shundan kam bo\'lsa', unit: 'ta', max: 1000,
        hint: 'Kam murojaatda foizlar ishonchsiz — ballni Sifat nazorati qo\'yadi' },
   ] },
   { key: 'etiroz', title: 'So\'rovdagi asosli e\'tiroz', note: 'Bir so\'rovda jami 20 balldan ko\'p ayirilmaydi.', fields: [
      { k: 'sev_kichik', label: 'Kichik', unit: 'ball', max: 100, hint: 'Ayiriladigan ball' },
      { k: 'sev_orta', label: 'O\'rta', unit: 'ball', max: 100, hint: 'Ayiriladigan ball' },
      { k: 'sev_jiddiy', label: 'Jiddiy', unit: 'ball', max: 100, hint: 'Ayiriladigan ball' },
   ] },
   { key: 'q', title: 'KPI qancha to\'lanadi', note: 'Eng pastki pog\'onadan past ball — KPI to\'lanmaydi. Chegaradagi ball yuqori pog\'onaga kiradi.', fields: [
      { k: 'q3_ball', label: 'Yuqori pog\'ona boshlanadigan ball', unit: 'ball', max: 100 },
      { k: 'q3_pct', label: 'Yuqori pog\'onada to\'lanadigan KPI', unit: '%', max: 100 },
      { k: 'q2_ball', label: 'O\'rta pog\'ona boshlanadigan ball', unit: 'ball', max: 100 },
      { k: 'q2_pct', label: 'O\'rta pog\'onada to\'lanadigan KPI', unit: '%', max: 100 },
      { k: 'q1_ball', label: 'Pastki pog\'ona boshlanadigan ball', unit: 'ball', max: 100 },
      { k: 'q1_pct', label: 'Pastki pog\'onada to\'lanadigan KPI', unit: '%', max: 100 },
   ] },
   { key: 'tezlik', title: 'Javob tezligi', note: 'Kun va tun chegarasi — Ellikboshilar qiymatlaridagi bilan bir xil, Makka vaqti bo\'yicha.', fields: [
      { k: 'tz1_min', label: 'To\'liq ball — shuncha daqiqagacha', unit: 'daq', min: 1, max: 600 },
      { k: 'tz2_min', label: 'Ikkinchi pog\'ona — shuncha daqiqagacha', unit: 'daq', min: 1, max: 600 },
      { k: 'tz3_min', label: 'Uchinchi pog\'ona — shuncha daqiqagacha', unit: 'daq', min: 1, max: 600 },
      { k: 'tz4_min', label: 'Eng kam ball — shuncha daqiqagacha', unit: 'daq', min: 1, max: 600,
        hint: 'Undan ko\'p — 0 ball' },
      { k: 'norm_urgent_min', label: 'Shoshilinch murojaatni qabul qilish me\'yori', unit: 'daq', min: 1, max: 600 },
      { k: 'norm_day_min', label: 'Kunduzgi qabul qilish me\'yori', unit: 'daq', min: 1, max: 600,
        hint: 'Undan kechiksa — nazoratchiga ogohlantirish' },
      { k: 'norm_night_min', label: 'Tungi qabul qilish me\'yori', unit: 'daq', min: 1, max: 600 },
   ] },
   { key: 'chiqish', title: 'Qo\'shimcha to\'lovlar', note: 'Madina ziyorati to\'lanmaydi. Chiqishlar 60/40 ga kirmaydi.', fields: [
      { k: 'airport_sum', label: 'Aeroportga bir chiqish', unit: 'SAR', step: 10 },
      { k: 'ziyorat_sum', label: 'Makka ziyoratiga bir chiqish', unit: 'SAR', step: 10 },
   ] },
   { key: 'jarima', title: 'Jarimalar', note: 'Faqat ball ko\'rmaydigan xatolar uchun. Ball ko\'radigan xato — javobsiz, kechikish, takroriy — alohida jarimalanmaydi.', fields: [
      { k: 'fine_bot_block', label: 'Botni bloklash', unit: 'SAR', step: 10, hint: 'Oyiga bir marta' },
      { k: 'fine_false_completion', label: 'So\'rovda tasdiqlangan soxta «Bajarildi»', unit: 'SAR', step: 10, hint: 'Har biri uchun' },
      { k: 'fine_xatolik_abuse', label: 'Ketma-ket asossiz «Xatolik»', unit: 'SAR', step: 10, hint: 'Oyiga bir marta' },
   ] },
   { key: 'oy', title: 'To\'liq bo\'lmagan oy', fields: [
      { k: 'prorata', bool: true, label: 'Ishlagan kunlarga mutanosib',
        hint: 'Oy o\'rtasida kelgan yoki ketgan xodimga maosh ishlagan kunlariga qarab. Sanalar xodim kartasida.' },
   ] },
]

const targetPeriod = computed(() => data.value
   ? (mode.value === 'current' ? data.value.period : data.value.next_period) : '')
const targetValues = computed<Record<string, any>>(() => data.value
   ? (mode.value === 'current' ? data.value.current.values : data.value.next.values) : {})
const currentValues = computed<Record<string, any>>(() => data.value?.current.values || {})

const has = (k: string) => k in targetValues.value
const canEdit = (k: string) => !!data.value?.editable.includes(k)
const visibleSections = computed(() => SECTIONS.filter((sec) => sec.fields.some((f) => has(f.k))))
const differs = (k: string) => mode.value === 'next' && k in currentValues.value
   && currentValues.value[k] !== targetValues.value[k]
const show = (v: any) => (typeof v === 'boolean' ? (v ? 'ha' : 'yo\'q')
   : typeof v === 'number' ? v.toLocaleString('ru-RU') : '—')

/** The response-time ladder, in balls — the weight × the draft's step fractions. */
function hintOf(f: Field): string {
   const w = Number(draft.value.w_tezlik ?? targetValues.value.w_tezlik ?? 15)
   const frac: Record<string, number> = { tz1_min: 1, tz2_min: 12 / 15, tz3_min: 9 / 15, tz4_min: 4 / 15 }
   if (f.k in frac) {
      const ball = Math.floor(w * frac[f.k] + 0.5)
      return `${ball} ball${f.hint ? '. ' + f.hint : ''}`
   }
   return f.hint || ''
}

const tiersText = computed(() => {
   const d = draft.value
   if (d.q1_ball === undefined) return ''
   return `${d.q3_ball}–100 ball → ${d.q3_pct}% · ${d.q2_ball}–${d.q3_ball} → ${d.q2_pct}% · `
      + `${d.q1_ball}–${d.q2_ball} → ${d.q1_pct}% · ${d.q1_ball} dan past → 0`
})

function reset() {
   draft.value = { ...targetValues.value }
}

function setMode(m: 'next' | 'current') {
   mode.value = m
   reset()
}

function changedKeys(sec: Section): string[] {
   return sec.fields.map((f) => f.k)
      .filter((k) => has(k) && canEdit(k) && draft.value[k] !== targetValues.value[k])
}
const sectionChanged = (sec: Section) => changedKeys(sec).length > 0

async function load() {
   loading.value = true
   error.value = false
   try {
      data.value = (await api.get('/control/crew/settings')).data
      reset()
   } catch {
      error.value = true
   } finally {
      loading.value = false
   }
}

async function save(sec: Section) {
   const keys = changedKeys(sec)
   if (!keys.length) return
   const values: Record<string, any> = {}
   for (const k of keys) {
      const v = draft.value[k]
      if (typeof targetValues.value[k] !== 'boolean' && (v === '' || v === null || Number.isNaN(Number(v)))) {
         toast.error('Son kiriting')
         return
      }
      values[k] = typeof targetValues.value[k] === 'boolean' ? !!v : Math.round(Number(v))
   }
   saving.value = true
   try {
      await api.put('/control/crew/settings', { values, effective: mode.value })
      toast.success(`Saqlandi — ${monthName(targetPeriod.value)}dan`)
      const keepMode = mode.value
      await load()
      mode.value = keepMode
      reset()
   } catch (e) {
      toast.error(apiError(e))
   } finally {
      saving.value = false
   }
}

onMounted(load)
</script>

<template>
   <div class="space-y-3" v-bind="crewDir()">
      <CrewLangSwitch />

      <div v-if="loading && !data" class="card py-14 text-center text-[15px] text-[color:var(--n-muted)]">
         {{ tr('loading') }}
      </div>
      <div v-else-if="error" class="card py-10 text-center">
         <p class="text-[15px] text-[color:var(--n-muted)] mb-4">{{ tr('values_failed') }}</p>
         <button class="btn-primary" @click="load()">{{ tr('retry') }}</button>
      </div>

      <template v-else-if="data">
         <!-- WHEN a change applies (owner, 26.09: from the next month). The main admin
              alone may apply one to the current month. -->
         <div class="card p-4 space-y-2">
            <p class="text-[13.5px] leading-snug">
               {{ tr('values_scope_a') }} <b>{{ tr('values_scope_team') }}</b> {{ tr('values_scope_b') }}
               {{ tr('values_from_a') }} <b>{{ monthName(targetPeriod) }}</b>{{ tr('values_from_b') }}
            </p>
            <div v-if="data.can_apply_current" class="seg">
               <button :class="mode === 'next' ? 'is-on' : ''" @click="setMode('next')">
                  {{ tr('from_next', { m: monthName(data.next_period) }) }}
               </button>
               <button :class="mode === 'current' ? 'is-on' : ''" @click="setMode('current')">
                  {{ tr('from_current', { m: monthName(data.period) }) }}
               </button>
            </div>
         </div>

         <section v-for="sec in visibleSections" :key="sec.key" class="card p-5 n-enter">
            <div class="flex items-baseline gap-2.5">
               <h3 class="n-h">{{ L(sec.title) }}</h3>
            </div>
            <div class="mt-3 space-y-0.5">
               <div v-for="f in sec.fields.filter((x) => has(x.k))" :key="f.k"
                  class="flex items-center gap-3 py-2.5 border-t border-[color:var(--n-line,rgba(0,0,0,0.08))]">
                  <span class="flex-1 min-w-0">
                     <span class="block text-[14px] font-semibold">{{ L(f.label) }}</span>
                     <span class="block text-[12px] text-[color:var(--n-muted)] leading-snug">{{ hintOf(f) }}</span>
                     <span v-if="differs(f.k)" class="block text-[12px] text-[color:var(--n-muted)]">
                        {{ tr('value_in_month', { m: monthName(data.period), v: show(currentValues[f.k]) }) }}
                     </span>
                  </span>
                  <template v-if="f.bool">
                     <input type="checkbox" class="w-5 h-5" :disabled="!canEdit(f.k)"
                        v-model="draft[f.k]" />
                  </template>
                  <template v-else>
                     <input v-if="canEdit(f.k)" type="number" :min="f.min ?? 0" :max="f.max ?? 1000000" :step="f.step ?? 1"
                        v-model.number="draft[f.k]"
                        class="w-28 px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px] tabular-nums text-end" />
                     <span v-else class="w-28 text-end text-[14px] font-semibold tabular-nums">{{ show(targetValues[f.k]) }}</span>
                     <span class="w-12 text-[12.5px] text-[color:var(--n-muted)]">{{ f.unit ? UNITS[f.unit][crewLang] : '' }}</span>
                  </template>
               </div>
            </div>
            <p v-if="sec.note" class="mt-2 text-[12.5px] text-[color:var(--n-muted)] leading-snug">{{ L(sec.note) }}</p>
            <p v-if="sec.key === 'q'" class="mt-1 text-[12.5px] text-[color:var(--n-muted)] leading-snug">{{ tiersText }}</p>
            <div v-if="sectionChanged(sec)" class="mt-3 flex items-center gap-2">
               <button class="btn-primary" :disabled="saving" @click="save(sec)">{{ tr('save') }}</button>
               <button class="btn-ghost" :disabled="saving" @click="reset()">{{ tr('cancel') }}</button>
            </div>
         </section>

         <p v-if="data.current.updated_by" class="px-1 text-[12px] text-[color:var(--n-muted)]">
            {{ tr('last_change', { by: data.next.updated_by || data.current.updated_by }) }}
         </p>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../../../../api'
import { useToast } from '../../../../composables/useToast'
import { apiError, crewDir, crewLang, monthName, num, tr } from './crew'
import CrewLangSwitch from './CrewLangSwitch.vue'

/** A phrase in both languages — the crew screens read in Uzbek or Arabic. */
interface Bi { uz: string; ar: string }
const bi = (uz: string, ar: string): Bi => ({ uz, ar })
const L = (b: Bi) => b[crewLang.value]

const UNITS = {
   pct: bi('%', '%'),
   kishi: bi('kishi', 'شخص'),
   ball: bi('ball', 'درجة'),
   ta: bi('ta', 'طلب'),
   daq: bi('daq', 'دقيقة'),
   sar: bi('SAR', 'ريال'),
} as const

interface Field {
   k: string
   label: Bi
   hint?: Bi
   unit?: keyof typeof UNITS
   min?: number
   max?: number
   step?: number
   bool?: boolean
}
interface Section { key: string; title: Bi; note?: Bi; fields: Field[] }

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

const FINE_ONCE = bi('Oyiga bir marta', 'مرة واحدة في الشهر')
const DEDUCTED = bi('Ayiriladigan ball', 'الدرجات المخصومة')

/** Every number the crew's pay reads, in plain words. The API sends only the ones this
 *  login may see; a section with none of them does not render at all. */
const SECTIONS: Section[] = [
   { key: 'maosh', title: bi('Maosh', 'الراتب'), fields: [
      { k: 'doimiy_pct', label: bi('Maoshning doimiy qismi', 'الجزء الثابت من الراتب'), unit: 'pct', max: 100,
        hint: bi('Qolgani — KPI qismi. Har xodimning maosh bazasi uning kartasida.',
           'الباقي هو جزء KPI. الراتب الأساسي لكل موظف في بطاقته.') },
   ] },
   { key: 'reja', title: bi('Oylik reja', 'الخطة الشهرية'), fields: [
      { k: 'plan_pilgrims', label: bi('Bir oyda uchadigan ziyoratchilar rejasi', 'خطة عدد المعتمرين المسافرين في الشهر'),
        unit: 'kishi', min: 1, max: 100000, step: 10,
        hint: bi('KPI rejaning bajarilishiga mutanosib: 50% bajarilsa — KPI ning 50% i to\'lanadi.',
           'يتناسب KPI مع تنفيذ الخطة: إذا نُفّذ 50% منها يُصرف 50% من KPI.') },
   ] },
   { key: 'sifat', title: bi('Sifat bahosi — 100 ball', 'تقييم الجودة — 100 درجة'),
     note: bi('To\'rt ko\'rsatkich ballari yig\'indisi 100 bo\'lishi kerak.', 'يجب أن يكون مجموع درجات المؤشرات الأربعة 100.'),
     fields: [
      { k: 'w_bajarish', label: bi('Bajarish', 'الإنجاز'), unit: 'ball', max: 100,
        hint: bi('Yopilgan murojaatlar ulushi', 'نسبة الطلبات المُنجزة') },
      { k: 'w_javobsiz', label: bi('Javobsiz', 'بلا استجابة'), unit: 'ball', max: 100,
        hint: bi('Hech kim olmagan murojaatlar', 'طلبات لم يستلمها أحد') },
      { k: 'w_takroriy', label: bi('Takroriy', 'المتكررة'), unit: 'ball', max: 100,
        hint: bi('Ziyoratchi yana yozgan murojaatlar', 'طلبات كتب عنها المعتمر مرة أخرى') },
      { k: 'w_tezlik', label: bi('Javob tezligi', 'سرعة الاستجابة'), unit: 'ball', max: 100,
        hint: bi('Kunduzgi o\'rtacha qabul qilish vaqti', 'متوسط وقت الاستلام نهارًا') },
      { k: 'survey_pct', label: bi('Ziyoratchilar so\'rovining ulushi', 'حصة استبيان المعتمرين'), unit: 'pct', max: 100,
        hint: bi('Qolgani — bot va CRM ko\'rsatkichlari', 'الباقي — مؤشرات البوت وCRM') },
      { k: 'min_sample', label: bi('Qo\'lda baholanadi, agar murojaatlar shundan kam bo\'lsa',
           'يُقيَّم يدويًا إذا كانت الطلبات أقل من هذا العدد'), unit: 'ta', max: 1000,
        hint: bi('Kam murojaatda foizlar ishonchsiz — ballni Sifat nazorati qo\'yadi',
           'مع قلة الطلبات تكون النسب غير موثوقة — تضع مراقبة الجودة الدرجة') },
   ] },
   { key: 'etiroz', title: bi('So\'rovdagi asosli e\'tiroz', 'الشكوى المُبرَّرة في الاستبيان'),
     note: bi('Bir so\'rovda jami 20 balldan ko\'p ayirilmaydi.', 'لا يُخصم أكثر من 20 درجة إجمالًا في استبيان واحد.'),
     fields: [
      { k: 'sev_kichik', label: bi('Kichik', 'بسيطة'), unit: 'ball', max: 100, hint: DEDUCTED },
      { k: 'sev_orta', label: bi('O\'rta', 'متوسطة'), unit: 'ball', max: 100, hint: DEDUCTED },
      { k: 'sev_jiddiy', label: bi('Jiddiy', 'جسيمة'), unit: 'ball', max: 100, hint: DEDUCTED },
   ] },
   { key: 'q', title: bi('KPI qancha to\'lanadi', 'كم يُصرف من KPI'),
     note: bi('Eng pastki pog\'onadan past ball — KPI to\'lanmaydi. Chegaradagi ball yuqori pog\'onaga kiradi.',
        'إذا كانت الدرجة أدنى من الشريحة الدنيا لا يُصرف KPI. الدرجة الحدّية تدخل في الشريحة الأعلى.'),
     fields: [
      { k: 'q3_ball', label: bi('Yuqori pog\'ona boshlanadigan ball', 'درجة بداية الشريحة العليا'), unit: 'ball', max: 100 },
      { k: 'q3_pct', label: bi('Yuqori pog\'onada to\'lanadigan KPI', 'نسبة KPI المصروفة في الشريحة العليا'), unit: 'pct', max: 100 },
      { k: 'q2_ball', label: bi('O\'rta pog\'ona boshlanadigan ball', 'درجة بداية الشريحة الوسطى'), unit: 'ball', max: 100 },
      { k: 'q2_pct', label: bi('O\'rta pog\'onada to\'lanadigan KPI', 'نسبة KPI المصروفة في الشريحة الوسطى'), unit: 'pct', max: 100 },
      { k: 'q1_ball', label: bi('Pastki pog\'ona boshlanadigan ball', 'درجة بداية الشريحة الدنيا'), unit: 'ball', max: 100 },
      { k: 'q1_pct', label: bi('Pastki pog\'onada to\'lanadigan KPI', 'نسبة KPI المصروفة في الشريحة الدنيا'), unit: 'pct', max: 100 },
   ] },
   { key: 'tezlik', title: bi('Javob tezligi', 'سرعة الاستجابة'),
     note: bi('Kun va tun chegarasi — Ellikboshilar qiymatlaridagi bilan bir xil, Makka vaqti bo\'yicha.',
        'حدّ النهار والليل هو نفسه في قيم قادة المجموعات، بتوقيت مكة.'),
     fields: [
      { k: 'tz1_min', label: bi('To\'liq ball — shuncha daqiqagacha', 'الدرجة الكاملة — حتى هذا العدد من الدقائق'),
        unit: 'daq', min: 1, max: 600 },
      { k: 'tz2_min', label: bi('Ikkinchi pog\'ona — shuncha daqiqagacha', 'الشريحة الثانية — حتى هذا العدد من الدقائق'),
        unit: 'daq', min: 1, max: 600 },
      { k: 'tz3_min', label: bi('Uchinchi pog\'ona — shuncha daqiqagacha', 'الشريحة الثالثة — حتى هذا العدد من الدقائق'),
        unit: 'daq', min: 1, max: 600 },
      { k: 'tz4_min', label: bi('Eng kam ball — shuncha daqiqagacha', 'أدنى درجة — حتى هذا العدد من الدقائق'),
        unit: 'daq', min: 1, max: 600, hint: bi('Undan ko\'p — 0 ball', 'أكثر من ذلك — 0 درجة') },
      { k: 'norm_urgent_min', label: bi('Shoshilinch murojaatni qabul qilish me\'yori', 'مهلة استلام الطلب العاجل'),
        unit: 'daq', min: 1, max: 600 },
      { k: 'norm_day_min', label: bi('Kunduzgi qabul qilish me\'yori', 'مهلة الاستلام نهارًا'), unit: 'daq', min: 1, max: 600,
        hint: bi('Undan kechiksa — nazoratchiga ogohlantirish', 'عند تجاوزها — تنبيه للمراقب') },
      { k: 'norm_night_min', label: bi('Tungi qabul qilish me\'yori', 'مهلة الاستلام ليلًا'), unit: 'daq', min: 1, max: 600 },
   ] },
   { key: 'chiqish', title: bi('Qo\'shimcha to\'lovlar', 'مدفوعات إضافية'),
     note: bi('Madina ziyorati to\'lanmaydi. Chiqishlar 60/40 ga kirmaydi.',
        'لا تُدفع زيارات المدينة. المهام الميدانية خارج نسبة 60/40.'),
     fields: [
      { k: 'airport_sum', label: bi('Aeroportga bir chiqish', 'مهمة واحدة إلى المطار'), unit: 'sar', step: 10 },
      { k: 'ziyorat_sum', label: bi('Makka ziyoratiga bir chiqish', 'مهمة واحدة لزيارات مكة'), unit: 'sar', step: 10 },
   ] },
   { key: 'jarima', title: bi('Jarimalar', 'الغرامات'),
     note: bi('Faqat ball ko\'rmaydigan xatolar uchun. Ball ko\'radigan xato — javobsiz, kechikish, takroriy — alohida jarimalanmaydi.',
        'فقط للأخطاء التي لا تظهر في الدرجة. الأخطاء التي تظهر في الدرجة — عدم الاستجابة والتأخر والتكرار — لا تُغرَّم بشكل منفصل.'),
     fields: [
      { k: 'fine_bot_block', label: bi('Botni bloklash', 'حظر البوت'), unit: 'sar', step: 10, hint: FINE_ONCE },
      { k: 'fine_false_completion', label: bi('So\'rovda tasdiqlangan soxta «Bajarildi»', '«تم التنفيذ» زائف أكّده الاستبيان'),
        unit: 'sar', step: 10, hint: bi('Har biri uchun', 'عن كل حالة') },
      { k: 'fine_xatolik_abuse', label: bi('Ketma-ket asossiz «Xatolik»', '«خطأ» متكرر بلا مبرر'), unit: 'sar', step: 10,
        hint: FINE_ONCE },
   ] },
   { key: 'oy', title: bi('To\'liq bo\'lmagan oy', 'الشهر غير الكامل'), fields: [
      { k: 'prorata', bool: true, label: bi('Ishlagan kunlarga mutanosib', 'بالتناسب مع أيام العمل'),
        hint: bi('Oy o\'rtasida kelgan yoki ketgan xodimga maosh ishlagan kunlariga qarab. Sanalar xodim kartasida.',
           'الموظف الذي التحق أو غادر في منتصف الشهر يُصرف له حسب أيام عمله. التواريخ في بطاقة الموظف.') },
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
const show = (v: any) => (typeof v === 'boolean' ? tr(v ? 'yes' : 'no')
   : typeof v === 'number' ? num(v) : '—')

/** The response-time ladder, in balls — the weight × the draft's step fractions. */
function hintOf(f: Field): string {
   const w = Number(draft.value.w_tezlik ?? targetValues.value.w_tezlik ?? 15)
   const frac: Record<string, number> = { tz1_min: 1, tz2_min: 12 / 15, tz3_min: 9 / 15, tz4_min: 4 / 15 }
   if (f.k in frac) {
      const ball = Math.floor(w * frac[f.k] + 0.5)
      return `${tr('ladder_ball', { n: ball })}${f.hint ? '. ' + L(f.hint) : ''}`
   }
   return f.hint ? L(f.hint) : ''
}

const tiersText = computed(() => {
   const d = draft.value
   if (d.q1_ball === undefined) return ''
   return tr('tiers', { q3: d.q3_ball, p3: d.q3_pct, q2: d.q2_ball, p2: d.q2_pct, q1: d.q1_ball, p1: d.q1_pct })
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
         toast.error(tr('enter_number'))
         return
      }
      values[k] = typeof targetValues.value[k] === 'boolean' ? !!v : Math.round(Number(v))
   }
   saving.value = true
   try {
      await api.put('/control/crew/settings', { values, effective: mode.value })
      toast.success(tr('saved_from', { m: monthName(targetPeriod.value) }))
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

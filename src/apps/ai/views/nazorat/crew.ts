/** Tashkiliy guruh KPI — the shapes the crew endpoints answer and the few helpers the
 *  three crew screens share (the board, its Qiymatlar and the trips). All the arithmetic
 *  is the server's (`bot/services/crew_kpi.py`); nothing here computes pay.
 *
 *  The team was «Ishchi guruh» until 2026-10-06 (owner: «переименуй его на tashkiliy
 *  guruh»). The staff.role code stays `ishchi_guruh` — only the words changed. */

import { ref } from 'vue'

export interface CrewOps {
   base: number
   bajarish_pct: number
   javobsiz_pct: number
   takroriy_pct: number
   bajarish_ball: number
   javobsiz_ball: number
   takroriy_ball: number
   tezlik_ball: number
   tezlik_measured: boolean
   weights: { bajarish: number; javobsiz: number; takroriy: number; tezlik: number }
   total: number
   min_sample: boolean
}

export interface CrewPay {
   salary: number | null
   doimiy_pct: number
   factor: number
   worked_days: number
   month_days: number
   airport_trips: number
   ziyorat_trips: number
   airport: number
   ziyorat: number
   airport_sum: number
   ziyorat_sum: number
   jarima: number
   bot_block: boolean
   false_completions: number
   xatolik_abuse: boolean
   manual_adjust: number
   ball: number | null
   q: number | null
   v: number | null
   pending: string[]
   doimiy: number | null
   kpi_target: number | null
   kpi: number | null
   total: number | null
   missing_salary: boolean
}

export interface CrewRow {
   id: number
   username: string
   name: string | null
   location: string
   role: string
   telegram_id: number | null
   salary_sar: number | null
   work_start: string | null
   work_end: string | null
   cards: {
      completed: number; reopened: number; never_accepted: number; blocked_cards: number
      released: number; flagged: number; false_completions: number; xatolik_abuse: boolean
      day_avg_response_seconds: number | null
   }
   never_accepted_graded: number
   ops: CrewOps | null
   survey_ball: number | null
   combined: number | null
   min_sample: boolean
   manual: { ball: number | null; ball_note: string | null; adjust: number; adjust_reason: string | null; updated_by: string | null } | null
   ball: number | null
   hand_ball: boolean
   q: number | null
   pay: CrewPay
}

export interface CrewCitySurvey { ball: number | null; surveys: number; used: number; groups: number; covered_groups: number }

export interface CrewBoard {
   period: string
   trial: boolean
   first_paid_period: string
   effective_from: string | null
   settings: Record<string, number | boolean>
   flown: {
      value: number | null
      source: 'manual' | 'crm' | null
      v: number | null
      plan: number
      manual: number | null
      manual_note: string | null
      manual_by: string | null
      crm: { count: number; departures: { departure_id: string; departure_date: string; status: string | null; package_name: string | null; pilgrims: number }[] } | null
      crm_error: string | null
   }
   survey: { makka: CrewCitySurvey; madina: CrewCitySurvey }
   rows: CrewRow[]
   can_write_trips: boolean
   can_set_pay: boolean
   can_set_manual: boolean
}

export interface CrewTrip {
   id: number
   trip_date: string
   kind: 'airport' | 'ziyorat'
   staff_id: number | null
   staff_username: string | null
   staff_name: string | null
   status: 'bordi' | 'bormadi' | 'almashtirildi'
   replacement_staff_id: number | null
   replacement_username: string | null
   replacement_name: string | null
   note: string | null
   created_by: string | null
   updated_by: string | null
   paid_staff_id: number | null
}

export interface CrewPerson { id: number; username: string; name: string | null; location: string; role: string; is_active: boolean }

// ── LANGUAGE ────────────────────────────────────────────────────────────────────────
// The three crew screens read in Uzbek or Arabic (owner, 2026-10-06: «арабский перевод
// именно к разделу kpi для tashkiliy guruh»). Only these screens: the rest of the panel
// stays Uzbek. The choice is the reader's, kept per browser — a convenience, so a
// blocked storage simply starts in Uzbek.

export type CrewLang = 'uz' | 'ar'
const LANG_KEY = 'nazorat.crewLang'

function readLang(): CrewLang {
   try { return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'uz' } catch { return 'uz' }
}

export const crewLang = ref<CrewLang>(readLang())

export function setCrewLang(l: CrewLang) {
   crewLang.value = l
   try { localStorage.setItem(LANG_KEY, l) } catch { /* per-browser only */ }
}

/** `dir` / `lang` for a crew screen's root, so Arabic reads right-to-left. */
export function crewDir() {
   return crewLang.value === 'ar' ? { dir: 'rtl', lang: 'ar' } : { dir: 'ltr', lang: 'uz' }
}

/** Every crew-screen phrase, both languages side by side so a missing one shows in review.
 *  `{x}` is filled by tr(). Arabic avoids number agreement by writing «label: n». */
const TEXT = {
   loading: { uz: 'Yuklanmoqda…', ar: 'جارٍ التحميل…' },
   load_failed: { uz: "Ma'lumot yuklanmadi.", ar: 'تعذّر تحميل البيانات.' },
   retry: { uz: 'Qayta urinish', ar: 'إعادة المحاولة' },
   save: { uz: 'Saqlash', ar: 'حفظ' },
   cancel: { uz: 'Bekor qilish', ar: 'إلغاء' },
   saved: { uz: 'Saqlandi', ar: 'تم الحفظ' },
   yes: { uz: 'ha', ar: 'نعم' },
   no: { uz: "yo'q", ar: 'لا' },

   // The board
   trial_title: { uz: 'Sinov hisobi.', ar: 'حساب تجريبي.' },
   trial_body: {
      uz: "{month} to'lanmaydi — ma'lumot uchun. To'lov {first}dan boshlanadi.",
      ar: 'لا يُصرف عن {month} — للاطلاع فقط. يبدأ الصرف من {first}.',
   },
   plan_title: { uz: 'Oylik reja', ar: 'الخطة الشهرية' },
   plan_count: { uz: 'reja: {n} kishi', ar: 'الخطة: {n} معتمر' },
   flown_line: { uz: 'uchgan · bajarilishi {pct}', ar: 'سافروا فعليًا · نسبة التنفيذ {pct}' },
   flown_manual: { uz: "Qo'lda kiritilgan", ar: 'أُدخل يدويًا' },
   flown_manual_crm: { uz: "CRM bo'yicha: {n}.", ar: 'حسب CRM: {n}.' },
   flown_crm: {
      uz: "CRM bo'yicha: shu oyda uchgan, guruhga joylashtirilgan ziyoratchilar.",
      ar: 'حسب CRM: المعتمرون الذين سافروا هذا الشهر ووُزّعوا على المجموعات.',
   },
   flown_not_configured: {
      uz: "CRM ulanmagan — sonni qo'lda kiriting. Son bo'lmaguncha KPI hisoblanmaydi.",
      ar: 'نظام CRM غير متصل — أدخل العدد يدويًا. لا يُحتسب KPI حتى يتوفر العدد.',
   },
   flown_crm_failed: {
      uz: "CRM javob bermadi — sonni qo'lda kiriting. Son bo'lmaguncha KPI hisoblanmaydi.",
      ar: 'لم يستجب نظام CRM — أدخل العدد يدويًا. لا يُحتسب KPI حتى يتوفر العدد.',
   },
   crm_flights: { uz: "CRM bo'yicha reyslar ({n})", ar: 'الرحلات حسب CRM ({n})' },
   flown_input: { uz: "Qo'lda: son", ar: 'يدويًا: العدد' },
   flown_source: { uz: 'Manba (masalan: manifest)', ar: 'المصدر (مثلًا: كشف الركاب)' },
   back_to_crm: { uz: 'CRM soniga qaytarish', ar: 'العودة إلى عدد CRM' },
   crm_used: { uz: "CRM soni qo'llanadi", ar: 'يُعتمد عدد CRM' },
   survey_title: { uz: "Ziyoratchilar so'rovi", ar: 'استبيان المعتمرين' },
   survey_share: { uz: 'ballning {n}%', ar: '{n}% من الدرجة' },
   survey_used: { uz: "{n} ta so'rov hisobga kirdi", ar: 'استبيانات محتسبة: {n}' },
   survey_of: { uz: '({n} tadan)', ar: '(من أصل {n})' },
   survey_note: {
      uz: "So'rov bo'lmasa yoki guruhning yarmidan kami so'ralgan bo'lsa, ball faqat bot va CRM bo'yicha.",
      ar: 'إذا لم يُجرَ استبيان أو شمل أقل من نصف المجموعة، تُحسب الدرجة من البوت وCRM فقط.',
   },
   staff_count: { uz: '{n} xodim', ar: 'الموظفون: {n}' },
   ball_pending: { uz: 'ball kutilmoqda', ar: 'الدرجة قيد الانتظار' },
   ball_none: { uz: "ball yo'q", ar: 'لا توجد درجة' },
   ball_q: { uz: '{ball} ball · Q {q}%', ar: 'الدرجة {ball} · Q {q}%' },
   ops_done: { uz: 'Bajarilgani', ar: 'نسبة الإنجاز' },
   ops_answered: { uz: 'Javob berilgani', ar: 'نسبة الاستجابة' },
   ops_unrepeated: { uz: 'Takrorlanmagani', ar: 'نسبة عدم التكرار' },
   ops_speed: { uz: 'Javob tezligi', ar: 'سرعة الاستجابة' },
   ops_bot: { uz: 'Bot va CRM', ar: 'البوت وCRM' },
   ops_survey: { uz: "So'rov ({city})", ar: 'الاستبيان ({city})' },
   ops_total: { uz: 'Umumiy ball', ar: 'الدرجة الإجمالية' },
   ops_kpi_share: { uz: 'KPI ning {q}%', ar: '{q}% من KPI' },
   by_hand: { uz: "(qo'lda)", ar: '(يدويًا)' },
   no_graded: { uz: "Bu oyda baholanadigan murojaat yo'q.", ar: 'لا توجد طلبات قابلة للتقييم هذا الشهر.' },
   min_sample: {
      uz: "Murojaatlar kam ({n} ta) — ballni Sifat nazorati qo'lda qo'yadi.",
      ar: 'الطلبات قليلة ({n}) — تضع مراقبة الجودة الدرجة يدويًا.',
   },
   ph_ball: { uz: 'ball', ar: 'الدرجة' },
   ph_note: { uz: 'izoh', ar: 'ملاحظة' },
   salary_base: { uz: 'Maosh bazasi', ar: 'الراتب الأساسي' },
   work_start: { uz: 'Ishga kelgan sana', ar: 'تاريخ بدء العمل' },
   work_end: { uz: 'Ishdan ketgan sana', ar: 'تاريخ ترك العمل' },
   salary_missing: {
      uz: 'Maosh bazasi kiritilmagan — oylik hisoblanmaydi.',
      ar: 'لم يُدخل الراتب الأساسي — لا يُحتسب الراتب الشهري.',
   },
   worked_days: { uz: 'Ishlagan kunlar', ar: 'أيام العمل' },
   fixed_part: { uz: 'Doimiy qism ({n}%)', ar: 'الجزء الثابت ({n}%)' },
   kpi_part: { uz: 'KPI ({n}%)', ar: 'KPI ({n}%)' },
   pending: { uz: 'kutilmoqda', ar: 'قيد الانتظار' },
   kpi_wait_ball: { uz: "Ball qo'lda qo'yilishini kutmoqda.", ar: 'بانتظار إدخال الدرجة يدويًا.' },
   kpi_wait_flown: {
      uz: "Oylik reja soni yo'q — CRM yoki qo'lda kiritilgan son kerak.",
      ar: 'لا يوجد عدد للخطة الشهرية — يلزم عدد من CRM أو مُدخل يدويًا.',
   },
   airport_line: { uz: 'Aeroport: {n} × {sum}', ar: 'المطار: {n} × {sum}' },
   ziyorat_line: { uz: 'Makka ziyorati: {n} × {sum}', ar: 'زيارات مكة: {n} × {sum}' },
   fine: { uz: 'Jarima', ar: 'غرامة' },
   fine_block: { uz: 'botni bloklagan', ar: 'حظر البوت' },
   fine_false: { uz: '{n} ta soxta «Bajarildi»', ar: '«تم التنفيذ» زائف: {n}' },
   fine_abuse: { uz: 'ketma-ket asossiz «Xatolik»', ar: '«خطأ» متكرر بلا مبرر' },
   adjust: { uz: "Qo'lda tuzatish", ar: 'تعديل يدوي' },
   ph_adjust: { uz: '± SAR', ar: '± ريال' },
   ph_reason: { uz: 'sababi (majburiy)', ar: 'السبب (إلزامي)' },
   total: { uz: 'Jami', ar: 'الإجمالي' },
   no_staff: {
      uz: "Tashkiliy guruh ro'yxatida faol xodim yo'q.",
      ar: 'لا يوجد موظفون نشطون في قائمة الفريق التنظيمي.',
   },
   sub_requests: { uz: '{n} murojaat', ar: 'الطلبات: {n}' },
   sub_trips: { uz: '{n} chiqish', ar: 'المهام الميدانية: {n}' },
   sub_no_salary: { uz: 'maosh kiritilmagan', ar: 'الراتب غير مُدخل' },

   // Qiymatlar
   values_failed: { uz: 'Qiymatlar yuklanmadi.', ar: 'تعذّر تحميل القيم.' },
   value_in_month: { uz: '{m}da: {v}', ar: 'في {m}: {v}' },
   last_change: { uz: "Oxirgi o'zgartirish: {by}", ar: 'آخر تعديل: {by}' },
   ladder_ball: { uz: '{n} ball', ar: '{n} درجة' },
   tiers: {
      uz: '{q3}–100 ball → {p3}% · {q2}–{q3} → {p2}% · {q1}–{q2} → {p1}% · {q1} dan past → 0',
      ar: '{q3}–100 درجة → {p3}% · {q2}–{q3} → {p2}% · {q1}–{q2} → {p1}% · أقل من {q1} → 0',
   },
   enter_number: { uz: 'Son kiriting', ar: 'أدخل رقمًا' },
   saved_from: { uz: 'Saqlandi — {m}dan', ar: 'تم الحفظ — اعتبارًا من {m}' },

   // Chiqishlar
   trip_add_title: { uz: "Chiqish qo'shish", ar: 'إضافة مهمة ميدانية' },
   trip_date: { uz: 'Sana', ar: 'التاريخ' },
   trip_kind: { uz: 'Turi', ar: 'النوع' },
   trip_person: { uz: 'Xodim', ar: 'الموظف' },
   pick: { uz: '— tanlang —', ar: '— اختر —' },
   trip_status: { uz: 'Holat', ar: 'الحالة' },
   trip_instead: { uz: "O'rniga borgan", ar: 'من ذهب بدلًا منه' },
   trip_note: { uz: 'Izoh (ixtiyoriy)', ar: 'ملاحظة (اختياري)' },
   add: { uz: "Qo'shish", ar: 'إضافة' },
   added: { uz: "Qo'shildi", ar: 'تمت الإضافة' },
   trips_paid: { uz: "{m} — to'lanadigan chiqishlar", ar: '{m} — المهام المدفوعة' },
   chip_airport: { uz: 'Aeroport {n}', ar: 'المطار {n}' },
   chip_ziyorat: { uz: 'Ziyorat {n}', ar: 'الزيارات {n}' },
   trips_title: { uz: 'Chiqishlar', ar: 'المهام الميدانية' },
   trips_count: { uz: '{n} ta', ar: 'العدد: {n}' },
   trips_none: { uz: 'Bu oyda chiqish yozilmagan.', ar: 'لم تُسجَّل مهام ميدانية هذا الشهر.' },
   remove: { uz: "O'chirish", ar: 'حذف' },
   removed: { uz: "O'chirildi", ar: 'تم الحذف' },
   remove_title: { uz: "Chiqishni o'chirish", ar: 'حذف المهمة الميدانية' },
   remove_ask: { uz: "{what} — o'chirilsinmi?", ar: '{what} — هل تريد الحذف؟' },
   who_instead: { uz: "O'rniga kim bordi?", ar: 'من ذهب بدلًا منه؟' },
   unpaid: { uz: "to'lanmaydi", ar: 'لا تُدفع' },
   paid_to: { uz: "{who}ga to'lanadi", ar: 'تُدفع لـ{who}' },
   pick_instead: { uz: "o'rniga borganni tanlang", ar: 'اختر من ذهب بدلًا منه' },
   paid: { uz: "to'lanadi", ar: 'تُدفع' },
   kind_airport: { uz: 'Aeroport', ar: 'المطار' },
   kind_ziyorat: { uz: 'Makka ziyorati', ar: 'زيارات مكة' },
   st_bordi: { uz: 'Bordi', ar: 'ذهب' },
   st_bormadi: { uz: 'Bormadi', ar: 'لم يذهب' },
   st_almashtirildi: { uz: 'Almashtirildi', ar: 'استُبدل' },

   // The KPI tab's own line over the board
   month_note: {
      uz: "{m} — to'liq kalendar oy. Bu bo'lim yuqoridagi davr tanloviga bog'liq emas.",
      ar: '{m} — شهر ميلادي كامل. لا يتأثر هذا القسم باختيار الفترة في الأعلى.',
   },
} as const satisfies Record<string, { uz: string; ar: string }>

export type CrewTextKey = keyof typeof TEXT

/** One phrase in the reader's language, `{x}` filled from `vars`. */
export function tr(key: CrewTextKey, vars: Record<string, string | number> = {}): string {
   const s: string = TEXT[key][crewLang.value]
   return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

export const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul',
   'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
// The Gregorian month names used in Saudi Arabia.
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو',
   'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export function monthName(p: string): string {
   const [y, m] = (p || '').split('-')
   const i = Number(m) - 1
   if (!(i >= 0 && i < 12)) return p
   return crewLang.value === 'ar' ? `${AR_MONTHS[i]} ${y}` : `${UZ_MONTHS[i]} ${y}`
}

/** A count in the reader's grouping: «1 600» in Uzbek, «1,600» in Arabic. Not a space in
 *  Arabic: inside right-to-left text the browser splits «1 600» at the space and draws it
 *  as «600 1»; a comma keeps the number whole. */
export function num(n: number): string {
   return crewLang.value === 'ar' ? n.toLocaleString('en-US') : n.toLocaleString('ru-RU')
}

/** «6 000 SAR» — the thin grouping the rest of the panel uses for so'm; «6,000 ريال» in
 *  Arabic. */
export function sar(n: number | null | undefined): string {
   if (n === null || n === undefined) return '—'
   const sign = n < 0 ? '−' : ''
   // Isolated left-to-right: in Arabic text a bare «−15» is drawn as «15−».
   if (crewLang.value === 'ar') return `\u2066${sign}${num(Math.abs(n))}\u2069 ريال`
   return `${sign}${Math.abs(n).toLocaleString('ru-RU').replace(/ /g, ' ')} SAR`
}

/** A decimal in the reader's notation: «62,5» in Uzbek, «62.5» in Arabic. */
export function dec(v: number): string {
   const s = String(v)
   return crewLang.value === 'ar' ? s : s.replace('.', ',')
}

export function pct(v: number | null | undefined): string {
   if (v === null || v === undefined) return '—'
   return `${dec(Math.round(v * 1000) / 10)}%`
}

/** A duration in the reader's language — `dur` from shared.ts, with Arabic units. */
export function durL(s: number | null): string {
   if (s === null || s === undefined) return '—'
   const ar = crewLang.value === 'ar'
   if (s < 60) return `${Math.round(s)} ${ar ? 'ث' : 'soniya'}`
   const m = Math.floor(s / 60)
   if (m < 60) return `${m} ${ar ? 'د' : 'daq'}`
   const h = Math.floor(m / 60)
   const rem = m % 60
   const hs = `${h} ${ar ? 'س' : 'soat'}`
   return rem ? `${hs} ${rem} ${ar ? 'د' : 'daq'}` : hs
}

export function personName(p: { name: string | null; username: string | null }): string {
   return p.name || p.username || '—'
}

export function cityName(c?: string | null): string {
   const ar = crewLang.value === 'ar'
   return c === 'makka' ? (ar ? 'مكة' : 'Makka') : c === 'madina' ? (ar ? 'المدينة' : 'Madina') : '—'
}

export const TRIP_KINDS = [
   { value: 'airport', key: 'kind_airport' },
   { value: 'ziyorat', key: 'kind_ziyorat' },
] as const

export const TRIP_STATUSES = [
   { value: 'bordi', key: 'st_bordi' },
   { value: 'bormadi', key: 'st_bormadi' },
   { value: 'almashtirildi', key: 'st_almashtirildi' },
] as const

/** The API's own refusal text, or a plain fallback. */
export function apiError(e: any, fallback?: string): string {
   const d = e?.response?.data?.detail
   return typeof d === 'string' ? d : (fallback ?? (crewLang.value === 'ar' ? 'لم يُحفظ' : 'Saqlanmadi'))
}

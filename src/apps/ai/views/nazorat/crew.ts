/** Ishchi guruh KPI — the shapes the crew endpoints answer and the few helpers the three
 *  crew screens share (the board, its Qiymatlar and the trips). All the arithmetic is
 *  the server's (`bot/services/crew_kpi.py`); nothing here computes pay. */

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

export const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul',
   'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

export function monthName(p: string): string {
   const [y, m] = (p || '').split('-')
   const i = Number(m) - 1
   return i >= 0 && i < 12 ? `${UZ_MONTHS[i]} ${y}` : p
}

/** «6 000 SAR» — the thin grouping the rest of the panel uses for so'm. */
export function sar(n: number | null | undefined): string {
   if (n === null || n === undefined) return '—'
   const sign = n < 0 ? '−' : ''
   return `${sign}${Math.abs(n).toLocaleString('ru-RU').replace(/ /g, ' ')} SAR`
}

export function pct(v: number | null | undefined): string {
   if (v === null || v === undefined) return '—'
   return `${Math.round(v * 1000) / 10}%`.replace('.', ',')
}

export function personName(p: { name: string | null; username: string | null }): string {
   return p.name || p.username || '—'
}

export function cityName(c?: string | null): string {
   return c === 'makka' ? 'Makka' : c === 'madina' ? 'Madina' : '—'
}

export const TRIP_KINDS = [
   { value: 'airport', label: 'Aeroport' },
   { value: 'ziyorat', label: 'Makka ziyorati' },
] as const

export const TRIP_STATUSES = [
   { value: 'bordi', label: 'Bordi' },
   { value: 'bormadi', label: 'Bormadi' },
   { value: 'almashtirildi', label: 'Almashtirildi' },
] as const

/** The API's own refusal text, or a plain fallback. */
export function apiError(e: any, fallback = 'Saqlanmadi'): string {
   const d = e?.response?.data?.detail
   return typeof d === 'string' ? d : fallback
}

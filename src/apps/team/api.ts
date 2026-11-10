import { teamApi as api } from '../../api'

// Everything «Etihad Jamoasi» asks of the Turon bot's API, in one place. The screens
// keep their own state; these only talk to the server and return its rows.

export interface Trip {
  id: number
  trip_id: string
  name: string
  group_invite_link: string | null
  group_chat_id: string | null
  topic_id: number | null
  topic_id_2: number | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  registration_open: boolean
  created_at: string
  participant_count?: number
}

export interface TripCounts { participants: number; posts: number; pending: number }

/** null = every topic of the group, 1 / 2 = that topic, 0 = the pilgrim cabinet only. */
export type TopicSlot = null | 0 | 1 | 2
export const CABINET_ONLY: TopicSlot = 0

export interface Post {
  id: number
  trip_id?: string
  template_id?: number
  day_number: number
  message_text: string
  media_path: string | null
  media_type: string | null
  scheduled_time: string
  send_mode: 'scheduled' | 'now'
  pin_message: boolean
  is_active: boolean
  topic_slot: TopicSlot
  /** A template post: null = follow the template's own switch. */
  to_cabinet: boolean | null
  poll_options: string | null
  sort_order: number
  // trip posts only
  is_sent?: boolean
  delay_minutes?: number
  cabinet_sent_at?: string | null
}

export interface PostButton { position: number; name: string; link: string | null; is_skip?: boolean }

export interface Template {
  id: number
  name: string
  description: string | null
  to_cabinet: boolean | null
  created_at: string
  post_count?: number
}

export interface Participant {
  id: number
  user_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  respondent_name?: string | null
  phone_number: string | null
  registered_at: string
}

export interface PollQuestion {
  id: number
  question_text: string
  question_type: 'rating' | 'text' | 'choice' | 'multiple_choice'
  options: string | null
  order_index: number
}

export interface PollResponse {
  id: number
  user_id: number
  question_id: number
  question_text?: string
  response_text: string | null
  response_rating: number | null
  submitted_at: string
  first_name?: string | null
  last_name?: string | null
  respondent_name?: string | null
  username?: string | null
}

/** What a selection did: the ids changed, and the ones skipped with the reason. */
export interface BulkResult { done: number[]; skipped: { id: number; reason: string }[] }

export type PostKind = 'trip' | 'template'
export type PostFields = Partial<Pick<Post,
  'day_number' | 'message_text' | 'scheduled_time' | 'send_mode' | 'topic_slot' | 'to_cabinet' | 'pin_message' | 'is_active'>>

/** The server's own words for a refused request, or a plain fallback. */
export function errorText(e: unknown, fallback = 'Xatolik yuz berdi'): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && detail ? detail : fallback
}

// ── trips ────────────────────────────────────────────────────────────────────────
export const trips = {
  active: async () => (await api.get<Trip[]>('/api/trips')).data,
  archived: async () => (await api.get<Trip[]>('/api/trips/inactive')).data,
  counts: async () => (await api.get<Record<string, TripCounts>>('/api/trips/counts')).data,
  get: async (tripId: string) => (await api.get<Trip>(`/api/trips/${tripId}`)).data,
  create: async (body: Partial<Trip>) => (await api.post<Trip>('/api/trips', body)).data,
  update: async (tripId: string, body: Partial<Trip>) => (await api.put<Trip>(`/api/trips/${tripId}`, body)).data,
  setRegistration: async (tripId: string, open: boolean) =>
    (await api.put<Trip>(`/api/trips/${tripId}/registration`, { registration_open: open })).data,
  setActive: async (tripId: string, active: boolean) =>
    (await api.put<Trip>(`/api/trips/${tripId}/status`, { is_active: active })).data,
  remove: async (tripId: string) => { await api.delete(`/api/trips/${tripId}`) },
  participants: async (tripId: string) => (await api.get<Participant[]>(`/api/trips/${tripId}/users`)).data,
  responses: async (tripId: string) => (await api.get<PollResponse[]>(`/api/trips/${tripId}/responses`)).data,
}

// ── posts of a trip or of a template, through the same calls ─────────────────────
const base = (kind: PostKind) => (kind === 'trip' ? '/api/posts' : '/api/templates/posts')

export const posts = {
  list: async (kind: PostKind, ownerId: string | number) =>
    (await api.get<Post[]>(kind === 'trip' ? `/api/trips/${ownerId}/posts` : `/api/templates/${ownerId}/posts`)).data,
  create: async (kind: PostKind, ownerId: string | number, body: PostFields) =>
    (await api.post<Post>(kind === 'trip' ? `/api/trips/${ownerId}/posts` : `/api/templates/${ownerId}/posts`, body)).data,
  update: async (kind: PostKind, id: number, body: PostFields) =>
    (await api.put<Post>(`${base(kind)}/${id}`, body)).data,
  bulk: async (kind: PostKind, body: { ids: number[]; action: 'set' | 'shift' | 'reset_delay' | 'delete'; fields?: PostFields; minutes?: number }) =>
    (await api.post<BulkResult>(`${base(kind)}/bulk`, body)).data,
  buttons: async (kind: PostKind, id: number) => (await api.get<PostButton[]>(`${base(kind)}/${id}/buttons`)).data,
  saveButtons: async (kind: PostKind, id: number, buttons: PostButton[]) =>
    (await api.post<PostButton[]>(`${base(kind)}/${id}/buttons`, buttons)).data,
  sendNow: async (id: number) => (await api.post<Post>(`/api/posts/${id}/send-now`)).data,
}

// ── templates ────────────────────────────────────────────────────────────────────
export const templates = {
  list: async () => (await api.get<Template[]>('/api/templates')).data,
  create: async (body: { name: string; description?: string }) => (await api.post<Template>('/api/templates', body)).data,
  update: async (id: number, body: Partial<Template>) => (await api.put<Template>(`/api/templates/${id}`, body)).data,
  copy: async (id: number, name: string) => (await api.post<Template>(`/api/templates/${id}/copy`, { name })).data,
  remove: async (id: number) => { await api.delete(`/api/templates/${id}`) },
  importTo: async (id: number, tripId: string) => { await api.post(`/api/templates/${id}/import/${tripId}`) },
}

// ── the feedback questionnaire ───────────────────────────────────────────────────
export const questions = {
  list: async () => (await api.get<PollQuestion[]>('/api/polls')).data,
  create: async (body: Partial<PollQuestion>) => (await api.post<PollQuestion>('/api/polls', body)).data,
  update: async (id: number, body: Partial<PollQuestion>) => (await api.put<PollQuestion>(`/api/polls/${id}`, body)).data,
  remove: async (id: number) => { await api.delete(`/api/polls/${id}`) },
}

export const exportSheet = async (path: string) => { await api.post(`/api/export/${path}`) }

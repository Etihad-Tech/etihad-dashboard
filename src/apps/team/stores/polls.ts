import { defineStore } from 'pinia'
import { ref } from 'vue'
import { teamApi as api } from '../../../api'

export interface PollQuestion {
  id: number
  question_text: string
  question_type: 'rating' | 'text' | 'choice' | 'multiple_choice'
  options: string | null
  is_active: boolean
  order_index: number
}

export interface PollResponse {
  id: number
  user_id: number
  trip_id: string
  question_id: number
  response_text: string | null
  response_rating: number | null
  submitted_at: string
  username?: string
  first_name?: string
  question_text?: string
}

export const usePollsStore = defineStore('team-polls', () => {
  const questions = ref<PollQuestion[]>([])
  const responses = ref<PollResponse[]>([])
  const loading = ref(false)

  async function fetchQuestions() {
    loading.value = true
    try {
      const { data } = await api.get('/api/polls')
      questions.value = data
    } finally {
      loading.value = false
    }
  }

  async function createQuestion(payload: Partial<PollQuestion>) {
    const { data } = await api.post('/api/polls', payload)
    questions.value.push(data)
    return data
  }

  async function updateQuestion(id: number, payload: Partial<PollQuestion>) {
    const { data } = await api.put(`/api/polls/${id}`, payload)
    const idx = questions.value.findIndex(q => q.id === id)
    if (idx !== -1) questions.value[idx] = data
    return data
  }

  async function deleteQuestion(id: number) {
    await api.delete(`/api/polls/${id}`)
    questions.value = questions.value.filter(q => q.id !== id)
  }

  async function fetchResponses(tripId: string) {
    loading.value = true
    try {
      const { data } = await api.get(`/api/trips/${tripId}/responses`)
      responses.value = data
    } finally {
      loading.value = false
    }
  }

  async function sendPoll(tripId: string) {
    await api.post(`/api/trips/${tripId}/send-poll`)
  }

  return {
    questions, responses, loading,
    fetchQuestions, createQuestion, updateQuestion, deleteQuestion,
    fetchResponses, sendPoll,
  }
})

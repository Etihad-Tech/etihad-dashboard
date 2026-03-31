<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">So'rovnoma savollari</h2>
        <button
          @click="modalOpen = true"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi savol
        </button>
      </div>

      <div class="flex gap-2 animate-fade-up" style="animation-delay: 30ms">
        <router-link
          to="/team/polls"
          class="px-4 py-1.5 rounded-2xl text-sm font-medium border"
          :class="!isResponses ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
        >
          Savollar
        </router-link>
        <router-link
          to="/team/polls/responses"
          class="px-4 py-1.5 rounded-2xl text-sm font-medium border"
          :class="isResponses ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
        >
          Javoblar
        </router-link>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="store.questions.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 60ms">
        <font-awesome-icon icon="chart-pie" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Savollar yo'q</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(q, i) in store.questions"
          :key="q.id"
          class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{{ q.order_index + 1 }}</span>
                <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="typeClass(q.question_type)">
                  {{ typeLabel(q.question_type) }}
                </span>
              </div>
              <p class="text-sm font-medium text-gray-900 mt-2">{{ q.question_text }}</p>
              <p v-if="q.options" class="text-xs text-gray-400 mt-1">Variantlar: {{ q.options }}</p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                @click="startEdit(q)"
                class="px-2 py-1.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
              </button>
              <button
                @click="deleteId = q.id"
                class="px-2 py-1.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
              >
                <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ editId ? 'Savolni tahrirlash' : 'Yangi savol' }}</h3>
          </div>
          <form @submit.prevent="saveQuestion" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Savol matni</label>
              <textarea v-model="form.question_text" rows="3" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Savol turi</label>
              <select v-model="form.question_type" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm">
                <option value="rating">Baho (1-5)</option>
                <option value="text">Matn</option>
                <option value="choice">Tanlov</option>
                <option value="multiple_choice">Ko'p tanlov</option>
              </select>
            </div>
            <div v-if="form.question_type === 'choice' || form.question_type === 'multiple_choice'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Variantlar (JSON massiv)</label>
              <input v-model="form.options" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder='["Variant 1", "Variant 2"]' />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tartib raqami</label>
              <input v-model.number="form.order_index" type="number" min="0" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" />
            </div>
          </form>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl">Bekor qilish</button>
            <button @click="saveQuestion" :disabled="!form.question_text || saving" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl">
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmModal
      :visible="!!deleteId"
      title="Savolni o'chirish"
      message="Savol va barcha javoblar o'chiriladi"
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../../components/AppLayout.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import { usePollsStore, type PollQuestion } from '../../stores/polls'

const route = useRoute()
const store = usePollsStore()
const isResponses = route.path.includes('/responses')

const modalOpen = ref(false)
const saving = ref(false)
const editId = ref<number | null>(null)
const deleteId = ref<number | null>(null)

const form = reactive({
  question_text: '',
  question_type: 'rating' as string,
  options: '',
  order_index: 0,
})

function typeLabel(t: string) {
  const map: Record<string, string> = { rating: 'Baho', text: 'Matn', choice: 'Tanlov', multiple_choice: "Ko'p tanlov" }
  return map[t] || t
}

function typeClass(t: string) {
  const map: Record<string, string> = {
    rating: 'bg-amber-50 text-amber-600',
    text: 'bg-blue-50 text-blue-600',
    choice: 'bg-emerald-50 text-emerald-600',
    multiple_choice: 'bg-purple-50 text-purple-600',
  }
  return map[t] || 'bg-gray-100 text-gray-500'
}

function startEdit(q: PollQuestion) {
  editId.value = q.id
  Object.assign(form, {
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options || '',
    order_index: q.order_index,
  })
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editId.value = null
  Object.assign(form, { question_text: '', question_type: 'rating', options: '', order_index: 0 })
}

async function saveQuestion() {
  if (!form.question_text) return
  saving.value = true
  try {
    const payload = {
      question_text: form.question_text,
      question_type: form.question_type as PollQuestion['question_type'],
      options: form.options || null,
      order_index: form.order_index,
    }
    if (editId.value) {
      await store.updateQuestion(editId.value, payload)
    } else {
      await store.createQuestion(payload)
    }
    closeModal()
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteId.value) return
  await store.deleteQuestion(deleteId.value)
  deleteId.value = null
}

onMounted(() => store.fetchQuestions())
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active > div, .modal-leave-active > div { transition: opacity 0.2s ease, transform 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div, .modal-leave-to > div { opacity: 0; transform: scale(0.95) translateY(10px); }
</style>

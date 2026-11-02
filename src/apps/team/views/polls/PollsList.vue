<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">So'rovnomalar</h1>
        <button class="btn btn-primary" @click="modalOpen = true">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi savol
        </button>
      </div>

      <div class="seg">
        <router-link to="/team/polls" class="seg-btn inline-flex items-center" :class="{ 'seg-btn-on': !isResponses }">Savollar</router-link>
        <router-link to="/team/polls/responses" class="seg-btn inline-flex items-center" :class="{ 'seg-btn-on': isResponses }">Javoblar</router-link>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="store.questions.length === 0" class="card empty">Savollar yo'q</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="q in store.questions" :key="q.id" class="flex items-start gap-3 px-4 py-3">
          <span class="w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
            {{ q.order_index + 1 }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">{{ q.question_text }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="chip" :class="typeClass(q.question_type)">{{ typeLabel(q.question_type) }}</span>
              <span v-if="q.options" class="text-xs text-gray-500 truncate">{{ q.options }}</span>
            </div>
          </div>
          <button class="icon-btn" title="Tahrirlash" @click="startEdit(q)">
            <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
          </button>
          <button class="icon-btn icon-btn-danger" title="O'chirish" @click="deleteId = q.id">
            <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="editId ? 'Savolni tahrirlash' : 'Yangi savol'" @close="closeModal">
      <form class="space-y-4" @submit.prevent="saveQuestion">
        <div>
          <label class="label">Savol</label>
          <textarea v-model="form.question_text" rows="3" required class="input resize-y"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Turi</label>
            <select v-model="form.question_type" class="input">
              <option value="rating">Baho (1-5)</option>
              <option value="text">Matn</option>
              <option value="choice">Tanlov</option>
              <option value="multiple_choice">Ko'p tanlov</option>
            </select>
          </div>
          <div>
            <label class="label">Tartib</label>
            <input v-model.number="form.order_index" type="number" min="0" class="input" />
          </div>
        </div>
        <div v-if="form.question_type === 'choice' || form.question_type === 'multiple_choice'">
          <label class="label">Variantlar</label>
          <input v-model="form.options" class="input" placeholder='["Variant 1", "Variant 2"]' />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="!form.question_text || saving" @click="saveQuestion">
          {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmModal
      :visible="!!deleteId"
      title="Savolni o'chirish"
      message="Javoblari ham o'chadi"
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import BaseModal from '../../../../components/BaseModal.vue'
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
    rating: 'chip-amber',
    text: 'chip-blue',
    choice: 'chip-green',
    multiple_choice: 'chip-violet',
  }
  return map[t] || 'chip-gray'
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


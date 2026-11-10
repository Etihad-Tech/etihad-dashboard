<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">So'rovnoma savollari</h1>
        <button class="btn btn-primary" @click="openForm(null)">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />Savol
        </button>
      </div>

      <div v-if="loading" class="card divide-y divide-gray-100">
        <div v-for="i in 4" :key="i" class="px-4 py-4"><div class="h-3.5 w-64 rounded bg-gray-100"></div></div>
      </div>
      <p v-else-if="loadError" class="card empty text-rose-600">{{ loadError }}</p>
      <div v-else-if="list.length === 0" class="card empty">Savollar yo'q</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="(q, i) in list" :key="q.id" class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors" @click="openForm(q)">
          <span class="w-6 shrink-0 text-sm text-gray-400 tabular-nums pt-px">{{ i + 1 }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900">{{ q.question_text }}</p>
            <p v-if="optionsOf(q).length" class="text-xs text-gray-400 mt-0.5 truncate">{{ optionsOf(q).join(' · ') }}</p>
          </div>
          <span class="chip chip-gray shrink-0">{{ TYPE_LABEL[q.question_type] }}</span>
        </div>
      </div>
    </div>

    <BaseModal :open="formOpen" :title="editing ? 'Savolni tahrirlash' : 'Yangi savol'" @close="formOpen = false">
      <form id="q-form" class="space-y-4" @submit.prevent="save">
        <div>
          <label class="label" for="q-text">Savol</label>
          <textarea id="q-text" v-model="draft.question_text" rows="3" class="input" required></textarea>
        </div>
        <div>
          <span class="label">Javob turi</span>
          <div class="seg flex-wrap">
            <button v-for="(label, type) in TYPE_LABEL" :key="type" type="button" class="seg-btn" :class="{ 'seg-btn-on': draft.question_type === type }"
              @click="draft.question_type = type">{{ label }}</button>
          </div>
        </div>
        <div v-if="hasOptions">
          <span class="label">Variantlar</span>
          <div class="space-y-2">
            <div v-for="(_, i) in draft.options" :key="i" class="flex items-center gap-2">
              <input v-model="draft.options[i]" class="input input-sm" :placeholder="`${i + 1}-variant`" />
              <button type="button" class="icon-btn icon-btn-danger" title="Olib tashlash" @click="draft.options.splice(i, 1)">
                <font-awesome-icon icon="xmark" class="w-3.5 h-3.5" />
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-ghost -ml-2" @click="draft.options.push('')">
              <font-awesome-icon icon="plus" class="w-3 h-3" />Variant
            </button>
          </div>
        </div>
        <p v-if="formError" class="error-text">{{ formError }}</p>
      </form>
      <template #footer>
        <button v-if="editing" type="button" class="btn btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700 mr-auto" @click="remove">
          <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />O'chirish
        </button>
        <button type="button" class="btn btn-secondary" @click="formOpen = false">Bekor qilish</button>
        <button type="submit" form="q-form" class="btn btn-primary" :disabled="busy">Saqlash</button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppShell from '../../../../components/AppShell.vue'
import BaseModal from '../../../../components/BaseModal.vue'
import { useConfirm } from '../../../../composables/useConfirm'
import { useToast } from '../../../../composables/useToast'
import { errorText, questions as questionsApi, type PollQuestion } from '../../api'

// The questions pilgrims are asked after the trip. The answers are read on each trip's
// own page («Javoblar»).
const toast = useToast()
const { confirm } = useConfirm()

type QType = PollQuestion['question_type']
const TYPE_LABEL: Record<QType, string> = { rating: 'Baho 1–5', text: 'Matn', choice: 'Bitta tanlov', multiple_choice: "Bir nechta tanlov" }

const list = ref<PollQuestion[]>([])
const loading = ref(true)
const loadError = ref('')
const formOpen = ref(false)
const editing = ref<PollQuestion | null>(null)
const draft = reactive({ question_text: '', question_type: 'rating' as QType, options: [] as string[] })
const formError = ref('')
const busy = ref(false)

const hasOptions = computed(() => draft.question_type === 'choice' || draft.question_type === 'multiple_choice')

function optionsOf(q: PollQuestion): string[] {
  if (!q.options) return []
  try {
    const v = JSON.parse(q.options)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

async function load() {
  try {
    list.value = (await questionsApi.list()).slice().sort((a, b) => a.order_index - b.order_index || a.id - b.id)
  } catch (e) {
    loadError.value = errorText(e, "Savollarni yuklab bo'lmadi")
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openForm(q: PollQuestion | null) {
  editing.value = q
  draft.question_text = q?.question_text ?? ''
  draft.question_type = q?.question_type ?? 'rating'
  draft.options = q ? optionsOf(q) : []
  if (!draft.options.length) draft.options = ['', '']
  formError.value = ''
  formOpen.value = true
}

async function save() {
  const options = draft.options.map(o => o.trim()).filter(Boolean)
  if (hasOptions.value && options.length < 2) {
    formError.value = 'Kamida 2 ta variant kerak'
    return
  }
  busy.value = true
  const body = {
    question_text: draft.question_text.trim(),
    question_type: draft.question_type,
    options: hasOptions.value ? JSON.stringify(options) : null,
  }
  try {
    if (editing.value) await questionsApi.update(editing.value.id, body)
    else await questionsApi.create({ ...body, order_index: list.value.length })
    formOpen.value = false
    toast.success('Saqlandi')
    await load()
  } catch (e) {
    formError.value = errorText(e, "Saqlab bo'lmadi")
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!editing.value || !(await confirm({ title: "Savolni o'chirish", message: "Bu savolga berilgan javoblar ham o'chadi" }))) return
  try {
    await questionsApi.remove(editing.value.id)
    formOpen.value = false
    toast.success("O'chirildi")
    await load()
  } catch (e) {
    toast.error(errorText(e))
  }
}
</script>

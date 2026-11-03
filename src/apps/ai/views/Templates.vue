<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Maqtov shablonlari</h1>
        <button class="btn btn-primary" @click="openAdd">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Qo'shish
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="templates.length === 0" class="card empty">Shablonlar yo'q</div>

      <div v-else-if="missingScripts.length"
        class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <font-awesome-icon icon="triangle-exclamation" class="w-3.5 h-3.5 shrink-0" />
        <span>Faol shablon yo'q: <b>{{ missingScripts.map(scriptLabel).join(', ') }}</b></span>
      </div>

      <div v-if="templates.length" class="card divide-y divide-gray-100">
        <div v-for="tpl in templates" :key="tpl.id" class="flex items-start gap-3 px-4 py-3">
          <div class="min-w-0 flex-1" :class="{ 'opacity-50': !tpl.is_active }">
            <span class="chip mb-1.5" :class="scriptClass(tpl.script)">
              <font-awesome-icon icon="language" class="w-3 h-3" />
              {{ scriptLabel(tpl.script) }}
            </span>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ tpl.text }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <ToggleSwitch class="mr-1" :model-value="tpl.is_active" :title="tpl.is_active ? 'Faol' : 'Nofaol'"
              @update:model-value="toggleActive(tpl)" />
            <button class="icon-btn" title="Tahrirlash" @click="openEdit(tpl)">
              <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
            </button>
            <button class="icon-btn icon-btn-danger" title="O'chirish" @click="askDelete(tpl.id)">
              <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="modalEditId ? 'Tahrirlash' : 'Yangi shablon'" @close="closeModal">
      <textarea v-model="modalText" rows="5" class="input resize-y" placeholder="Shablon matni"></textarea>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="!modalText.trim() || saving" @click="saveModal">
          {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import BaseModal from '../../../components/BaseModal.vue'
import ToggleSwitch from '../../../components/ToggleSwitch.vue'
import api from '../../../api'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

interface Template {
  id: number
  text: string
  is_active: boolean
  // Which language the text is WRITTEN in, as the bot reads it: it only answers a
  // pilgrim with a shablon in the language that pilgrim wrote in.
  script: 'latin' | 'uzbek_cyrillic' | 'russian'
  created_at: string | null
}

const SCRIPTS = ['latin', 'uzbek_cyrillic', 'russian'] as const

const SCRIPT_LABELS: Record<string, string> = {
  latin: "O'zbekcha (lotin)",
  uzbek_cyrillic: 'Ўзбекча (кирилл)',
  russian: 'Русский',
}

const SCRIPT_CLASSES: Record<string, string> = {
  latin: 'chip-blue',
  uzbek_cyrillic: 'chip-green',
  russian: 'chip-violet',
}

const scriptLabel = (s: string) => SCRIPT_LABELS[s] || s
const scriptClass = (s: string) => SCRIPT_CLASSES[s] || 'chip-gray'

const templates = ref<Template[]>([])
const loading = ref(false)
const saving = ref(false)

/** Languages with no ACTIVE shablon. A pilgrim writing in one of these gets the short
 *  generic reply at the end of the trip instead of the company's closing message — which
 *  is the right outcome, but it is a gap the office should be able to see and close. */
const missingScripts = computed(() =>
  SCRIPTS.filter(s => !templates.value.some(t => t.is_active && t.script === s)),
)

const modalOpen = ref(false)
const modalText = ref('')
const modalEditId = ref<number | null>(null)

function openAdd() {
  modalEditId.value = null
  modalText.value = ''
  modalOpen.value = true
}

function openEdit(tpl: Template) {
  modalEditId.value = tpl.id
  modalText.value = tpl.text
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalText.value = ''
  modalEditId.value = null
}

async function saveModal() {
  if (!modalText.value.trim()) return
  saving.value = true
  try {
    if (modalEditId.value) {
      const { data } = await api.put(`/templates/${modalEditId.value}`, { text: modalText.value.trim() })
      const idx = templates.value.findIndex(t => t.id === modalEditId.value)
      if (idx !== -1) templates.value[idx] = data
    } else {
      const { data } = await api.post('/templates', { text: modalText.value.trim() })
      templates.value.unshift(data)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch {
    toast.error('Saqlanmadi')
  }
  finally { saving.value = false }
}

async function loadTemplates() {
  loading.value = true
  try {
    const { data } = await api.get('/templates')
    templates.value = data
  } catch {
    templates.value = []
  } finally {
    loading.value = false
  }
}

async function toggleActive(tpl: Template) {
  try {
    const { data } = await api.put(`/templates/${tpl.id}`, { is_active: !tpl.is_active })
    const idx = templates.value.findIndex(t => t.id === tpl.id)
    if (idx !== -1) templates.value[idx] = data
  } catch { /* ignore */ }
}

const { confirm } = useConfirm()
const toast = useToast()

async function askDelete(id: number) {
  if (!(await confirm({ title: "Shablonni o'chirish" }))) return
  try {
    await api.delete(`/templates/${id}`)
    templates.value = templates.value.filter(t => t.id !== id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  }
}

onMounted(loadTemplates)
</script>


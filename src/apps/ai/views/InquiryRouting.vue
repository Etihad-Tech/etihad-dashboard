<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Murojaat yo'naltirish</h1>
        <button class="btn btn-primary" @click="openAdd()">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Qo'shish
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else class="grid gap-4 lg:grid-cols-2 items-start">
        <div v-for="cat in categories" :key="cat.key" class="card overflow-hidden">
          <div class="flex items-center gap-2 pl-4 pr-2 h-12 border-b border-gray-100">
            <span class="section-title truncate">{{ cat.label }}</span>
            <span class="chip chip-gray">{{ byCategory(cat.key).length }}</span>
            <button class="icon-btn ml-auto" title="Qo'shish" @click="openAdd(cat.key)">
              <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
            </button>
          </div>

          <div v-if="byCategory(cat.key).length === 0" class="px-4 py-3 text-sm text-gray-400">
            Biriktirilmagan
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div v-for="t in byCategory(cat.key)" :key="t.id" class="flex items-center gap-3 px-4 py-2.5">
              <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"
                :class="{ 'opacity-50': !t.is_active }">
                <font-awesome-icon icon="user" class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0 flex-1" :class="{ 'opacity-50': !t.is_active }">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ t.username || (t.name ? t.name : ('ID ' + t.telegram_id)) }}
                </p>
                <p v-if="(t.username && t.name) || t.telegram_id" class="text-xs text-gray-500 truncate">
                  {{ [t.username && t.name ? t.name : '', t.telegram_id ? 'ID ' + t.telegram_id : ''].filter(Boolean).join(' · ') }}
                </p>
              </div>
              <ToggleSwitch :model-value="t.is_active" :title="t.is_active ? 'Faol' : 'Nofaol'" @update:model-value="toggleActive(t)" />
              <button class="icon-btn" title="Tahrirlash" @click="openEdit(t)">
                <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
              </button>
              <button class="icon-btn icon-btn-danger" title="O'chirish" @click="askDelete(t.id)">
                <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="modalEditId ? 'Tahrirlash' : 'Yangi mas\'ul'" @close="closeModal">
      <div>
        <label class="label">Murojaat turi</label>
        <select v-model="form.category" class="input">
          <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
        </select>
      </div>
      <div>
        <label class="label">Username</label>
        <input v-model="form.username" type="text" placeholder="@username" class="input" />
      </div>
      <div>
        <label class="label">Telegram ID</label>
        <input v-model.number="form.telegram_id" type="number" placeholder="1873982052" class="input" />
      </div>
      <div>
        <label class="label">Ism</label>
        <input v-model="form.name" type="text" class="input" />
      </div>
      <p v-if="formError" class="error-text">{{ formError }}</p>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="!canSave || saving" @click="saveModal">
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

interface Tag {
  id: number
  category: string
  username: string | null
  telegram_id: number | null
  name: string | null
  is_active: boolean
}
interface Category { key: string; label: string }

const tags = ref<Tag[]>([])
const categories = ref<Category[]>([])
const loading = ref(false)
const saving = ref(false)

function byCategory(key: string) {
  return tags.value.filter(t => t.category === key)
}

const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')
const form = ref<{ category: string; username: string; telegram_id: number | null; name: string }>({
  category: '', username: '', telegram_id: null, name: '',
})

const canSave = computed(() => !!form.value.category && (!!form.value.username.trim() || !!form.value.telegram_id))

function openAdd(category?: string) {
  modalEditId.value = null
  formError.value = ''
  form.value = { category: category || categories.value[0]?.key || '', username: '', telegram_id: null, name: '' }
  modalOpen.value = true
}

function openEdit(t: Tag) {
  modalEditId.value = t.id
  formError.value = ''
  form.value = { category: t.category, username: t.username || '', telegram_id: t.telegram_id, name: t.name || '' }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalEditId.value = null
}

async function saveModal() {
  if (!canSave.value) return
  saving.value = true
  formError.value = ''
  const payload = {
    category: form.value.category,
    username: form.value.username.trim() || null,
    telegram_id: form.value.telegram_id || null,
    name: form.value.name.trim() || null,
  }
  try {
    if (modalEditId.value) {
      const { data } = await api.put(`/inquiry-tags/${modalEditId.value}`, payload)
      const idx = tags.value.findIndex(t => t.id === modalEditId.value)
      if (idx !== -1) tags.value[idx] = data
    } else {
      const { data } = await api.post('/inquiry-tags', payload)
      tags.value.push(data)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch {
    formError.value = 'Saqlanmadi'
  } finally {
    saving.value = false
  }
}

async function toggleActive(t: Tag) {
  try {
    const { data } = await api.put(`/inquiry-tags/${t.id}`, { is_active: !t.is_active })
    const idx = tags.value.findIndex(x => x.id === t.id)
    if (idx !== -1) tags.value[idx] = data
  } catch { /* ignore */ }
}

const { confirm } = useConfirm()
const toast = useToast()

async function askDelete(id: number) {
  if (!(await confirm({ title: "O'chirish" }))) return
  try {
    await api.delete(`/inquiry-tags/${id}`)
    tags.value = tags.value.filter(t => t.id !== id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  }
}

async function load() {
  loading.value = true
  try {
    const [cats, rows] = await Promise.all([
      api.get('/inquiry-tags/categories'),
      api.get('/inquiry-tags'),
    ])
    categories.value = cats.data
    tags.value = rows.data
  } catch {
    categories.value = []
    tags.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>


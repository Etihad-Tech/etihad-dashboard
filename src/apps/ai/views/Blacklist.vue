<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Qora ro'yxat</h1>
        <button class="btn btn-primary" @click="openAdd">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Qo'shish
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="!entries.length" class="card empty">Ro'yxat bo'sh</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="e in entries" :key="e.id" class="flex items-center gap-3 px-4 py-3">
          <div class="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"
            :class="{ 'opacity-50': !e.is_active }">
            <font-awesome-icon icon="user-slash" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1" :class="{ 'opacity-50': !e.is_active }">
            <p class="text-sm font-medium text-gray-900 truncate">{{ e.name || e.username || ('ID ' + e.telegram_id) }}</p>
            <p class="text-xs text-gray-500 truncate">{{ subline(e) }}</p>
          </div>
          <ToggleSwitch :model-value="e.is_active" :title="e.is_active ? 'Faol' : 'Nofaol'" @update:model-value="toggleActive(e)" />
          <button class="icon-btn" title="Tahrirlash" @click="openEdit(e)">
            <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
          </button>
          <button class="icon-btn icon-btn-danger" title="O'chirish" @click="askDelete(e.id)">
            <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="modalEditId ? 'Tahrirlash' : 'Yangi yozuv'" @close="closeModal">
      <div>
        <label class="label">Telegram ID</label>
        <input v-model.number="form.telegram_id" type="number" placeholder="123456789" class="input" />
      </div>
      <div>
        <label class="label">Username</label>
        <input v-model="form.username" type="text" placeholder="@username" class="input" />
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

interface Entry {
  id: number
  telegram_id: number | null
  username: string | null
  name: string | null
  is_active: boolean
}

const entries = ref<Entry[]>([])
const loading = ref(false)
const saving = ref(false)

const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')
const form = ref<{ telegram_id: number | null; username: string; name: string }>({
  telegram_id: null, username: '', name: '',
})

const canSave = computed(() => !!form.value.telegram_id || !!form.value.username.trim())

function subline(e: Entry): string {
  return [e.name && e.username ? e.username : '', e.telegram_id ? `ID ${e.telegram_id}` : '']
    .filter(Boolean).join(' · ')
}

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { telegram_id: null, username: '', name: '' }
  modalOpen.value = true
}

function openEdit(e: Entry) {
  modalEditId.value = e.id
  formError.value = ''
  form.value = { telegram_id: e.telegram_id, username: e.username || '', name: e.name || '' }
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
    telegram_id: form.value.telegram_id || null,
    username: form.value.username.trim() || null,
    name: form.value.name.trim() || null,
  }
  try {
    if (modalEditId.value) {
      const { data } = await api.put(`/blacklist/${modalEditId.value}`, payload)
      const idx = entries.value.findIndex(e => e.id === modalEditId.value)
      if (idx !== -1) entries.value[idx] = data
    } else {
      const { data } = await api.post('/blacklist', payload)
      const idx = entries.value.findIndex(e => e.id === data.id)
      if (idx !== -1) entries.value[idx] = data
      else entries.value.push(data)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch {
    formError.value = 'Saqlashda xatolik yuz berdi'
  } finally {
    saving.value = false
  }
}

async function toggleActive(e: Entry) {
  try {
    const { data } = await api.put(`/blacklist/${e.id}`, { is_active: !e.is_active })
    const idx = entries.value.findIndex(x => x.id === e.id)
    if (idx !== -1) entries.value[idx] = data
  } catch { /* ignore */ }
}

const { confirm } = useConfirm()
const toast = useToast()

async function askDelete(id: number) {
  if (!(await confirm({ title: "Yozuvni o'chirish" }))) return
  try {
    await api.delete(`/blacklist/${id}`)
    entries.value = entries.value.filter(e => e.id !== id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirishda xatolik yuz berdi")
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/blacklist')
    entries.value = data
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>


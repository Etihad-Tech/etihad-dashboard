<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Adminlar</h1>
        <button class="btn btn-primary" @click="openAdd">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Qo'shish
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="admins.length === 0" class="card empty">Adminlar yo'q</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="a in admins" :key="a.id" class="flex items-center gap-3 px-4 py-3">
          <div class="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"
            :class="{ 'opacity-50': !a.is_active }">
            <font-awesome-icon icon="user-shield" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1" :class="{ 'opacity-50': !a.is_active }">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ a.name || a.username || ('ID ' + a.telegram_id) }}
              <span v-if="a.name && a.username" class="text-gray-400 font-normal">· {{ a.username }}</span>
            </p>
            <p class="text-xs text-gray-500">ID {{ a.telegram_id }}</p>
          </div>
          <ToggleSwitch :model-value="a.is_active" :title="a.is_active ? 'Faol' : 'Nofaol'" @update:model-value="toggleActive(a)" />
          <button class="icon-btn" title="Tahrirlash" @click="openEdit(a)">
            <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
          </button>
          <button class="icon-btn icon-btn-danger" title="O'chirish" @click="askDelete(a.id)">
            <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="modalEditId ? 'Tahrirlash' : 'Yangi admin'" @close="closeModal">
      <div>
        <label class="label">Telegram ID</label>
        <input v-model.number="form.telegram_id" type="number" placeholder="123456789" :disabled="!!modalEditId" class="input" />
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

interface Admin {
  id: number
  telegram_id: number
  username: string | null
  name: string | null
  is_active: boolean
}

const admins = ref<Admin[]>([])
const loading = ref(false)
const saving = ref(false)

const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')
const form = ref<{ telegram_id: number | null; username: string; name: string }>({
  telegram_id: null, username: '', name: '',
})

const canSave = computed(() => !!modalEditId.value || !!form.value.telegram_id)

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { telegram_id: null, username: '', name: '' }
  modalOpen.value = true
}

function openEdit(a: Admin) {
  modalEditId.value = a.id
  formError.value = ''
  form.value = { telegram_id: a.telegram_id, username: a.username || '', name: a.name || '' }
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
  try {
    if (modalEditId.value) {
      const payload = {
        username: form.value.username.trim() || null,
        name: form.value.name.trim() || null,
      }
      const { data } = await api.put(`/admins/${modalEditId.value}`, payload)
      const idx = admins.value.findIndex(a => a.id === modalEditId.value)
      if (idx !== -1) admins.value[idx] = data
    } else {
      const payload = {
        telegram_id: form.value.telegram_id,
        username: form.value.username.trim() || null,
        name: form.value.name.trim() || null,
      }
      const { data } = await api.post('/admins', payload)
      const idx = admins.value.findIndex(a => a.id === data.id)
      if (idx !== -1) admins.value[idx] = data
      else admins.value.push(data)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch {
    formError.value = 'Saqlanmadi'
  } finally {
    saving.value = false
  }
}

async function toggleActive(a: Admin) {
  try {
    const { data } = await api.put(`/admins/${a.id}`, { is_active: !a.is_active })
    const idx = admins.value.findIndex(x => x.id === a.id)
    if (idx !== -1) admins.value[idx] = data
  } catch { /* ignore */ }
}

const { confirm } = useConfirm()
const toast = useToast()

async function askDelete(id: number) {
  if (!(await confirm({ title: "Adminni o'chirish" }))) return
  try {
    await api.delete(`/admins/${id}`)
    admins.value = admins.value.filter(a => a.id !== id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  }
}

async function loadAdmins() {
  loading.value = true
  try {
    const { data } = await api.get('/admins')
    admins.value = data
  } catch {
    admins.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadAdmins)
</script>


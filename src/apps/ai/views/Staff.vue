<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Xodimlar</h1>
        <button class="btn btn-primary" @click="openAdd">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Qo'shish
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="staff.length === 0" class="card empty">Xodimlar yo'q</div>

      <div v-else class="space-y-4">
        <div v-for="group in grouped" :key="group.location" class="card overflow-hidden">
          <div class="flex items-center gap-2 px-4 h-11 border-b border-gray-100">
            <font-awesome-icon icon="location-dot" class="w-3.5 h-3.5 text-gray-400" />
            <span class="section-title">{{ locationLabel(group.location) }}</span>
            <span class="chip chip-gray">{{ group.items.length }}</span>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="s in group.items" :key="s.id" class="flex items-center gap-3 px-4 py-2.5">
              <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0" :class="[roleMeta(s.role).bg, { 'opacity-50': !s.is_active }]">
                <font-awesome-icon :icon="roleMeta(s.role).icon" class="w-3.5 h-3.5" :class="roleMeta(s.role).fg" />
              </div>
              <div class="min-w-0 flex-1" :class="{ 'opacity-50': !s.is_active }">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ s.username }}
                  <span v-if="s.name" class="text-gray-400 font-normal">· {{ s.name }}</span>
                </p>
                <p class="text-xs text-gray-500 truncate">
                  {{ roleMeta(s.role).label }}<span v-if="s.telegram_id"> · ID {{ s.telegram_id }}</span>
                </p>
              </div>
              <ToggleSwitch :model-value="s.is_active" :title="s.is_active ? 'Faol' : 'Nofaol'" @update:model-value="toggleActive(s)" />
              <button class="icon-btn" title="Tahrirlash" @click="openEdit(s)">
                <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
              </button>
              <button class="icon-btn icon-btn-danger" title="O'chirish" @click="askDelete(s.id)">
                <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="modalEditId ? 'Tahrirlash' : 'Yangi xodim'" @close="closeModal">
      <div>
        <label class="label">Telegram username</label>
        <input v-model="form.username" type="text" placeholder="@username" class="input" />
      </div>
      <div>
        <label class="label">Ism</label>
        <input v-model="form.name" type="text" class="input" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Turi</label>
          <select v-model="form.role" class="input">
            <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div>
          <label class="label">Joylashuv</label>
          <select v-model="form.location" class="input">
            <option v-for="l in LOCATIONS" :key="l.value" :value="l.value">{{ l.label }}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label">Telegram ID</label>
        <input v-model.number="form.telegram_id" type="number" placeholder="123456789" class="input" />
      </div>
      <p v-if="formError" class="error-text">{{ formError }}</p>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="!form.username.trim() || saving" @click="saveModal">
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

interface Staff {
  id: number
  role: string
  location: string
  username: string
  name: string | null
  // Optional numeric id. The @mention always uses the username, but the bot's PRIVATE
  // messages (the Nazorat accountability cards) need an id — filling this in makes the
  // DM work even when the bot has never seen this person post, and survives a username
  // change. Without it the bot can only reach people who pressed /start themselves.
  telegram_id: number | null
  is_active: boolean
}

const ROLES = [
  { value: 'ishchi_guruh', label: 'Tashkiliy guruh' },
  { value: 'doctor', label: 'Shifokor' },
  { value: 'airport', label: 'Aeroport' },
]

const LOCATIONS = [
  { value: 'all', label: 'Ikkala shahar' },
  { value: 'makka', label: 'Makka' },
  { value: 'madina', label: 'Madina' },
]

function roleMeta(role: string) {
  switch (role) {
    case 'doctor':
      return { label: 'Shifokor', icon: 'user-doctor', bg: 'bg-rose-50', fg: 'text-rose-600' }
    case 'airport':
      return { label: 'Aeroport', icon: 'plane-arrival', bg: 'bg-sky-50', fg: 'text-sky-600' }
    default:
      return { label: 'Tashkiliy guruh', icon: 'broom', bg: 'bg-amber-50', fg: 'text-amber-600' }
  }
}

function locationLabel(loc: string) {
  return LOCATIONS.find(l => l.value === loc)?.label || loc
}

const staff = ref<Staff[]>([])
const loading = ref(false)
const saving = ref(false)

const grouped = computed(() => {
  const order = ['all', 'makka', 'madina']
  const map: Record<string, Staff[]> = {}
  for (const s of staff.value) {
    ;(map[s.location] ||= []).push(s)
  }
  const keys = Object.keys(map).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return keys.map(location => ({ location, items: map[location] ?? [] }))
})

const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')
const form = ref<{
  username: string; name: string; role: string; location: string; telegram_id: number | null
}>({ username: '', name: '', role: 'ishchi_guruh', location: 'all', telegram_id: null })

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { username: '', name: '', role: 'ishchi_guruh', location: 'all', telegram_id: null }
  modalOpen.value = true
}

function openEdit(s: Staff) {
  modalEditId.value = s.id
  formError.value = ''
  form.value = {
    username: s.username, name: s.name || '', role: s.role, location: s.location,
    telegram_id: s.telegram_id ?? null,
  }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalEditId.value = null
}

async function saveModal() {
  if (!form.value.username.trim()) return
  saving.value = true
  formError.value = ''
  const payload = {
    username: form.value.username.trim(),
    name: form.value.name.trim() || null,
    role: form.value.role,
    location: form.value.location,
    // 0 clears it on the server ("send a value to set, 0 to clear"), so an emptied
    // field removes the stored id instead of silently keeping the old one.
    telegram_id: form.value.telegram_id || 0,
  }
  try {
    if (modalEditId.value) {
      const { data } = await api.put(`/staff/${modalEditId.value}`, payload)
      const idx = staff.value.findIndex(s => s.id === modalEditId.value)
      if (idx !== -1) staff.value[idx] = data
    } else {
      const { data } = await api.post('/staff', payload)
      staff.value.push(data)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch {
    formError.value = 'Saqlanmadi'
  } finally {
    saving.value = false
  }
}

async function toggleActive(s: Staff) {
  try {
    const { data } = await api.put(`/staff/${s.id}`, { is_active: !s.is_active })
    const idx = staff.value.findIndex(x => x.id === s.id)
    if (idx !== -1) staff.value[idx] = data
  } catch { /* ignore */ }
}

const { confirm } = useConfirm()
const toast = useToast()

async function askDelete(id: number) {
  if (!(await confirm({ title: "Xodimni o'chirish" }))) return
  try {
    await api.delete(`/staff/${id}`)
    staff.value = staff.value.filter(s => s.id !== id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  }
}

async function loadStaff() {
  loading.value = true
  try {
    const { data } = await api.get('/staff')
    staff.value = data
  } catch {
    staff.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadStaff)
</script>


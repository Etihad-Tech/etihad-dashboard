<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Xodimlar</h2>
          <p class="text-sm text-gray-500 mt-1">Bot ehtiyoj (so'rov) xabarlarida shu xodimlarni @mention qiladi</p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi xodim
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Bu — umumiy xodimlar ro'yxati (barcha guruhlar uchun bitta jamoa). Qaysi mavzuga qaysi xodim
          biriktirilishini <b>Bilimlar bazasi</b> sahifasida har bir savol uchun belgilaysiz. Ishchi guruh
          ikkala shaharda ham bitta jamoa (joylashuv: «Ikkala shahar»); shifokor va aeroport esa shahar bo'yicha.
          Xodim @mention orqali xabar olishi uchun u shu Telegram guruhining a'zosi bo'lishi shart.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="staff.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up">
        <font-awesome-icon icon="users" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Hozircha xodimlar yo'q</p>
      </div>

      <div v-else class="space-y-8">
        <div v-for="(group, li) in grouped" :key="group.location" class="animate-fade-up" :style="{ animationDelay: `${(li + 1) * 30}ms` }">
          <div class="flex items-center gap-2 mb-3">
            <font-awesome-icon icon="location-dot" class="w-4 h-4 text-amber-600" />
            <h3 class="text-base font-semibold text-gray-900">{{ locationLabel(group.location) }}</h3>
            <span class="text-xs text-gray-400">({{ group.items.length }})</span>
          </div>

          <div class="space-y-3">
            <div
              v-for="s in group.items"
              :key="s.id"
              class="bg-white rounded-3xl border p-4 flex items-center justify-between gap-4 transition-all"
              :class="s.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" :class="roleMeta(s.role).bg">
                  <font-awesome-icon :icon="roleMeta(s.role).icon" class="w-4 h-4" :class="roleMeta(s.role).fg" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ s.username }}
                    <span v-if="s.name" class="text-gray-400 font-normal">· {{ s.name }}</span>
                  </p>
                  <p class="text-xs text-gray-500">{{ roleMeta(s.role).label }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  @click="toggleActive(s)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                  :class="s.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
                >
                  <font-awesome-icon :icon="s.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
                  {{ s.is_active ? 'Faol' : 'Nofaol' }}
                </button>
                <button
                  @click="openEdit(s)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <font-awesome-icon icon="pen" class="w-3 h-3" />
                  Tahrirlash
                </button>
                <button
                  @click="askDelete(s.id)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <font-awesome-icon icon="trash" class="w-3 h-3" />
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Xodimni tahrirlash' : 'Yangi xodim' }}</h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Telegram username</label>
              <input v-model="form.username" type="text" placeholder="@username"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Ism (ixtiyoriy)</label>
              <input v-model="form.name" type="text" placeholder="Masalan: Farhod"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Turi</label>
                <select v-model="form.role"
                  class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Joylashuv</label>
                <select v-model="form.location"
                  class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option v-for="l in LOCATIONS" :key="l.value" :value="l.value">{{ l.label }}</option>
                </select>
              </div>
            </div>
            <p class="text-[11px] text-gray-400">
              Ishchi guruh uchun «Ikkala shahar» tanlang (bir jamoa); shifokor/aeroport uchun aniq shaharni tanlang.
            </p>
            <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
          </div>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
            <button @click="saveModal" :disabled="!form.username.trim() || saving"
              class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'
import { useConfirm } from '../../../composables/useConfirm'

interface Staff {
  id: number
  role: string
  location: string
  username: string
  name: string | null
  is_active: boolean
}

const ROLES = [
  { value: 'ishchi_guruh', label: 'Ishchi guruh' },
  { value: 'doctor', label: 'Shifokor' },
  { value: 'airport', label: 'Aeroport' },
]

const LOCATIONS = [
  { value: 'all', label: 'Ikkala shahar (umumiy)' },
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
      return { label: 'Ishchi guruh', icon: 'broom', bg: 'bg-amber-50', fg: 'text-amber-600' }
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
const form = ref({ username: '', name: '', role: 'ishchi_guruh', location: 'all' })

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { username: '', name: '', role: 'ishchi_guruh', location: 'all' }
  modalOpen.value = true
}

function openEdit(s: Staff) {
  modalEditId.value = s.id
  formError.value = ''
  form.value = { username: s.username, name: s.name || '', role: s.role, location: s.location }
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
    closeModal()
  } catch {
    formError.value = 'Saqlashda xatolik yuz berdi'
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

async function askDelete(id: number) {
  if (!(await confirm({ title: "Xodimni o'chirish" }))) return
  try {
    await api.delete(`/staff/${id}`)
    staff.value = staff.value.filter(s => s.id !== id)
  } catch { /* ignore */ }
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

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>

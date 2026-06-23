<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Qora ro'yxat</h2>
          <p class="text-sm text-gray-500 mt-1">Bot bu foydalanuvchilarning xabarlariga umuman javob bermaydi</p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi yozuv
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Bu ro'yxatdagi odamning guruhdagi xabariga bot <b>javob bermaydi</b> (Telegram ID yoki @username bo'yicha aniqlanadi).
          Barcha faol <b>Xodimlar</b>, <b>Ellikboshilar</b> va har guruhning <b>rahbari</b> avtomatik ravishda shu ro'yxatga kiradi —
          ularni bu yerga qayta kiritish shart emas. Bu sahifa qolgan boshqa odamlarni qo'shish uchun.
          Eslatma: bot baribir kerak bo'lganda ularni teglaydi va shaxsiy xabar yuboradi — faqat <b>ularning savoliga javob bermaydi</b>.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="entries.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up">
        <font-awesome-icon icon="user-slash" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Qora ro'yxat bo'sh</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(e, i) in entries"
          :key="e.id"
          class="bg-white rounded-3xl border p-4 flex items-center justify-between gap-4 transition-all animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
          :class="e.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
              <font-awesome-icon icon="user-slash" class="w-4 h-4 text-rose-600" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ e.name || e.username || ('ID ' + e.telegram_id) }}
                <span v-if="e.name && e.username" class="text-gray-400 font-normal">· {{ e.username }}</span>
              </p>
              <p class="text-xs text-gray-500">
                <span v-if="e.telegram_id">Telegram ID: {{ e.telegram_id }}</span>
                <span v-if="e.telegram_id && e.username"> · </span>
                <span v-if="e.username && !e.name">{{ e.username }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="toggleActive(e)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
              :class="e.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
            >
              <font-awesome-icon :icon="e.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
              {{ e.is_active ? 'Faol' : 'Nofaol' }}
            </button>
            <button
              @click="openEdit(e)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <font-awesome-icon icon="pen" class="w-3 h-3" />
              Tahrirlash
            </button>
            <button
              @click="askDelete(e.id)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <font-awesome-icon icon="trash" class="w-3 h-3" />
              O'chirish
            </button>
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="confirmDeleteId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="cancelDelete">
        <div class="bg-white rounded-3xl w-full max-w-xs border border-gray-200 shadow-xl mx-4 p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <font-awesome-icon icon="trash" class="w-5 h-5 text-red-500" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">Yozuvni o'chirish</h3>
          <p class="text-sm text-gray-500 mb-5">Bu amalni ortga qaytarib bo'lmaydi</p>
          <div class="flex justify-center gap-3">
            <button @click="cancelDelete" class="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
            <button @click="confirmDelete" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-2xl transition-colors">O'chirish</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Yozuvni tahrirlash' : 'Yangi yozuv' }}</h3>
          </div>
          <div class="p-6 space-y-4">
            <p class="text-xs text-gray-400">Telegram ID yoki username dan kamida bittasini kiriting.</p>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Telegram ID (ixtiyoriy)</label>
              <input v-model.number="form.telegram_id" type="number" placeholder="Masalan: 123456789"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Username (ixtiyoriy)</label>
              <input v-model="form.username" type="text" placeholder="@username"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Ism (ixtiyoriy)</label>
              <input v-model="form.name" type="text" placeholder="Masalan: Akmal"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
          </div>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
            <button @click="saveModal" :disabled="!canSave || saving"
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

const confirmDeleteId = ref<number | null>(null)
function askDelete(id: number) { confirmDeleteId.value = id }
function cancelDelete() { confirmDeleteId.value = null }

async function confirmDelete() {
  if (!confirmDeleteId.value) return
  try {
    await api.delete(`/blacklist/${confirmDeleteId.value}`)
    entries.value = entries.value.filter(e => e.id !== confirmDeleteId.value)
  } catch { /* ignore */ }
  finally { confirmDeleteId.value = null }
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

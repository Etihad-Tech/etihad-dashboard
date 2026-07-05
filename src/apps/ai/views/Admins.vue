<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Adminlar</h2>
          <p class="text-sm text-gray-500 mt-1">Botni guruhda to'xtatish / yoqish huquqiga ega Telegram foydalanuvchilari</p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi admin
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Ro'yxatdagi admin guruhga <b>bitta belgidan</b> iborat xabar (masalan «1») yuborsa, bot o'sha guruhda
          to'xtaydi yoki qayta yoqiladi. Agar admin qayta yoqmasa, bot <b>5 daqiqadan</b> keyin avtomatik yoqiladi.
          Admin Telegram ID raqami bo'yicha aniqlanadi (foydalanuvchi nomi o'zgarishi mumkin).
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="admins.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up">
        <font-awesome-icon icon="user-shield" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Hozircha adminlar yo'q</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(a, i) in admins"
          :key="a.id"
          class="bg-white rounded-3xl border p-4 flex items-center justify-between gap-4 transition-all animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
          :class="a.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
              <font-awesome-icon icon="user-shield" class="w-4 h-4 text-indigo-600" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ a.name || a.username || ('ID ' + a.telegram_id) }}
                <span v-if="a.name && a.username" class="text-gray-400 font-normal">· {{ a.username }}</span>
              </p>
              <p class="text-xs text-gray-500">Telegram ID: {{ a.telegram_id }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="toggleActive(a)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
              :class="a.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
            >
              <font-awesome-icon :icon="a.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
              {{ a.is_active ? 'Faol' : 'Nofaol' }}
            </button>
            <button
              @click="openEdit(a)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <font-awesome-icon icon="pen" class="w-3 h-3" />
              Tahrirlash
            </button>
            <button
              @click="askDelete(a.id)"
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
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Adminni tahrirlash' : 'Yangi admin' }}</h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Telegram ID</label>
              <input v-model.number="form.telegram_id" type="number" placeholder="Masalan: 123456789" :disabled="!!modalEditId"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-60" />
              <p class="text-[11px] text-gray-400 mt-1">Foydalanuvchining raqamli Telegram ID si (qo'shilgach o'zgartirib bo'lmaydi)</p>
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
import { useConfirm } from '../../../composables/useConfirm'

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
    closeModal()
  } catch {
    formError.value = 'Saqlashda xatolik yuz berdi'
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

async function askDelete(id: number) {
  if (!(await confirm({ title: "Adminni o'chirish" }))) return
  try {
    await api.delete(`/admins/${id}`)
    admins.value = admins.value.filter(a => a.id !== id)
  } catch { /* ignore */ }
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

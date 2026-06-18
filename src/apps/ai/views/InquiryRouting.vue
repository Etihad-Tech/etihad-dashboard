<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Murojaat yo'naltirish</h2>
          <p class="text-sm text-gray-500 mt-1">Har bir murojaat turi uchun bot guruhda kimni belgilashi (teg qilishi)</p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi mas'ul
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Foydalanuvchi savol berganda bot uning turini aniqlaydi (viza, reys, aeroportda kutib olish, Haramain
          poyezdi, sotuv bo'limi...) va shu turga biriktirilgan xodimlarni guruhda belgilaydi hamda ularga shaxsiy
          xabar yuboradi. Xodimni @username yoki Telegram ID orqali kiritish mumkin.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else class="space-y-8">
        <div v-for="(cat, ci) in categories" :key="cat.key" class="animate-fade-up" :style="{ animationDelay: `${(ci + 1) * 25}ms` }">
          <div class="flex items-center gap-2 mb-3">
            <font-awesome-icon icon="tag" class="w-4 h-4 text-amber-600" />
            <h3 class="text-base font-semibold text-gray-900">{{ cat.label }}</h3>
            <span class="text-xs text-gray-400">({{ byCategory(cat.key).length }})</span>
          </div>

          <div v-if="byCategory(cat.key).length === 0" class="text-sm text-gray-400 pl-6 mb-2">
            Hozircha hech kim biriktirilmagan
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="t in byCategory(cat.key)"
              :key="t.id"
              class="bg-white rounded-3xl border p-4 flex items-center justify-between gap-4 transition-all"
              :class="t.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <font-awesome-icon icon="user" class="w-4 h-4 text-indigo-600" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ t.username || (t.name ? t.name : ('ID ' + t.telegram_id)) }}
                    <span v-if="t.username && t.name" class="text-gray-400 font-normal">· {{ t.name }}</span>
                  </p>
                  <p class="text-xs text-gray-500">
                    <span v-if="t.telegram_id">Telegram ID: {{ t.telegram_id }}</span>
                    <span v-else>@username</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  @click="toggleActive(t)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                  :class="t.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
                >
                  <font-awesome-icon :icon="t.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
                  {{ t.is_active ? 'Faol' : 'Nofaol' }}
                </button>
                <button
                  @click="openEdit(t)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <font-awesome-icon icon="pen" class="w-3 h-3" />
                  Tahrirlash
                </button>
                <button
                  @click="askDelete(t.id)"
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
      <div v-if="confirmDeleteId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="cancelDelete">
        <div class="bg-white rounded-3xl w-full max-w-xs border border-gray-200 shadow-xl mx-4 p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <font-awesome-icon icon="trash" class="w-5 h-5 text-red-500" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">O'chirish</h3>
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
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Tahrirlash' : 'Yangi mas\'ul' }}</h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Murojaat turi</label>
              <select v-model="form.category"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Username (ixtiyoriy)</label>
              <input v-model="form.username" type="text" placeholder="@username"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Telegram ID (username yo'q bo'lsa)</label>
              <input v-model.number="form.telegram_id" type="number" placeholder="Masalan: 1873982052"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Ism (ixtiyoriy)</label>
              <input v-model="form.name" type="text" placeholder="Masalan: Albaro"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <p class="text-[11px] text-gray-400">Username yoki Telegram ID dan kamida bittasini kiriting.</p>
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

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { category: categories.value[0]?.key || '', username: '', telegram_id: null, name: '' }
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
    closeModal()
  } catch {
    formError.value = 'Saqlashda xatolik yuz berdi'
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

const confirmDeleteId = ref<number | null>(null)
function askDelete(id: number) { confirmDeleteId.value = id }
function cancelDelete() { confirmDeleteId.value = null }

async function confirmDelete() {
  if (!confirmDeleteId.value) return
  try {
    await api.delete(`/inquiry-tags/${confirmDeleteId.value}`)
    tags.value = tags.value.filter(t => t.id !== confirmDeleteId.value)
  } catch { /* ignore */ }
  finally { confirmDeleteId.value = null }
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

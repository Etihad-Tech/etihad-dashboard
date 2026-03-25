<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Maqtov shablonlari</h2>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi shablon
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="templates.length === 0" class="bg-white rounded-2xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 30ms">
        <font-awesome-icon icon="file-lines" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Hozircha maqtov shablonlari yo'q</p>
      </div>

      <!-- Template cards -->
      <div v-else class="space-y-3">
        <div
          v-for="(tpl, i) in templates"
          :key="tpl.id"
          class="bg-white rounded-2xl border p-5 transition-all animate-fade-up"
          :class="tpl.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ tpl.text }}</p>
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div class="flex items-center gap-1">
              <button
                @click="toggleActive(tpl)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                :class="tpl.is_active
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-gray-400 hover:bg-gray-50'"
              >
                <font-awesome-icon :icon="tpl.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
                {{ tpl.is_active ? 'Faol' : 'Nofaol' }}
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="openEdit(tpl)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <font-awesome-icon icon="pen" class="w-3 h-3" />
                Tahrirlash
              </button>
              <button
                @click="askDelete(tpl.id)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <font-awesome-icon icon="trash" class="w-3 h-3" />
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm delete modal -->
    <Transition name="modal">
      <div
        v-if="confirmDeleteId"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="cancelDelete"
      >
        <div class="bg-white rounded-3xl w-full max-w-xs border border-gray-200 shadow-xl mx-4 p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <font-awesome-icon icon="trash" class="w-5 h-5 text-red-500" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">Shablonni o'chirish</h3>
          <p class="text-sm text-gray-500 mb-5">Bu amalni ortga qaytarib bo'lmaydi</p>
          <div class="flex justify-center gap-3">
            <button
              @click="cancelDelete"
              class="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              @click="confirmDelete"
              class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              O'chirish
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add/Edit modal -->
    <Transition name="modal">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Shablonni tahrirlash' : 'Yangi shablon' }}</h3>
          </div>
          <div class="p-6">
            <textarea
              v-model="modalText"
              rows="4"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
              placeholder="Shablon matnini yozing..."
            ></textarea>
          </div>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              @click="saveModal"
              :disabled="!modalText.trim() || saving"
              class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'

interface Template {
  id: number
  text: string
  is_active: boolean
  created_at: string | null
}

const templates = ref<Template[]>([])
const loading = ref(false)
const saving = ref(false)

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
    closeModal()
  } catch { /* ignore */ }
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

const confirmDeleteId = ref<number | null>(null)

function askDelete(id: number) {
  confirmDeleteId.value = id
}

function cancelDelete() {
  confirmDeleteId.value = null
}

async function confirmDelete() {
  if (!confirmDeleteId.value) return
  try {
    await api.delete(`/templates/${confirmDeleteId.value}`)
    templates.value = templates.value.filter(t => t.id !== confirmDeleteId.value)
  } catch { /* ignore */ }
  finally { confirmDeleteId.value = null }
}

onMounted(loadTemplates)
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

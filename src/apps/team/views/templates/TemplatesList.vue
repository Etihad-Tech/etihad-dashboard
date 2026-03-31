<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Shablonlar</h2>
        <button
          @click="modalOpen = true"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi shablon
        </button>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="store.items.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 30ms">
        <font-awesome-icon icon="file-lines" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Shablonlar yo'q</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(tpl, i) in store.items"
          :key="tpl.id"
          class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">{{ tpl.name }}</h3>
              <p class="text-xs text-gray-400 mt-1">{{ tpl.description || 'Tavsif yo\'q' }}</p>
            </div>
            <div class="flex items-center gap-1">
              <router-link
                :to="`/team/templates/${tpl.id}`"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <font-awesome-icon icon="eye" class="w-3 h-3" />
                Ko'rish
              </router-link>
              <button
                @click="deleteId = tpl.id"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <font-awesome-icon icon="trash" class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white rounded-3xl w-full max-w-md border border-gray-200 shadow-xl mx-4">
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">Yangi shablon</h3>
          </div>
          <form @submit.prevent="createTemplate" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
              <input v-model="form.name" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="Shablon nomi" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
              <input v-model="form.description" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="Ixtiyoriy" />
            </div>
          </form>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl">Bekor qilish</button>
            <button @click="createTemplate" :disabled="!form.name || saving" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl">
              {{ saving ? 'Yaratilmoqda...' : 'Yaratish' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmModal
      :visible="!!deleteId"
      title="Shablonni o'chirish"
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import { useTemplatesStore } from '../../stores/templates'

const store = useTemplatesStore()
const modalOpen = ref(false)
const saving = ref(false)
const deleteId = ref<number | null>(null)
const form = reactive({ name: '', description: '' })

function closeModal() {
  modalOpen.value = false
  form.name = ''
  form.description = ''
}

async function createTemplate() {
  if (!form.name) return
  saving.value = true
  try {
    await store.createTemplate({ name: form.name, description: form.description || undefined })
    closeModal()
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteId.value) return
  await store.deleteTemplate(deleteId.value)
  deleteId.value = null
}

onMounted(() => store.fetchAll())
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active > div, .modal-leave-active > div { transition: opacity 0.2s ease, transform 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div, .modal-leave-to > div { opacity: 0; transform: scale(0.95) translateY(10px); }
</style>

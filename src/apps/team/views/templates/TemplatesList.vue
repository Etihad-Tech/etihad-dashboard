<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Post shablonlari</h1>
        <button class="btn btn-primary" @click="modalOpen = true">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi shablon
        </button>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="store.items.length === 0" class="card empty">Shablonlar yo'q</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="tpl in store.items" :key="tpl.id" class="flex items-center gap-3 px-4 py-3">
          <router-link :to="`/team/templates/${tpl.id}`" class="flex items-center gap-3 min-w-0 flex-1 group">
            <div class="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <font-awesome-icon icon="file-lines" class="w-3.5 h-3.5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate group-hover:text-amber-700">{{ tpl.name }}</p>
              <p v-if="tpl.description" class="text-xs text-gray-500 truncate">{{ tpl.description }}</p>
            </div>
          </router-link>
          <router-link :to="`/team/templates/${tpl.id}`" class="icon-btn" title="Ochish">
            <font-awesome-icon icon="chevron-right" class="w-3.5 h-3.5" />
          </router-link>
          <button class="icon-btn icon-btn-danger" title="O'chirish" @click="deleteId = tpl.id">
            <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" title="Yangi shablon" width="sm:max-w-md" @close="closeModal">
      <form class="space-y-4" @submit.prevent="createTemplate">
        <div>
          <label class="label">Nomi</label>
          <input v-model="form.name" required class="input" />
        </div>
        <div>
          <label class="label">Tavsif</label>
          <input v-model="form.description" class="input" />
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="!form.name || saving" @click="createTemplate">
          {{ saving ? 'Yaratilmoqda...' : 'Yaratish' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmModal
      :visible="!!deleteId"
      title="Shablonni o'chirish"
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppShell from '../../../../components/AppShell.vue'
import BaseModal from '../../../../components/BaseModal.vue'
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


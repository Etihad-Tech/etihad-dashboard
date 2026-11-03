<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <router-link to="/team/templates" class="icon-btn" title="Orqaga">
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </router-link>
        <h1 class="page-title truncate min-w-0">{{ store.current?.name || 'Shablon' }}</h1>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select v-model="importTripId" class="input sm:max-w-xs">
          <option value="">Safarni tanlang</option>
          <option v-for="t in tripsStore.items" :key="t.trip_id" :value="t.trip_id">{{ t.name }}</option>
        </select>
        <button class="btn btn-primary" :disabled="!importTripId || importing" @click="importToTrip">
          {{ importing ? 'Import...' : 'Safarga import' }}
        </button>
        <span v-if="importMsg" class="text-sm text-emerald-600">{{ importMsg }}</span>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="store.posts.length === 0" class="card empty">Postlar yo'q</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="post in store.posts" :key="post.id" class="flex items-start gap-3 px-4 py-3">
          <div class="w-11 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <span class="text-xs font-semibold text-gray-600">{{ post.day_number }}-kun</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900 whitespace-pre-wrap line-clamp-3">{{ post.message_text }}</p>
            <div class="flex items-center gap-2 mt-1.5">
              <span class="text-xs text-gray-400">{{ post.scheduled_time }} · {{ post.media_type || 'matn' }}</span>
              <span class="chip" :class="post.send_mode === 'now' ? 'chip-blue' : 'chip-gray'">
                {{ post.send_mode === 'now' ? 'Hoziroq' : 'Vaqtida' }}
              </span>
            </div>
          </div>
          <button class="icon-btn icon-btn-danger" title="O'chirish" @click="deletePostId = post.id">
            <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ConfirmModal
        :visible="!!deletePostId"
        title="Postni o'chirish"
        @confirm="confirmDeletePost"
        @cancel="deletePostId = null"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import { useTemplatesStore } from '../../stores/templates'
import { useTripsStore } from '../../stores/trips'

const route = useRoute()
const store = useTemplatesStore()
const tripsStore = useTripsStore()

const templateId = Number(route.params.id)
const loading = ref(true)
const deletePostId = ref<number | null>(null)
const importTripId = ref('')
const importing = ref(false)
const importMsg = ref('')

async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      store.fetchTemplate(templateId),
      store.fetchPosts(templateId),
      tripsStore.fetchTrips(),
    ])
  } finally {
    loading.value = false
  }
}

async function confirmDeletePost() {
  if (!deletePostId.value) return
  await store.deletePost(deletePostId.value)
  deletePostId.value = null
}

async function importToTrip() {
  if (!importTripId.value) return
  importing.value = true
  importMsg.value = ''
  try {
    await store.importToTrip(templateId, importTripId.value)
    importMsg.value = 'Import qilindi'
    setTimeout(() => (importMsg.value = ''), 3000)
  } finally {
    importing.value = false
  }
}

onMounted(loadData)
</script>

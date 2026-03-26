<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4 animate-fade-up">
        <router-link
          to="/team/templates"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors"
        >
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </router-link>
        <h2 class="text-2xl font-bold text-gray-900">Shablon postlari</h2>
      </div>

      <!-- Import to trip -->
      <div class="flex items-center gap-3 animate-fade-up" style="animation-delay: 30ms">
        <select v-model="importTripId" class="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm">
          <option value="">Safarni tanlang</option>
          <option v-for="t in tripsStore.items" :key="t.trip_id" :value="t.trip_id">{{ t.name }}</option>
        </select>
        <button
          @click="importToTrip"
          :disabled="!importTripId || importing"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {{ importing ? 'Import...' : 'Safarga import' }}
        </button>
        <p v-if="importMsg" class="text-sm text-emerald-600">{{ importMsg }}</p>
      </div>

      <!-- Roadmap -->
      <div class="bg-white rounded-2xl border border-gray-200 p-5 animate-fade-up" style="animation-delay: 45ms">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-900">Roadmap reja</h3>
          <button
            @click="editingRoadmap = !editingRoadmap"
            class="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {{ editingRoadmap ? 'Bekor qilish' : (store.roadmap ? 'Tahrirlash' : 'Qo\'shish') }}
          </button>
        </div>
        <div v-if="editingRoadmap">
          <textarea
            v-model="roadmapText"
            rows="10"
            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
            placeholder="Roadmap rejasini yozing..."
          ></textarea>
          <div class="flex justify-end mt-2">
            <button
              @click="saveRoadmap"
              :disabled="savingRoadmap"
              class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {{ savingRoadmap ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
        <div v-else-if="store.roadmap">
          <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">{{ store.roadmap.content }}</pre>
        </div>
        <div v-else>
          <p class="text-sm text-gray-400">Roadmap qo'shilmagan</p>
        </div>
      </div>

      <!-- Posts list -->
      <div v-if="store.posts.length === 0 && !loading" class="bg-white rounded-2xl border border-gray-200 py-16 text-center animate-fade-up" style="animation-delay: 60ms">
        <p class="text-gray-400">Postlar yo'q</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(post, i) in store.posts"
          :key="post.id"
          class="bg-white rounded-2xl border border-gray-200 p-5 animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-gray-500">{{ post.day_number }}-kun</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 whitespace-pre-wrap line-clamp-3">{{ post.message_text }}</p>
              <div class="flex items-center gap-2 mt-2">
                <p class="text-xs text-gray-400">{{ post.scheduled_time }} · {{ post.media_type || 'matn' }}</p>
                <span
                  class="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium"
                  :class="post.send_mode === 'now' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'"
                >
                  {{ post.send_mode === 'now' ? 'Hoziroq' : 'Vaqtida' }}
                </span>
              </div>
            </div>
            <button
              @click="deletePostId = post.id"
              class="flex-shrink-0 px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            >
              <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <ConfirmModal
        :visible="!!deletePostId"
        title="Postni o'chirish"
        @confirm="confirmDeletePost"
        @cancel="deletePostId = null"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../../components/AppLayout.vue'
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
const editingRoadmap = ref(false)
const roadmapText = ref('')
const savingRoadmap = ref(false)

async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      store.fetchPosts(templateId),
      store.fetchRoadmap(templateId),
      tripsStore.fetchTrips(),
    ])
    roadmapText.value = store.roadmap?.content || ''
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
    importMsg.value = 'Import muvaffaqiyatli!'
    setTimeout(() => (importMsg.value = ''), 3000)
  } finally {
    importing.value = false
  }
}

async function saveRoadmap() {
  if (!roadmapText.value.trim()) return
  savingRoadmap.value = true
  try {
    await store.saveRoadmap(templateId, roadmapText.value.trim())
    editingRoadmap.value = false
  } finally {
    savingRoadmap.value = false
  }
}

onMounted(loadData)
</script>

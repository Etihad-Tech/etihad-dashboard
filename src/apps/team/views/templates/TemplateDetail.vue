<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4 animate-fade-up">
        <router-link
          to="/team/templates"
          class="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors"
        >
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </router-link>
        <h2 class="text-2xl font-bold text-gray-900">Shablon postlari</h2>
      </div>

      <!-- Import to trip -->
      <div class="flex items-center gap-3 animate-fade-up" style="animation-delay: 30ms">
        <select v-model="importTripId" class="bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm">
          <option value="">Safarni tanlang</option>
          <option v-for="t in tripsStore.items" :key="t.trip_id" :value="t.trip_id">{{ t.name }}</option>
        </select>
        <button
          @click="importToTrip"
          :disabled="!importTripId || importing"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          {{ importing ? 'Import...' : 'Safarga import' }}
        </button>
        <p v-if="importMsg" class="text-sm text-emerald-600">{{ importMsg }}</p>
      </div>

      <!-- Roadmap -->
      <div class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up" style="animation-delay: 45ms">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-900">Roadmap reja</h3>
          <button
            v-if="!editingRoadmap"
            @click="editingRoadmap = true"
            class="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {{ store.roadmap ? 'Tahrirlash' : 'Qo\'shish' }}
          </button>
        </div>
        <div v-if="editingRoadmap">
          <textarea
            v-model="roadmapText"
            rows="10"
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
            placeholder="Roadmap rejasini yozing..."
          ></textarea>
          <div class="flex justify-end gap-2 mt-2">
            <button
              @click="cancelRoadmapEdit"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              Bekor
            </button>
            <button
              @click="saveRoadmap"
              :disabled="savingRoadmap"
              class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors"
            >
              {{ savingRoadmap ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
        <div v-else-if="store.roadmap">
          <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-2xl p-4 max-h-64 overflow-y-auto">{{ store.roadmap.content }}</pre>
        </div>
        <div v-else>
          <p class="text-sm text-gray-400">Roadmap qo'shilmagan</p>
        </div>
      </div>

      <!-- Location Days -->
      <div class="bg-white rounded-3xl border border-gray-200 p-6 animate-fade-up" style="animation-delay: 50ms">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-900">Мадина/Мекка кунлари</h3>
          <button
            v-if="!editingLocationDays"
            @click="editingLocationDays = true"
            class="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            Tahrirlash
          </button>
        </div>

        <div v-if="editingLocationDays" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium text-gray-600 mb-2 block">Мадина бошланиш кун</label>
              <input
                v-model.number="locationDaysForm.madina_start"
                type="number"
                min="1"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="1"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 mb-2 block">Мадина тугаш кун</label>
              <input
                v-model.number="locationDaysForm.madina_end"
                type="number"
                min="1"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="5"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 mb-2 block">Мекка бошланиш кун</label>
              <input
                v-model.number="locationDaysForm.makka_start"
                type="number"
                min="1"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="6"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 mb-2 block">Мекка тугаш кун</label>
              <input
                v-model.number="locationDaysForm.makka_end"
                type="number"
                min="1"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="10"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button
              @click="cancelLocationDaysEdit"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              Bekor
            </button>
            <button
              @click="saveLocationDays"
              :disabled="savingLocationDays"
              class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors"
            >
              {{ savingLocationDays ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
        <div v-else>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Мадина start</p>
              <p class="text-sm font-semibold text-gray-900">{{ store.current?.madina_start_day || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Мадина end</p>
              <p class="text-sm font-semibold text-gray-900">{{ store.current?.madina_end_day || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Мекка start</p>
              <p class="text-sm font-semibold text-gray-900">{{ store.current?.makka_start_day || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Мекка end</p>
              <p class="text-sm font-semibold text-gray-900">{{ store.current?.makka_end_day || '—' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Posts list -->
      <div v-if="store.posts.length === 0 && !loading" class="bg-white rounded-3xl border border-gray-200 py-16 text-center animate-fade-up" style="animation-delay: 60ms">
        <p class="text-gray-400">Postlar yo'q</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(post, i) in store.posts"
          :key="post.id"
          class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-gray-500 text-center leading-tight">{{ post.day_number }}-kun</span>
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
              class="flex-shrink-0 px-2 py-1.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
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
const editingLocationDays = ref(false)
const savingLocationDays = ref(false)
const locationDaysForm = ref({
  madina_start: 1,
  madina_end: 5,
  makka_start: 6,
  makka_end: 10,
})

async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      store.fetchTemplate(templateId),
      store.fetchPosts(templateId),
      store.fetchRoadmap(templateId),
      tripsStore.fetchTrips(),
    ])
    roadmapText.value = store.roadmap?.content || ''

    const template = store.current
    if (template) {
      locationDaysForm.value = {
        madina_start: template.madina_start_day || 1,
        madina_end: template.madina_end_day || 5,
        makka_start: template.makka_start_day || 6,
        makka_end: template.makka_end_day || 10,
      }
    }
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

function cancelRoadmapEdit() {
  editingRoadmap.value = false
  roadmapText.value = store.roadmap?.content || ''
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

function cancelLocationDaysEdit() {
  editingLocationDays.value = false
  const template = store.current
  if (template) {
    locationDaysForm.value = {
      madina_start: template.madina_start_day || 1,
      madina_end: template.madina_end_day || 5,
      makka_start: template.makka_start_day || 6,
      makka_end: template.makka_end_day || 10,
    }
  }
}

async function saveLocationDays() {
  savingLocationDays.value = true
  try {
    await store.updateLocationDays(
      templateId,
      locationDaysForm.value.madina_start,
      locationDaysForm.value.madina_end,
      locationDaysForm.value.makka_start,
      locationDaysForm.value.makka_end
    )
    editingLocationDays.value = false
  } finally {
    savingLocationDays.value = false
  }
}

onMounted(loadData)
</script>

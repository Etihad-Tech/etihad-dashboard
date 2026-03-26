<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4 animate-fade-up">
        <router-link
          to="/team/trips"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors"
        >
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </router-link>
        <h2 class="text-2xl font-bold text-gray-900">{{ trip?.name || 'Safar' }}</h2>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-if="trip">
        <div class="bg-white rounded-2xl border border-gray-200 p-6 animate-fade-up" style="animation-delay: 30ms">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Safar ID</p>
              <p class="text-sm font-mono text-gray-900">{{ trip.trip_id }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Boshlanish</p>
              <p class="text-sm text-gray-900">{{ trip.start_date || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Tugash</p>
              <p class="text-sm text-gray-900">{{ trip.end_date || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Guruh chat ID</p>
              <p class="text-sm font-mono text-gray-900">{{ trip.group_chat_id || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Guruh link</p>
              <p class="text-sm text-gray-900 truncate">{{ trip.group_invite_link || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 mb-1">Yaratilgan</p>
              <p class="text-sm text-gray-900">{{ new Date(trip.created_at).toLocaleDateString('uz') }}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100">
            <button
              @click="toggleRegistration"
              class="px-4 py-2 text-sm font-medium rounded-xl border transition-colors"
              :class="trip.registration_open
                ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-500 border-gray-200 bg-gray-50 hover:bg-gray-100'"
            >
              Ro'yxat: {{ trip.registration_open ? 'Ochiq' : 'Yopiq' }}
            </button>
            <button
              @click="toggleStatus"
              class="px-4 py-2 text-sm font-medium rounded-xl border transition-colors"
              :class="trip.is_active
                ? 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                : 'text-gray-500 border-gray-200 bg-gray-50 hover:bg-gray-100'"
            >
              {{ trip.is_active ? 'Aktiv' : 'Arxiv' }}
            </button>
            <button
              @click="confirmDeleteTrip = true"
              class="px-4 py-2 text-sm font-medium rounded-xl border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-colors ml-auto"
            >
              <font-awesome-icon icon="trash" class="w-3 h-3 mr-1" />
              O'chirish
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 animate-fade-up" style="animation-delay: 60ms">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900">Ishtirokchilar ({{ tripsStore.users.length }})</h3>
          </div>
          <div v-if="tripsStore.users.length === 0" class="py-12 text-center">
            <p class="text-gray-400 text-sm">Ishtirokchilar yo'q</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm min-w-[500px]">
              <thead>
                <tr class="text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th class="text-left px-4 py-2.5 font-medium">Ism</th>
                  <th class="text-left px-4 py-2.5 font-medium">Username</th>
                  <th class="text-left px-4 py-2.5 font-medium">Telefon</th>
                  <th class="text-left px-4 py-2.5 font-medium">Sana</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in tripsStore.users" :key="u.id" class="border-b border-gray-50">
                  <td class="px-4 py-2.5 text-gray-900">{{ u.first_name || '—' }} {{ u.last_name || '' }}</td>
                  <td class="px-4 py-2.5 text-gray-500">{{ u.username ? '@' + u.username : '—' }}</td>
                  <td class="px-4 py-2.5 text-gray-500">{{ u.phone_number || '—' }}</td>
                  <td class="px-4 py-2.5 text-gray-400 text-xs">{{ new Date(u.registered_at).toLocaleDateString('uz') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 animate-fade-up" style="animation-delay: 90ms">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900">Postlar ({{ postsStore.items.length }})</h3>
            <div class="flex items-center gap-2">
              <button
                v-if="hasNowPosts"
                @click="handleSendNowPosts"
                :disabled="sendingNow"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                <font-awesome-icon icon="paper-plane" class="w-3 h-3" />
                {{ sendingNow ? 'Jo\'natilmoqda...' : 'Hozir jo\'natish' }}
              </button>
              <button
                @click="$router.push(`/team/trips/${tripId}/posts/new`)"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <font-awesome-icon icon="plus" class="w-3 h-3" />
                Yangi post
              </button>
            </div>
          </div>
          <div v-if="postsStore.items.length === 0" class="py-12 text-center">
            <p class="text-gray-400 text-sm">Postlar yo'q</p>
          </div>
          <div v-else class="divide-y divide-gray-50">
            <div
              v-for="post in postsStore.items"
              :key="post.id"
              class="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-gray-500">{{ post.day_number }}-kun</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900 truncate">{{ post.message_text }}</p>
                <p class="text-xs text-gray-400">{{ post.scheduled_time }} · {{ post.media_type || 'matn' }}</p>
              </div>
              <span
                v-if="post.send_mode === 'now'"
                class="inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-blue-50 text-blue-600"
              >
                Hoziroq
              </span>
              <span
                class="inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                :class="post.is_sent ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'"
              >
                {{ post.is_sent ? 'Yuborildi' : 'Kutilmoqda' }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <ConfirmModal
        :visible="confirmDeleteTrip"
        title="Safarni o'chirish"
        message="Safar, postlar, ishtirokchilar va javoblar o'chiriladi"
        @confirm="deleteTrip"
        @cancel="confirmDeleteTrip = false"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/AppLayout.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import { useTripsStore } from '../../stores/trips'
import { usePostsStore } from '../../stores/posts'

const route = useRoute()
const router = useRouter()
const tripsStore = useTripsStore()
const postsStore = usePostsStore()

const tripId = route.params.id as string
const trip = ref(tripsStore.current)
const loading = ref(true)
const confirmDeleteTrip = ref(false)
const sendingNow = ref(false)

const hasNowPosts = computed(() =>
  postsStore.items.some(p => p.send_mode === 'now' && !p.is_sent)
)

async function loadData() {
  loading.value = true
  try {
    trip.value = await tripsStore.fetchTrip(tripId)
    await Promise.all([
      tripsStore.fetchUsers(tripId),
      postsStore.fetchByTrip(tripId),
    ])
  } finally {
    loading.value = false
  }
}

async function toggleRegistration() {
  if (!trip.value) return
  await tripsStore.toggleRegistration(tripId, !trip.value.registration_open)
  trip.value = tripsStore.current
}

async function toggleStatus() {
  if (!trip.value) return
  await tripsStore.toggleStatus(tripId, !trip.value.is_active)
  trip.value = tripsStore.current
}

async function deleteTrip() {
  await tripsStore.deleteTrip(tripId)
  router.push('/team/trips')
}

async function handleSendNowPosts() {
  sendingNow.value = true
  try {
    await postsStore.sendNowPosts(tripId)
  } finally {
    sendingNow.value = false
  }
}

onMounted(loadData)
</script>

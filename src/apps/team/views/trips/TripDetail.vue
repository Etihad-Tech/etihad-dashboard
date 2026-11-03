<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <router-link to="/team/trips" class="icon-btn" title="Orqaga">
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </router-link>
        <h1 class="page-title truncate min-w-0">{{ trip?.name || 'Safar' }}</h1>
        <button v-if="trip" class="btn btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700" @click="confirmDeleteTrip = true">
          <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
          O'chirish
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <template v-if="trip">
        <div class="card p-5">
          <dl class="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            <div class="min-w-0">
              <dt class="label">Safar ID</dt>
              <dd class="text-sm font-mono text-gray-900 truncate">{{ trip.trip_id }}</dd>
            </div>
            <div>
              <dt class="label">Boshlanish</dt>
              <dd class="text-sm text-gray-900">{{ trip.start_date || '—' }}</dd>
            </div>
            <div>
              <dt class="label">Tugash</dt>
              <dd class="text-sm text-gray-900">{{ trip.end_date || '—' }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="label">Guruh chat ID</dt>
              <dd class="text-sm font-mono text-gray-900 truncate">{{ trip.group_chat_id || '—' }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="label">Guruh havolasi</dt>
              <dd class="text-sm text-gray-900 truncate">{{ trip.group_invite_link || '—' }}</dd>
            </div>
            <div>
              <dt class="label">Yaratilgan</dt>
              <dd class="text-sm text-gray-900">{{ new Date(trip.created_at).toLocaleDateString('uz') }}</dd>
            </div>
          </dl>

          <div class="flex flex-wrap gap-x-6 gap-y-3 mt-5 pt-4 border-t border-gray-100">
            <label class="flex items-center gap-2.5 text-sm text-gray-700">
              <ToggleSwitch :model-value="trip.registration_open" @update:model-value="toggleRegistration" />
              Ro'yxat {{ trip.registration_open ? 'ochiq' : 'yopiq' }}
            </label>
            <label class="flex items-center gap-2.5 text-sm text-gray-700">
              <ToggleSwitch :model-value="trip.is_active" @update:model-value="toggleStatus" />
              {{ trip.is_active ? 'Aktiv' : 'Arxiv' }}
            </label>
          </div>
        </div>

        <div class="card">
          <div class="px-4 h-12 border-b border-gray-100 flex items-center">
            <h2 class="section-title">Ishtirokchilar <span class="text-gray-400 font-normal">{{ tripsStore.users.length }}</span></h2>
          </div>
          <div v-if="tripsStore.users.length === 0" class="empty">Ishtirokchilar yo'q</div>
          <div v-else class="overflow-x-auto">
            <table class="table min-w-[500px]">
              <thead>
                <tr>
                  <th>Ism</th>
                  <th>Username</th>
                  <th>Telefon</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in tripsStore.users" :key="u.id">
                  <td class="text-gray-900">{{ u.first_name || '—' }} {{ u.last_name || '' }}</td>
                  <td class="text-gray-500">{{ u.username ? '@' + u.username : '—' }}</td>
                  <td class="text-gray-500">{{ u.phone_number || '—' }}</td>
                  <td class="text-gray-400 text-xs whitespace-nowrap">{{ new Date(u.registered_at).toLocaleDateString('uz') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="px-4 h-12 border-b border-gray-100 flex items-center gap-2">
            <h2 class="section-title mr-auto">Postlar <span class="text-gray-400 font-normal">{{ postsStore.items.length }}</span></h2>
            <button v-if="hasNowPosts" class="btn btn-sm btn-secondary" :disabled="sendingNow" @click="handleSendNowPosts">
              <font-awesome-icon icon="paper-plane" class="w-3 h-3" />
              {{ sendingNow ? "Jo'natilmoqda..." : "Hozir jo'natish" }}
            </button>
            <button class="btn btn-sm btn-primary" @click="$router.push(`/team/trips/${tripId}/posts/new`)">
              <font-awesome-icon icon="plus" class="w-3 h-3" />
              Post
            </button>
          </div>
          <div v-if="postsStore.items.length === 0" class="empty">Postlar yo'q</div>
          <div v-else class="divide-y divide-gray-100">
            <div v-for="post in postsStore.items" :key="post.id" class="px-4 py-3 flex items-center gap-3">
              <div class="w-11 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <span class="text-xs font-semibold text-gray-600">{{ post.day_number }}-kun</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900 truncate">{{ post.message_text }}</p>
                <p class="text-xs text-gray-400">{{ post.scheduled_time }} · {{ post.media_type || 'matn' }}</p>
              </div>
              <span v-if="post.send_mode === 'now'" class="chip chip-blue shrink-0 hidden sm:inline-flex">Hoziroq</span>
              <span class="chip shrink-0" :class="post.is_sent ? 'chip-green' : 'chip-amber'">
                {{ post.is_sent ? 'Yuborildi' : 'Kutilmoqda' }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <ConfirmModal
        :visible="confirmDeleteTrip"
        title="Safarni o'chirish"
        message="Postlar, ishtirokchilar va javoblar ham o'chadi"
        @confirm="deleteTrip"
        @cancel="confirmDeleteTrip = false"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import ToggleSwitch from '../../../../components/ToggleSwitch.vue'
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

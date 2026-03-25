<template>
  <AppLayout>
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900 animate-fade-up">So'rovnoma javoblari</h2>

      <!-- Tabs -->
      <div class="flex gap-2 animate-fade-up" style="animation-delay: 30ms">
        <router-link
          to="/team/polls"
          class="px-4 py-1.5 rounded-xl text-sm font-medium border bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
        >
          Savollar
        </router-link>
        <router-link
          to="/team/polls/responses"
          class="px-4 py-1.5 rounded-xl text-sm font-medium border bg-amber-50 text-amber-700 border-amber-200"
        >
          Javoblar
        </router-link>
      </div>

      <!-- Trip selector -->
      <div class="flex items-center gap-3 animate-fade-up" style="animation-delay: 60ms">
        <select
          v-model="selectedTrip"
          class="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm"
        >
          <option value="">Safarni tanlang</option>
          <option v-for="t in tripsStore.items" :key="t.trip_id" :value="t.trip_id">{{ t.name }}</option>
        </select>
        <button
          v-if="selectedTrip"
          @click="sendPoll"
          :disabled="sending"
          class="px-4 py-2 text-sm font-medium text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
        >
          {{ sending ? 'Yuborilmoqda...' : 'Poll yuborish' }}
        </button>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="!selectedTrip" class="bg-white rounded-2xl border border-gray-200 py-16 text-center animate-fade-up" style="animation-delay: 90ms">
        <p class="text-gray-400">Javoblarni ko'rish uchun safarni tanlang</p>
      </div>

      <div v-else-if="store.responses.length === 0" class="bg-white rounded-2xl border border-gray-200 py-16 text-center animate-fade-up" style="animation-delay: 90ms">
        <p class="text-gray-400">Javoblar topilmadi</p>
      </div>

      <!-- Responses table -->
      <div v-else class="bg-white rounded-2xl border border-gray-200 overflow-x-auto animate-fade-up" style="animation-delay: 90ms">
        <table class="w-full text-sm min-w-[600px]">
          <thead>
            <tr class="text-gray-500 border-b border-gray-100 bg-gray-50/50">
              <th class="text-left px-4 py-3 font-medium">Foydalanuvchi</th>
              <th class="text-left px-4 py-3 font-medium">Savol</th>
              <th class="text-left px-4 py-3 font-medium">Javob</th>
              <th class="text-left px-4 py-3 font-medium">Baho</th>
              <th class="text-left px-4 py-3 font-medium">Sana</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in store.responses"
              :key="r.id"
              class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 text-gray-900">{{ r.first_name || r.username || r.user_id }}</td>
              <td class="px-4 py-3 text-gray-600 max-w-xs truncate">{{ r.question_text }}</td>
              <td class="px-4 py-3 text-gray-600 max-w-xs truncate">{{ r.response_text || '—' }}</td>
              <td class="px-4 py-3">
                <span v-if="r.response_rating" class="text-amber-600 font-semibold">{{ r.response_rating }}/5</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ new Date(r.submitted_at).toLocaleDateString('uz') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { usePollsStore } from '../../stores/polls'
import { useTripsStore } from '../../stores/trips'

const store = usePollsStore()
const tripsStore = useTripsStore()

const selectedTrip = ref('')
const sending = ref(false)

watch(selectedTrip, (tripId) => {
  if (tripId) store.fetchResponses(tripId)
})

async function sendPoll() {
  if (!selectedTrip.value) return
  sending.value = true
  try {
    await store.sendPoll(selectedTrip.value)
  } finally {
    sending.value = false
  }
}

onMounted(() => tripsStore.fetchTrips())
</script>

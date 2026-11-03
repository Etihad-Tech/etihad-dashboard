<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">So'rovnomalar</h1>
      </div>

      <div class="seg">
        <router-link to="/team/polls" class="seg-btn inline-flex items-center">Savollar</router-link>
        <router-link to="/team/polls/responses" class="seg-btn seg-btn-on inline-flex items-center">Javoblar</router-link>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select v-model="selectedTrip" class="input sm:max-w-xs">
          <option value="">Safarni tanlang</option>
          <option v-for="t in tripsStore.items" :key="t.trip_id" :value="t.trip_id">{{ t.name }}</option>
        </select>
        <button v-if="selectedTrip" class="btn btn-secondary" :disabled="sending" @click="sendPoll">
          <font-awesome-icon icon="paper-plane" class="w-3.5 h-3.5" />
          {{ sending ? 'Yuborilmoqda...' : 'Poll yuborish' }}
        </button>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="!selectedTrip" class="card empty">Safarni tanlang</div>

      <div v-else-if="store.responses.length === 0" class="card empty">Javoblar yo'q</div>

      <div v-else class="card overflow-x-auto">
        <table class="table min-w-[600px]">
          <thead>
            <tr>
              <th>Foydalanuvchi</th>
              <th>Savol</th>
              <th>Javob</th>
              <th>Baho</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in store.responses" :key="r.id">
              <td class="text-gray-900">{{ r.first_name || r.username || r.user_id }}</td>
              <td class="text-gray-600 max-w-xs truncate">{{ r.question_text }}</td>
              <td class="text-gray-600 max-w-xs truncate">{{ r.response_text || '—' }}</td>
              <td>
                <span v-if="r.response_rating" class="text-amber-600 font-semibold">{{ r.response_rating }}/5</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="text-gray-400 text-xs whitespace-nowrap">{{ new Date(r.submitted_at).toLocaleDateString('uz') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppShell from '../../../../components/AppShell.vue'
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

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Safarlar</h2>
        <button
          @click="modalOpen = true"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi safar
        </button>
      </div>

      <div class="flex gap-2 animate-fade-up" style="animation-delay: 30ms">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="px-4 py-1.5 rounded-2xl text-sm font-medium transition-colors border"
          :class="activeTab === tab.value
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="animate-fade-up" style="animation-delay: 60ms">
        <input
          v-model="search"
          type="text"
          placeholder="Safar qidirish..."
          class="w-full max-w-sm bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>

      <div v-if="tripsStore.loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="filteredTrips.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 90ms">
        <font-awesome-icon icon="plane" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">{{ search ? 'Natija topilmadi' : 'Safarlar yo\'q' }}</p>
      </div>

      <div v-else class="bg-white rounded-3xl border border-gray-200 overflow-x-auto animate-fade-up" style="animation-delay: 90ms">
        <table class="w-full text-sm min-w-[640px]">
          <thead>
            <tr class="text-gray-500 border-b border-gray-100 bg-gray-50/50">
              <th class="text-left px-4 py-3 font-medium">Nomi</th>
              <th class="text-left px-4 py-3 font-medium">ID</th>
              <th class="text-left px-4 py-3 font-medium">Boshlanish</th>
              <th class="text-left px-4 py-3 font-medium">Holat</th>
              <th class="text-left px-4 py-3 font-medium">Ro'yxat</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="trip in filteredTrips"
              :key="trip.trip_id"
              class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-gray-900">{{ trip.name }}</td>
              <td class="px-4 py-3 text-gray-500 font-mono text-xs">{{ trip.trip_id }}</td>
              <td class="px-4 py-3 text-gray-500">{{ trip.start_date || '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="trip.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'"
                >
                  {{ trip.is_active ? 'Aktiv' : 'Arxiv' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="trip.registration_open ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'"
                >
                  {{ trip.registration_open ? 'Ochiq' : 'Yopiq' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <router-link
                  :to="`/team/trips/${trip.trip_id}`"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-3xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium border border-amber-200 transition-colors"
                >
                  <font-awesome-icon icon="eye" class="w-3.5 h-3.5" />
                  Ko'rish
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
   
    <Transition name="modal">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">Yangi safar</h3>
          </div>
          <form @submit.prevent="createTrip" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Safar ID</label>
              <input v-model="form.trip_id" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="masalan: dubai-2026" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
              <input v-model="form.name" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="Dubai safari 2026" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Boshlanish sanasi</label>
                <input v-model="form.start_date" type="date" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tugash sanasi</label>
                <input v-model="form.end_date" type="date" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Guruh invite link</label>
              <input v-model="form.group_invite_link" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="https://t.me/..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Guruh chat ID</label>
              <input v-model="form.group_chat_id" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="-100..." />
            </div>
            <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
          </form>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
            <button @click="createTrip" :disabled="saving" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
              {{ saving ? 'Yaratilmoqda...' : 'Yaratish' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { useTripsStore } from '../../stores/trips'

const tripsStore = useTripsStore()

const activeTab = ref<'active' | 'inactive'>('active')
const search = ref('')
const modalOpen = ref(false)
const saving = ref(false)
const error = ref('')

const tabs = [
  { value: 'active' as const, label: 'Aktiv' },
  { value: 'inactive' as const, label: 'Arxiv' },
]

const form = reactive({
  trip_id: '',
  name: '',
  start_date: '',
  end_date: '',
  group_invite_link: '',
  group_chat_id: '',
})

const filteredTrips = computed(() => {
  const list = activeTab.value === 'active' ? tripsStore.items : tripsStore.inactive
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter(t => t.name.toLowerCase().includes(q) || t.trip_id.toLowerCase().includes(q))
})

function closeModal() {
  modalOpen.value = false
  Object.assign(form, { trip_id: '', name: '', start_date: '', end_date: '', group_invite_link: '', group_chat_id: '' })
  error.value = ''
}

async function createTrip() {
  if (!form.trip_id || !form.name) return
  saving.value = true
  error.value = ''
  try {
    await tripsStore.createTrip({
      trip_id: form.trip_id,
      name: form.name,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      group_invite_link: form.group_invite_link || null,
      group_chat_id: form.group_chat_id || null,
    })
    closeModal()
  } catch {
    error.value = 'Xatolik yuz berdi'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  tripsStore.fetchTrips()
  tripsStore.fetchInactive()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active > div, .modal-leave-active > div { transition: opacity 0.2s ease, transform 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div, .modal-leave-to > div { opacity: 0; transform: scale(0.95) translateY(10px); }
</style>

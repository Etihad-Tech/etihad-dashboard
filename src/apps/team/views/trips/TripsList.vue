<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Safarlar</h1>
        <button class="btn btn-primary" @click="modalOpen = true">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi safar
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="seg">
          <button v-for="tab in tabs" :key="tab.value" class="seg-btn" :class="{ 'seg-btn-on': activeTab === tab.value }"
            @click="activeTab = tab.value">
            {{ tab.label }}
          </button>
        </div>
        <input v-model="search" type="text" placeholder="Qidirish" class="input sm:max-w-xs" />
      </div>

      <div v-if="tripsStore.loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="filteredTrips.length === 0" class="card empty">
        {{ search ? 'Natija topilmadi' : "Safarlar yo'q" }}
      </div>

      <div v-else class="card overflow-x-auto">
        <table class="table min-w-[640px]">
          <thead>
            <tr>
              <th>Nomi</th>
              <th>ID</th>
              <th>Boshlanish</th>
              <th>Holat</th>
              <th>Ro'yxat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trip in filteredTrips" :key="trip.trip_id" class="cursor-pointer"
              @click="router.push(`/team/trips/${trip.trip_id}`)">
              <td class="font-medium text-gray-900">{{ trip.name }}</td>
              <td class="text-gray-500 font-mono text-xs">{{ trip.trip_id }}</td>
              <td class="text-gray-500 whitespace-nowrap">{{ trip.start_date || '—' }}</td>
              <td>
                <span class="chip" :class="trip.is_active ? 'chip-green' : 'chip-gray'">
                  {{ trip.is_active ? 'Aktiv' : 'Arxiv' }}
                </span>
              </td>
              <td>
                <span class="chip" :class="trip.registration_open ? 'chip-blue' : 'chip-gray'">
                  {{ trip.registration_open ? 'Ochiq' : 'Yopiq' }}
                </span>
              </td>
              <td class="text-right">
                <router-link :to="`/team/trips/${trip.trip_id}`" class="icon-btn" title="Ochish" @click.stop>
                  <font-awesome-icon icon="chevron-right" class="w-3.5 h-3.5" />
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal :open="modalOpen" title="Yangi safar" @close="closeModal">
      <form class="space-y-4" @submit.prevent="createTrip">
        <div>
          <label class="label">Safar ID</label>
          <input v-model="form.trip_id" required class="input" placeholder="dubai-2026" />
        </div>
        <div>
          <label class="label">Nomi</label>
          <input v-model="form.name" required class="input" placeholder="Dubai safari 2026" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Boshlanish</label>
            <input v-model="form.start_date" type="date" class="input" />
          </div>
          <div>
            <label class="label">Tugash</label>
            <input v-model="form.end_date" type="date" class="input" />
          </div>
        </div>
        <div>
          <label class="label">Guruh havolasi</label>
          <input v-model="form.group_invite_link" class="input" placeholder="https://t.me/..." />
        </div>
        <div>
          <label class="label">Guruh chat ID</label>
          <input v-model="form.group_chat_id" class="input" placeholder="-100..." />
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="saving" @click="createTrip">
          {{ saving ? 'Yaratilmoqda...' : 'Yaratish' }}
        </button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import BaseModal from '../../../../components/BaseModal.vue'
import { useTripsStore } from '../../stores/trips'

const router = useRouter()
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

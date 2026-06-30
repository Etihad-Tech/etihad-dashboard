<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Audit jurnali</h2>
        <p class="text-sm text-gray-500 mt-1">Dashboarddagi har bir oʻzgarish — kim, nima va qachon oʻzgartirgani</p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-3xl border border-gray-200 p-4 animate-fade-up">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="block text-[11px] text-gray-400 mb-1">Foydalanuvchi</label>
            <input v-model="filters.actor" type="text" placeholder="username"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label class="block text-[11px] text-gray-400 mb-1">Boʻlim</label>
            <select v-model="filters.entity" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Barchasi</option>
              <option v-for="e in ENTITIES" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] text-gray-400 mb-1">Amal</label>
            <select v-model="filters.action" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Barchasi</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] text-gray-400 mb-1">Sanadan</label>
            <input v-model="filters.date_from" type="date"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label class="block text-[11px] text-gray-400 mb-1">Sanagacha</label>
            <input v-model="filters.date_to" type="date"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>
        <div class="flex items-center gap-2 mt-3">
          <button @click="applyFilters" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors">Filtrlash</button>
          <button @click="resetFilters" class="px-4 py-2 text-gray-500 hover:bg-gray-100 text-sm font-medium rounded-2xl transition-colors">Tozalash</button>
          <span class="text-xs text-gray-400 ml-auto">Jami: {{ store.total }}</span>
        </div>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="store.items.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up">
        <font-awesome-icon icon="database" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Yozuvlar topilmadi</p>
      </div>

      <div v-else class="bg-white rounded-3xl border border-gray-200 overflow-hidden animate-fade-up">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th class="px-4 py-3 font-semibold">Vaqt</th>
                <th class="px-4 py-3 font-semibold">Kim</th>
                <th class="px-4 py-3 font-semibold">Amal</th>
                <th class="px-4 py-3 font-semibold">Boʻlim</th>
                <th class="px-4 py-3 font-semibold">Tafsilot</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in store.items" :key="e.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ fmt(e.created_at) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="font-medium text-gray-900">{{ e.actor }}</span>
                  <span v-if="e.actor_role" class="text-gray-400"> · {{ e.actor_role }}</span>
                  <span v-if="e.source === 'bot'" class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">bot</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-[11px] px-2 py-0.5 rounded-lg font-medium" :class="actionClass(e.action)">{{ e.action }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ e.entity }}<span v-if="e.entity_id" class="text-gray-400"> #{{ e.entity_id }}</span></td>
                <td class="px-4 py-3 text-gray-700">{{ e.summary }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button @click="prevPage" :disabled="offset === 0"
            class="px-3 py-1.5 text-sm rounded-2xl text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">← Oldingi</button>
          <span class="text-xs text-gray-400">{{ offset + 1 }}–{{ Math.min(offset + limit, store.total) }} / {{ store.total }}</span>
          <button @click="nextPage" :disabled="offset + limit >= store.total"
            class="px-3 py-1.5 text-sm rounded-2xl text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">Keyingi →</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { useAuditLogStore } from '../../../stores/auditLog'

const store = useAuditLogStore()

const ENTITIES = ['hotel', 'group', 'qa', 'staff', 'admin', 'blacklist', 'template', 'prompt', 'ellikboshi', 'inquiry_tag', 'flight', 'flight_exception', 'trouble_video']

const filters = ref({ actor: '', entity: '', action: '', date_from: '', date_to: '' })
const limit = 50
const offset = ref(0)

function actionClass(a: string) {
  if (a === 'CREATE') return 'bg-emerald-50 text-emerald-600'
  if (a === 'DELETE') return 'bg-rose-50 text-rose-600'
  return 'bg-sky-50 text-sky-600'
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  await store.fetch({ ...filters.value, limit, offset: offset.value })
}

function applyFilters() {
  offset.value = 0
  load()
}

function resetFilters() {
  filters.value = { actor: '', entity: '', action: '', date_from: '', date_to: '' }
  offset.value = 0
  load()
}

function prevPage() {
  if (offset.value === 0) return
  offset.value = Math.max(0, offset.value - limit)
  load()
}

function nextPage() {
  if (offset.value + limit >= store.total) return
  offset.value += limit
  load()
}

onMounted(load)
</script>

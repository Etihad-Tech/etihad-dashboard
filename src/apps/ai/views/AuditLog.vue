<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Audit jurnali</h1>
        <span class="text-sm text-gray-400">{{ store.total }}</span>
      </div>

      <div class="card p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="label">Foydalanuvchi</label>
            <input v-model="filters.actor" type="text" placeholder="username" class="input" />
          </div>
          <div>
            <label class="label">Boʻlim</label>
            <select v-model="filters.entity" class="input">
              <option value="">Barchasi</option>
              <option v-for="e in ENTITIES" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div>
            <label class="label">Amal</label>
            <select v-model="filters.action" class="input">
              <option value="">Barchasi</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label class="label">Sanadan</label>
            <input v-model="filters.date_from" type="date" class="input" />
          </div>
          <div>
            <label class="label">Sanagacha</label>
            <input v-model="filters.date_to" type="date" class="input" />
          </div>
        </div>
        <div class="flex items-center gap-2 mt-3">
          <button class="btn btn-primary" @click="applyFilters">Filtrlash</button>
          <button class="btn btn-ghost" @click="resetFilters">Tozalash</button>
        </div>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="store.items.length === 0" class="card empty">Yozuvlar topilmadi</div>

      <div v-else class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Kim</th>
                <th>Amal</th>
                <th>Boʻlim</th>
                <th>Tafsilot</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in store.items" :key="e.id">
                <td class="text-gray-500 whitespace-nowrap">{{ fmt(e.created_at) }}</td>
                <td class="whitespace-nowrap">
                  <span class="font-medium text-gray-900">{{ e.actor }}</span>
                  <span v-if="e.actor_role" class="text-gray-400"> · {{ e.actor_role }}</span>
                  <span v-if="e.source === 'bot'" class="chip chip-gray ml-1">bot</span>
                </td>
                <td><span class="chip" :class="actionClass(e.action)">{{ e.action }}</span></td>
                <td class="text-gray-600 whitespace-nowrap">{{ e.entity }}<span v-if="e.entity_id" class="text-gray-400"> #{{ e.entity_id }}</span></td>
                <td class="text-gray-700 min-w-[16rem]">{{ e.summary }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button class="btn btn-sm btn-ghost" :disabled="offset === 0" @click="prevPage">
            <font-awesome-icon icon="chevron-left" class="w-3 h-3" /> Oldingi
          </button>
          <span class="text-xs text-gray-400">{{ offset + 1 }}–{{ Math.min(offset + limit, store.total) }} / {{ store.total }}</span>
          <button class="btn btn-sm btn-ghost" :disabled="offset + limit >= store.total" @click="nextPage">
            Keyingi <font-awesome-icon icon="chevron-right" class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import { useAuditLogStore } from '../../../stores/auditLog'

const store = useAuditLogStore()

const ENTITIES = ['hotel', 'group', 'qa', 'staff', 'admin', 'blacklist', 'template', 'prompt', 'ellikboshi', 'inquiry_tag', 'flight', 'flight_exception', 'trouble_video']

const filters = ref({ actor: '', entity: '', action: '', date_from: '', date_to: '' })
const limit = 50
const offset = ref(0)

function actionClass(a: string) {
  if (a === 'CREATE') return 'chip-green'
  if (a === 'DELETE') return 'chip-red'
  return 'chip-blue'
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

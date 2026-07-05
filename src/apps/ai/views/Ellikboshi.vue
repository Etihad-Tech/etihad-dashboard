<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Ellikboshilar</h2>
        <p class="text-sm text-gray-500 mt-1">Ellikboshilar ro'yxatini boshqaring va har bir guruhga ellikboshi tayinlang</p>
        <p class="text-xs text-gray-400 mt-1">Faqat Turon tizimida safarga biriktirilgan guruhlar ko'rsatiladi.</p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <!-- Pool management -->
        <div class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up">
          <h3 class="text-base font-semibold text-gray-900 mb-1">Ellikboshilar ro'yxati ({{ pool.length }})</h3>
          <p class="text-xs text-gray-400 mb-4">Pastdagi guruhlarga shu ro'yxatdan ellikboshi tanlaysiz. Yangi ellikboshi qo'shing yoki olib tashlang.</p>

          <div class="flex flex-wrap gap-2 mb-4">
            <span v-for="e in pool" :key="e.id" class="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full pl-3 pr-1.5 py-1 text-xs">
              <span class="font-medium text-gray-700">{{ e.name || e.username }}</span>
              <span v-if="e.name" class="text-gray-400">{{ e.username }}</span>
              <button @click="removeFromPool(e)" :disabled="poolBusy" title="O'chirish" class="w-5 h-5 rounded-full text-gray-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
                <font-awesome-icon icon="xmark" class="w-2.5 h-2.5" />
              </button>
            </span>
            <span v-if="!pool.length" class="text-xs text-gray-400">Ro'yxat bo'sh — quyida qo'shing.</span>
          </div>

          <div class="flex flex-wrap items-end gap-2">
            <div>
              <label class="block text-[11px] text-gray-400 mb-1">@username</label>
              <input v-model="newUsername" type="text" placeholder="@username" class="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 mb-1">Ismi (ixtiyoriy)</label>
              <input v-model="newName" type="text" placeholder="Masalan: Akmal qori" class="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <button @click="addToPool" :disabled="poolBusy || !newUsername.trim()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">Qo'shish</button>
          </div>
          <p v-if="poolError" class="text-xs text-rose-600 mt-2">{{ poolError }}</p>
          <p class="text-[11px] text-gray-400 mt-2">Eslatma: ellikboshi botdan DM olishi uchun avval botga /start bosishi kerak.</p>
        </div>

        <!-- Per-group assignment -->
        <div class="flex items-center gap-3 animate-fade-up">
          <font-awesome-icon icon="users" class="w-4 h-4 text-amber-600" />
          <h3 class="text-base font-semibold text-gray-900">Guruhlar ({{ filteredGroups.length }})</h3>
          <input v-model="search" type="text" placeholder="Guruhni qidirish..." class="ml-auto bg-white border border-gray-200 rounded-2xl px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        <div v-if="!filteredGroups.length" class="text-center py-10 text-sm text-gray-400">Guruh topilmadi.</div>
        <div v-else class="grid gap-3">
          <div v-for="g in filteredGroups" :key="g.id" class="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 animate-fade-up">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate">{{ g.title || g.id }}</p>
              <p v-if="!g.ellikboshi_username" class="text-[11px] text-amber-600 mt-0.5">Ellikboshi tayinlanmagan</p>
            </div>
            <select :value="g.ellikboshi_username || ''" @change="onAssign(g, $event)" :disabled="savingId === g.id"
              class="w-56 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50">
              <option value="">— tanlanmagan —</option>
              <option v-for="o in optionsFor(g)" :key="o" :value="o">{{ poolLabel(o) }}</option>
            </select>
            <span v-if="savedId === g.id" class="text-emerald-600 shrink-0"><font-awesome-icon icon="circle" class="w-2 h-2" /></span>
            <span v-else class="w-2 shrink-0"></span>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'
import { useConfirm } from '../../../composables/useConfirm'

interface Ellik { id: number; username: string; name: string | null; is_active: boolean }
interface Grp { id: number; title: string | null; ellikboshi_username: string | null }

const loading = ref(false)
const pool = ref<Ellik[]>([])
const groups = ref<Grp[]>([])

const newUsername = ref('')
const newName = ref('')
const poolBusy = ref(false)
const poolError = ref('')

const search = ref('')
const savingId = ref<number | null>(null)
const savedId = ref<number | null>(null)

// Unassigned groups first (so the mingboshi sees what still needs a leader).
const filteredGroups = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = q ? groups.value.filter(g => (g.title || '').toLowerCase().includes(q)) : groups.value
  return [...list].sort((a, b) => Number(!!a.ellikboshi_username) - Number(!!b.ellikboshi_username))
})

function poolLabel(username: string) {
  const e = pool.value.find(x => x.username.toLowerCase() === username.toLowerCase())
  return e?.name ? `${e.name} (${e.username})` : username
}
// Pool usernames + the group's current value if it isn't in the pool (so it's not lost).
function optionsFor(g: Grp) {
  const opts = pool.value.map(e => e.username)
  if (g.ellikboshi_username && !opts.some(u => u.toLowerCase() === g.ellikboshi_username!.toLowerCase())) {
    opts.push(g.ellikboshi_username)
  }
  return opts
}

async function loadAll() {
  loading.value = true
  try {
    const [p, gr] = await Promise.all([api.get('/ellikboshilar'), api.get('/groups')])
    pool.value = p.data
    groups.value = gr.data
  } catch {
    pool.value = []
    groups.value = []
  } finally {
    loading.value = false
  }
}

async function addToPool() {
  const u = newUsername.value.trim()
  if (!u) return
  poolBusy.value = true
  poolError.value = ''
  try {
    const { data } = await api.post('/ellikboshilar', { username: u, name: newName.value.trim() || null })
    const idx = pool.value.findIndex(x => x.id === data.id)
    if (idx !== -1) pool.value[idx] = data
    else pool.value.push(data)
    newUsername.value = ''
    newName.value = ''
  } catch (e: any) {
    poolError.value = e?.response?.data?.detail || "Qo'shishda xatolik"
  } finally {
    poolBusy.value = false
  }
}

const { confirm } = useConfirm()

async function removeFromPool(e: Ellik) {
  if (!(await confirm({ title: "Ro'yxatdan o'chirish", message: `"${e.name || e.username}" ro'yxatdan o'chirilsinmi?` }))) return
  poolBusy.value = true
  try {
    await api.delete(`/ellikboshilar/${e.id}`)
    pool.value = pool.value.filter(x => x.id !== e.id)
  } catch {
    /* ignore */
  } finally {
    poolBusy.value = false
  }
}

async function onAssign(g: Grp, event: Event) {
  const username = (event.target as HTMLSelectElement).value
  savingId.value = g.id
  savedId.value = null
  try {
    await api.put(`/groups/${g.id}/location/public`, { ellikboshi_username: username })
    const idx = groups.value.findIndex(x => x.id === g.id)
    if (idx !== -1) groups.value[idx].ellikboshi_username = username || null
    savedId.value = g.id
    setTimeout(() => { if (savedId.value === g.id) savedId.value = null }, 2000)
  } catch {
    /* ignore */
  } finally {
    savingId.value = null
  }
}

onMounted(loadAll)
</script>

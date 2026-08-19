<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Ellikboshilar</h2>
        <p class="text-sm text-gray-500 mt-1">Ellikboshilar ro'yxatini boshqaring va har bir guruhga ellikboshi tayinlang</p>
        <p class="text-xs text-gray-400 mt-1">
          Faqat Turon tizimida safarga biriktirilgan guruhlar ko'rsatiladi.
          Bitta guruhni Makkada bir ellikboshi, Madinada boshqasi olib borishi mumkin —
          kerak bo'lsa guruh kartochkasidan shaharlar bo'yicha ajrating.
        </p>
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
          <!-- One card per group. The DEFAULT shape is the old one — a single select —
               because one leader for the whole trip is still the normal case and making
               every group ask two questions to answer one would be a worse screen than
               the one it replaced. The split is opened per group, by the person who
               actually needs it, and a group that already IS split opens itself. -->
          <div v-for="g in filteredGroups" :key="g.id" class="bg-white rounded-2xl border border-gray-200 p-4 animate-fade-up">
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 truncate">{{ g.title || g.id }}</p>
                <p v-if="!leaderOf(g)" class="text-[11px] text-amber-600 mt-0.5">Ellikboshi tayinlanmagan</p>
                <p v-else-if="isSplit(g) && (!g.ellikboshi_makka || !g.ellikboshi_madina)"
                   class="text-[11px] text-amber-600 mt-0.5">
                  {{ g.ellikboshi_makka ? 'Madina' : 'Makka' }} uchun ellikboshi tanlanmagan
                </p>
              </div>
              <span v-if="savedId === g.id" class="text-emerald-600 shrink-0"><font-awesome-icon icon="circle" class="w-2 h-2" /></span>
              <span v-else class="w-2 shrink-0"></span>
            </div>

            <!-- SINGLE leader: one select, one save, both cities written together. -->
            <div v-if="!expanded(g)" class="mt-3 flex flex-wrap items-center gap-2">
              <select :value="leaderOf(g)" @change="onAssign(g, 'both', $event)" :disabled="savingId === g.id"
                class="flex-1 min-w-[13rem] bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50">
                <option value="">— tanlanmagan —</option>
                <option v-for="o in optionsFor(g)" :key="o" :value="o">{{ poolLabel(o) }}</option>
              </select>
              <button type="button" @click="openSplit(g)"
                class="text-[12px] text-amber-700 hover:text-amber-800 hover:underline whitespace-nowrap px-1">
                Shaharlar bo'yicha ajratish
              </button>
              <!-- §4.2 — WHY this person got the group. Not a label: «Natija bo'yicha»
                   carries the bonus coefficient K, the other two do not. Shown only once
                   a leader is chosen — a reason for an assignment nobody made is noise. -->
              <select v-if="leaderOf(g)" :value="typeOf(g, 'makka')"
                @change="onType(g, 'both', $event)" :disabled="savingId === g.id"
                class="min-w-[11rem] bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50">
                <option value="">Sabab — tanlanmagan</option>
                <option v-for="t in TYPES" :key="t.code" :value="t.code">{{ t.title }}</option>
              </select>
            </div>

            <!-- SPLIT: one select per city. Makka first — it is the heavier half. -->
            <div v-else class="mt-3 space-y-2">
              <div v-for="c in CITIES" :key="c.key" class="flex flex-wrap items-center gap-2">
                <span class="w-16 shrink-0 text-[12px] text-gray-500">{{ c.label }}</span>
                <select :value="cityLeader(g, c.key)" @change="onAssign(g, c.key, $event)" :disabled="savingId === g.id"
                  class="flex-1 min-w-[9rem] bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50">
                  <option value="">— tanlanmagan —</option>
                  <option v-for="o in optionsFor(g)" :key="o" :value="o">{{ poolLabel(o) }}</option>
                </select>
                <!-- Per CITY: one group can be a reward in Makka and a stopgap in
                     Madina, because those are two assignments to two people. -->
                <select v-if="cityLeader(g, c.key)" :value="typeOf(g, c.key)"
                  @change="onType(g, c.key, $event)" :disabled="savingId === g.id"
                  class="min-w-[10rem] bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50">
                  <option value="">Sabab — tanlanmagan</option>
                  <option v-for="t in TYPES" :key="t.code" :value="t.code">{{ t.title }}</option>
                </select>
              </div>
              <div class="flex items-center gap-3 pt-0.5">
                <p class="text-[11px] text-gray-400 flex-1">Jidda kuni Makka ellikboshisiga biriktiriladi.</p>
                <button v-if="!isSplit(g)" type="button" @click="closeSplit(g)"
                  class="text-[12px] text-gray-400 hover:text-gray-600 hover:underline whitespace-nowrap">
                  Bekor qilish
                </button>
              </div>
            </div>
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
import { useToast } from '../../../composables/useToast'

interface Ellik { id: number; username: string; name: string | null; is_active: boolean }
// ellikboshi_username is the LEGACY single-leader field, kept as the fallback for a
// group nobody has re-assigned; the two city columns are the assignment (owner,
// 2026-08-16). Migration 041 backfilled both from the legacy one, so on the morning
// after the deploy every group here reads as "one leader, both cities".
interface Grp {
  id: number; title: string | null
  ellikboshi_username: string | null
  ellikboshi_makka: string | null
  ellikboshi_madina: string | null
  assignment_type_makka: string | null
  assignment_type_madina: string | null
}

type City = 'makka' | 'madina'
const CITIES: { key: City; label: string }[] = [
  // Makka first: it is the heavier half (0.6), and the reading order should say so.
  { key: 'makka', label: 'Makka' },
  { key: 'madina', label: 'Madina' },
]

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

/** WHO leads this group in a city — the client-side mirror of the server's
 *  group_leader_for_city: the city column, falling back to the legacy one. */
function cityLeader(g: Grp, c: City) {
  return (c === 'makka' ? g.ellikboshi_makka : g.ellikboshi_madina) || g.ellikboshi_username || ''
}
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
/** Two different people across the two cities — the state the split UI exists for. */
function isSplit(g: Grp) {
  return !same(cityLeader(g, 'makka'), cityLeader(g, 'madina'))
}
/** The one leader, when there is one. Empty on a split group (the card shows both
 *  selects then, so there is nothing for this to be). */
function leaderOf(g: Grp) {
  return isSplit(g) ? '' : cityLeader(g, 'makka')
}

// Groups the user has manually opened for splitting. A group that is ALREADY split is
// always open — that is a fact about the data, not a UI preference, and collapsing it
// would hide one of its two leaders behind a single select that cannot show both.
const opened = ref<Set<number>>(new Set())
function expanded(g: Grp) { return isSplit(g) || opened.value.has(g.id) }
function openSplit(g: Grp) { opened.value = new Set(opened.value).add(g.id) }
function closeSplit(g: Grp) {
  const n = new Set(opened.value); n.delete(g.id); opened.value = n
}

// Unassigned groups first (so the mingboshi sees what still needs a leader).
const filteredGroups = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = q ? groups.value.filter(g => (g.title || '').toLowerCase().includes(q)) : groups.value
  return [...list].sort((a, b) => Number(!!cityLeader(a, 'makka') || !!cityLeader(a, 'madina'))
    - Number(!!cityLeader(b, 'makka') || !!cityLeader(b, 'madina')))
})

function poolLabel(username: string) {
  const e = pool.value.find(x => x.username.toLowerCase() === username.toLowerCase())
  return e?.name ? `${e.name} (${e.username})` : username
}
// Pool usernames + any value this group already carries that isn't in the pool, so a
// leader removed from the list is never silently dropped off the group they still run.
function optionsFor(g: Grp) {
  const opts = pool.value.map(e => e.username)
  for (const u of [g.ellikboshi_makka, g.ellikboshi_madina, g.ellikboshi_username]) {
    if (u && !opts.some(o => same(o, u))) opts.push(u)
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
const toast = useToast()

async function removeFromPool(e: Ellik) {
  if (!(await confirm({ title: "Ro'yxatdan o'chirish", message: `"${e.name || e.username}" ro'yxatdan o'chirilsinmi?` }))) return
  poolBusy.value = true
  try {
    await api.delete(`/ellikboshilar/${e.id}`)
    pool.value = pool.value.filter(x => x.id !== e.id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirishda xatolik yuz berdi")
  } finally {
    poolBusy.value = false
  }
}

/** Assign a leader to ONE city, or to both at once from the single-select shape.
 *
 *  All three fields are always sent. The legacy column is kept in step with the Makka
 *  leader (or the Madina one when only that half is filled) so the screens that still
 *  read it — Home, Guruhlar — name somebody who is really on this group rather than
 *  whoever was on it before the split; the bot itself never reads it while a city
 *  column is set. Sending the city fields explicitly also switches OFF the server's
 *  old-dashboard mirror, so assigning one city can never overwrite the other. */
/** §4.2 — the three reasons an assignment exists, named as the reglament names them.
 *  What each one pays is the reglament's business and stays there: «natija» carries the
 *  bonus coefficient, «majburiy» the §9.2 relief, «tashkiliy» neither. */
const TYPES = [
  { code: 'natija', title: "Natija bo'yicha" },
  { code: 'majburiy', title: 'Majburiy' },
  { code: 'tashkiliy', title: 'Tashkiliy' },
]

function typeOf(g: Grp, city: City): string {
  return (city === 'makka' ? g.assignment_type_makka : g.assignment_type_madina) || ''
}

/** Saves the REASON alone, leaving the people untouched. Sent as its own request
 *  rather than folded into onAssign, because changing why somebody holds a group is
 *  not a handover — the history records a correction, not a new leader. */
async function onType(g: Grp, city: City | 'both', event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const makka = city === 'madina' ? typeOf(g, 'makka') : value
  const madina = city === 'makka' ? typeOf(g, 'madina') : value
  savingId.value = g.id
  savedId.value = null
  try {
    await api.put(`/groups/${g.id}/location/public`, {
      assignment_type_makka: makka,
      assignment_type_madina: madina,
    })
    const idx = groups.value.findIndex(x => x.id === g.id)
    if (idx !== -1) {
      groups.value[idx].assignment_type_makka = makka || null
      groups.value[idx].assignment_type_madina = madina || null
    }
    savedId.value = g.id
    setTimeout(() => { if (savedId.value === g.id) savedId.value = null }, 2000)
  } catch {
    toast.error('Saqlanmadi — qayta urinib ko\'ring')
  } finally {
    savingId.value = null
  }
}

async function onAssign(g: Grp, city: City | 'both', event: Event) {
  const username = (event.target as HTMLSelectElement).value
  const makka = city === 'madina' ? cityLeader(g, 'makka') : username
  const madina = city === 'makka' ? cityLeader(g, 'madina') : username
  savingId.value = g.id
  savedId.value = null
  try {
    await api.put(`/groups/${g.id}/location/public`, {
      ellikboshi_makka: makka,
      ellikboshi_madina: madina,
      ellikboshi_username: makka || madina,
    })
    const idx = groups.value.findIndex(x => x.id === g.id)
    if (idx !== -1) {
      groups.value[idx].ellikboshi_makka = makka || null
      groups.value[idx].ellikboshi_madina = madina || null
      groups.value[idx].ellikboshi_username = makka || madina || null
    }
    savedId.value = g.id
    setTimeout(() => { if (savedId.value === g.id) savedId.value = null }, 2000)
  } catch {
    toast.error('Saqlanmadi — qayta urinib ko\'ring')
  } finally {
    savingId.value = null
  }
}

onMounted(loadAll)
</script>

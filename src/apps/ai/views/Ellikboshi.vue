<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Ellikboshilar</h1>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <template v-else>
        <!-- Pool management -->
        <div class="card p-4 space-y-3">
          <div class="flex items-center gap-2">
            <span class="section-title">Ro'yxat</span>
            <span class="chip chip-gray">{{ pool.length }}</span>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <span v-for="e in pool" :key="e.id" class="inline-flex items-center gap-1.5 h-7 bg-amber-50 border border-amber-100 rounded-full pl-3 pr-1 text-xs">
              <span class="font-medium text-gray-800">{{ e.name || e.username }}</span>
              <span v-if="e.name" class="text-gray-400">{{ e.username }}</span>
              <button :disabled="poolBusy" title="O'chirish"
                class="w-5 h-5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                @click="removeFromPool(e)">
                <font-awesome-icon icon="xmark" class="w-2.5 h-2.5" />
              </button>
            </span>
            <span v-if="!pool.length" class="text-sm text-gray-400">Ro'yxat bo'sh</span>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            <input v-model="newUsername" type="text" placeholder="@username" class="input w-44" @keyup.enter="addToPool" />
            <input v-model="newName" type="text" placeholder="Ism" class="input w-48" @keyup.enter="addToPool" />
            <button class="btn btn-primary" :disabled="poolBusy || !newUsername.trim()" @click="addToPool">
              <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
              Qo'shish
            </button>
          </div>
          <p v-if="poolError" class="error-text">{{ poolError }}</p>
        </div>

        <!-- Per-group assignment -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="section-title">Guruhlar</span>
          <span class="chip chip-gray">{{ filteredGroups.length }}</span>
          <div class="relative ml-auto w-full sm:w-60">
            <font-awesome-icon icon="magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input v-model="search" type="text" placeholder="Qidirish" class="input pl-9" />
          </div>
        </div>

        <div v-if="!filteredGroups.length" class="card empty">Guruh topilmadi</div>
        <div v-else class="card divide-y divide-gray-100">
          <!-- One row per group. The DEFAULT shape is the old one — a single select —
               because one leader for the whole trip is still the normal case and making
               every group ask two questions to answer one would be a worse screen than
               the one it replaced. The split is opened per group, by the person who
               actually needs it, and a group that already IS split opens itself. -->
          <div v-for="g in filteredGroups" :key="g.id" class="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 px-4 py-3">
            <div class="min-w-0 md:w-72 md:shrink-0 md:pt-2">
              <div class="flex items-center gap-2 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ g.title || g.id }}</p>
                <font-awesome-icon v-if="savedId === g.id" icon="circle-check" class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
              <!-- «Not assigned» means NOBODY leads this group in EITHER city. It used to
                   test `leaderOf`, which is empty by definition on a SPLIT group (two people,
                   no single leader to name) — so every group split between cities was
                   flagged as unassigned with both leaders sitting right under the line. -->
              <span v-if="!cityLeader(g, 'makka') && !cityLeader(g, 'madina')" class="chip chip-amber mt-1">Tayinlanmagan</span>
              <span v-else-if="isSplit(g) && (!g.ellikboshi_makka || !g.ellikboshi_madina)" class="chip chip-amber mt-1">
                {{ g.ellikboshi_makka ? 'Madina' : 'Makka' }} tanlanmagan
              </span>
            </div>

            <!-- SINGLE leader: one select, one save, both cities written together. -->
            <div v-if="!expanded(g)" class="flex flex-1 flex-wrap items-center gap-2">
              <select :value="leaderOf(g)" :disabled="savingId === g.id" class="input flex-1 min-w-[12rem]"
                @change="onAssign(g, 'both', $event)">
                <option value="">— tanlanmagan —</option>
                <option v-for="o in optionsFor(g)" :key="o" :value="o">{{ poolLabel(o) }}</option>
              </select>
              <button type="button" class="btn btn-sm btn-ghost" @click="openSplit(g)">Shahar bo'yicha</button>
            </div>

            <!-- SPLIT: one select per city. Makka first — it is the heavier half. -->
            <div v-else class="flex-1 space-y-2">
              <div v-for="c in CITIES" :key="c.key" class="flex items-center gap-2">
                <span class="w-14 shrink-0 text-xs font-medium text-gray-500">{{ c.label }}</span>
                <select :value="cityLeader(g, c.key)" :disabled="savingId === g.id" class="input flex-1 min-w-0"
                  @change="onAssign(g, c.key, $event)">
                  <option value="">— tanlanmagan —</option>
                  <option v-for="o in optionsFor(g)" :key="o" :value="o">{{ poolLabel(o) }}</option>
                </select>
              </div>
              <div v-if="!isSplit(g)" class="flex justify-end">
                <button type="button" class="btn btn-sm btn-ghost" @click="closeSplit(g)">Bekor qilish</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
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
  if (!(await confirm({ title: `${e.name || e.username} — o'chirish` }))) return
  poolBusy.value = true
  try {
    await api.delete(`/ellikboshilar/${e.id}`)
    pool.value = pool.value.filter(x => x.id !== e.id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
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
// The §4.2 «reason» picker (Natija bo'yicha / Majburiy / Tashkiliy) that used to sit
// beside the leader select is gone: every group beyond the limit carries the
// coefficient now (owner, 18.09.2026: «эти категории не нужны, убери их»).
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
    toast.error('Saqlanmadi')
  } finally {
    savingId.value = null
  }
}

onMounted(loadAll)
</script>

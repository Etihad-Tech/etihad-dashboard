<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Guruh sozlamalari</h1>
        <span v-if="!loading" class="text-sm text-gray-500">{{ filtered.length }} ta</span>
        <input v-model="search" type="text" placeholder="Qidirish..." class="input w-full sm:w-56" />
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="!filtered.length" class="card empty">Guruh topilmadi</div>

      <div v-else class="grid gap-3">
        <div v-for="g in filtered" :key="g.id" class="card p-4">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <div class="min-w-0 flex-1 basis-48">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ g.title || g.id }}</p>
              <p class="text-xs text-gray-400 font-mono">{{ g.id }}</p>
            </div>
            <span v-if="savedId === g.id" class="chip chip-green">
              <font-awesome-icon icon="check" class="w-3 h-3" /> Saqlandi
            </span>
            <span v-if="!hasLocation(g)" class="chip chip-red">Kechalar yo'q</span>
            <!-- The CRM binding at a glance. Unbound = the pilgrim cabinet has no group
                 link and no ellikboshi for these pilgrims; the block below fixes it. -->
            <span class="chip" :class="g.crm_link ? 'chip-green' : 'chip-red'"
              :title="g.crm_link ? `CRM: ${g.crm_link.departure_id} / ${g.crm_link.group_index}` : undefined">
              {{ g.crm_link ? `CRM · ${crmLabel(g.crm_link)}` : "CRMga bog'lanmagan" }}
            </span>
            <!-- Fully-silent switch (admin here; the main nazoratchi has the same
                 toggle in the Nazorat panel). Saves IMMEDIATELY via its own
                 endpoint — deliberately independent of the Saqlash button, so
                 silencing a group never rides along with unrelated form edits. -->
            <button v-if="isAdmin" @click="toggleSilent(g)" :disabled="silentSavingId === g.id"
              class="chip transition-colors" :class="g.bot_silent ? 'chip-red' : 'chip-gray hover:bg-gray-200'"
              :title="g.bot_silent ? 'Bot javob yozmaydi' : 'Bot javob beradi'">
              <font-awesome-icon :icon="g.bot_silent ? 'toggle-off' : 'toggle-on'" class="w-3.5 h-3.5" />
              {{ g.bot_silent ? 'Bot jim' : 'Bot faol' }}
            </button>
          </div>

          <!-- CRM BINDING. «This chat is CRM group 006» — the row the pilgrim cabinet's
               group link, invite link and ellikboshi all hang off. Two ways in, one row:
               the bot proposes in the chat and the ellikboshi taps, or the office types
               the season number here and picks the departure. Both call the same server
               function, so whoever binds last moves the CRM group to their chat. Acts
               IMMEDIATELY through its own endpoints, like the Bot JIM switch — it never
               rides along with Saqlash. Admin binds and unbinds; qa sees the state. -->
          <div class="mb-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="w-14 shrink-0 font-medium text-gray-500">CRM</span>
              <template v-if="g.crm_link">
                <span class="font-medium text-gray-800">{{ crmLabel(g.crm_link) }}-guruh</span>
                <span class="text-gray-400" :title="g.crm_link.departure_id">{{ crmWho(g.crm_link) }}</span>
                <button v-if="isAdmin" @click="unbind(g)" :disabled="bindBusyId === g.id"
                  class="btn btn-sm btn-secondary ml-auto hover:text-rose-600">
                  {{ bindBusyId === g.id ? '...' : 'Uzish' }}
                </button>
              </template>
              <template v-else-if="isAdmin">
                <input v-model="bindForm(g.id).season" type="number" min="1" max="999" placeholder="006"
                  @keyup.enter="searchCrm(g)" class="input input-sm w-24" />
                <button @click="searchCrm(g)" :disabled="bindBusyId === g.id || !bindForm(g.id).season"
                  class="btn btn-sm btn-secondary">
                  {{ bindBusyId === g.id && !bindForm(g.id).candidates ? 'Qidirilmoqda...' : 'Qidirish' }}
                </button>
                <span v-if="bindForm(g.id).error" class="text-rose-600">{{ bindForm(g.id).error }}</span>
              </template>
              <span v-else class="text-gray-400">bog'lanmagan</span>
            </div>
            <div v-if="!g.crm_link && isAdmin && bindForm(g.id).candidates" class="flex flex-col gap-1.5 pl-16">
              <p v-if="bindForm(g.id).candidates!.length === 0" class="text-gray-500">Topilmadi</p>
              <label v-for="c in bindForm(g.id).candidates" :key="c.departure_id + ':' + c.group_index"
                class="flex items-center gap-2 cursor-pointer">
                <input type="radio" :name="`crm-${g.id}`" :value="c" v-model="bindForm(g.id).chosen" class="accent-amber-600" />
                <span class="text-gray-800">{{ candidateLabel(c) }}</span>
              </label>
              <div v-if="bindForm(g.id).candidates!.length">
                <button @click="bind(g)" :disabled="!bindForm(g.id).chosen || bindBusyId === g.id"
                  class="btn btn-sm btn-primary">
                  {{ bindBusyId === g.id ? "Bog'lanmoqda..." : "Bog'lash" }}
                </button>
              </div>
            </div>
            <!-- The join link the bot minted (join-request style: pilgrims ask, the CRM
                 match or the ellikboshi approves). Only once the chat is bound. -->
            <div v-if="g.crm_link" class="flex flex-wrap items-center gap-2">
              <span class="w-14 shrink-0 font-medium text-gray-500">Havola</span>
              <template v-if="g.invite_link">
                <a :href="g.invite_link" target="_blank" rel="noopener"
                  class="font-mono text-sky-700 hover:underline truncate max-w-[16rem]">{{ g.invite_link }}</a>
                <button @click="copyLink(g)" class="icon-btn w-7 h-7" title="Nusxalash">
                  <font-awesome-icon icon="copy" class="w-3.5 h-3.5" />
                </button>
              </template>
              <span v-else class="text-amber-700">yo'q · bot admin emas</span>
              <button v-if="isAdmin" @click="remint(g)" :disabled="remintingId === g.id" class="btn btn-sm btn-secondary">
                {{ remintingId === g.id ? 'Yaratilmoqda...' : (g.invite_link ? 'Yangilash' : 'Yaratish') }}
              </button>
              <span v-if="remintError[g.id]" class="text-rose-600">{{ remintError[g.id] }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="col-span-2 sm:col-span-1">
              <label class="label">
                Jo'nash sanasi
                <span v-if="startWeekday(g)" class="font-normal text-gray-400">· {{ startWeekday(g) }}</span>
              </label>
              <input v-model="g.trip_start_date" type="date" class="input" />
            </div>
            <div class="col-span-2 sm:col-span-2">
              <label class="label">Marshrut</label>
              <select v-model="g.order" class="input">
                <option value="makka_madina">{{ routeLabel(g, 'makka_madina') }}</option>
                <option value="madina_makka">{{ routeLabel(g, 'madina_makka') }}</option>
                <option value="makka_only">{{ routeLabel(g, 'makka_only') }}</option>
              </select>
              <p v-if="routeLooksWrong(g)" class="text-xs text-amber-700 mt-1">{{ routeWarning(g) }}</p>
            </div>
            <div class="col-span-2 sm:col-span-1">
              <label class="label">Ellikboshi</label>
              <!-- Picked from the «Ellikboshilar» list, not typed: a typed @username
                   with one wrong letter reached nobody and nothing said so. -->
              <select v-model="g.ellikboshi_username" class="input">
                <option value="">—</option>
                <option v-for="u in leaderOptions(g)" :key="u" :value="u">{{ leaderLabel(u) }}</option>
              </select>
              <!-- This box sets ONE leader for the whole trip. A group split between
                   cities says so rather than pretending the box describes it: leaving
                   it silent would let somebody flatten a split by saving an unrelated
                   field on this card. (Saving it UNCHANGED never does — the server
                   only propagates a value that actually changed.) -->
              <p v-if="isSplit(g)" class="text-xs text-amber-700 mt-1 truncate"
                title="Bu yerda o'zgartirilsa, ikkala shahar ham o'zgaradi">
                Makka {{ g.ellikboshi_makka || '—' }} · Madina {{ g.ellikboshi_madina || '—' }}
              </p>
            </div>
          </div>

          <!-- One row per leg, in travel order: nights and hotel belong to the same
               stay, so they are read and fixed together, and each leg shows the trip
               days it works out to. -->
          <div class="mt-3 rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            <div v-for="leg in legs(g)" :key="leg.city"
              class="flex flex-wrap sm:flex-nowrap items-center gap-2.5 px-3 py-2" :class="leg.nights ? 'bg-white' : 'bg-gray-50/60'">
              <span class="w-1.5 h-6 rounded-full shrink-0" :class="leg.dot"></span>
              <span class="w-14 text-sm font-medium text-gray-700 shrink-0">{{ leg.label }}</span>
              <input v-model="g[leg.nightsKey]" type="number" min="0" placeholder="—" title="Kecha"
                class="input input-sm w-14 text-center" />
              <span class="text-xs text-gray-400 shrink-0">kecha</span>
              <!-- On a phone the hotel takes its own line under the nights. -->
              <select v-model="g[leg.hotelKey]" @change="leg.city === 'makka' && applyHotelTier(g)"
                class="input input-sm order-last sm:order-none basis-full sm:basis-auto sm:flex-1 min-w-0"
                :class="leg.nights && !g[leg.hotelKey] ? 'border-rose-300 ring-1 ring-rose-200' : ''">
                <option value="">— mehmonxona —</option>
                <option v-for="h in hotelOptions(leg.city, g[leg.hotelKey])" :key="h" :value="h">{{ h }}</option>
              </select>
              <span class="ml-auto sm:ml-0 sm:w-20 text-right text-xs shrink-0 tabular-nums"
                :class="leg.nights ? 'text-gray-500' : 'text-gray-300'">{{ leg.days }}</span>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span class="font-medium text-gray-700">{{ summary(g) }}</span>
            <label class="flex items-center gap-1.5 text-gray-500">
              Daraja
              <select v-model="g.hotel_tier" class="input input-sm w-auto">
                <option value="">avtomatik</option>
                <option value="comfort">comfort</option>
                <option value="premium">premium</option>
              </select>
            </label>
            <!-- FORUM TOPIC. A group with a lot of traffic is split into topics: one
                 where the bot answers, one where only announcements are posted. Fill
                 this in and the bot works ONLY in that topic; leave it empty and
                 nothing changes — it answers wherever it is spoken to, as today. -->
            <label class="flex items-center gap-1.5 text-gray-500" title="t.me/c/…/2/15 → 2">
              Bot mavzusi
              <input v-model="g.bot_topic_id" type="number" min="0" placeholder="—"
                class="input input-sm w-16 text-center" />
            </label>
          </div>

          <!-- UMRA DASTURI. Which day-by-day programme this group shows: its own copy,
               its CRM package's programme, or the cell template (days x Daraja) when the
               package has none, or nothing. The package comes from the CRM; the nights
               and Daraja on THIS card still draw the days. -->
          <div v-if="isAdmin && programs[String(g.id)]" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <font-awesome-icon icon="route" class="w-3 h-3 text-gray-400" />
            <span v-if="programs[String(g.id)].package" class="chip chip-gray h-5" title="CRM paketi">{{ programs[String(g.id)].package }}</span>
            <template v-if="programs[String(g.id)].source === 'none'">
              <span class="text-rose-600">{{ programNone(programs[String(g.id)]) }}</span>
            </template>
            <template v-else>
              <span class="font-medium text-gray-700">{{ programs[String(g.id)].program_name }}</span>
              <span class="chip h-5" :class="programs[String(g.id)].source === 'group' ? 'chip-violet' : 'chip-green'">
                {{ programs[String(g.id)].source === 'group' ? 'moslashtirilgan' : 'shablon' }}
              </span>
              <span v-if="programs[String(g.id)].warnings.includes('map_mismatch')" class="text-amber-700">kechalar farq qiladi</span>
              <span v-if="programs[String(g.id)].warnings.includes('package_no_template')" class="text-amber-700">paket dasturi yo'q</span>
              <span v-if="programs[String(g.id)].warnings.includes('tier_inferred')" class="text-amber-700">Daraja avtomatik</span>
              <router-link :to="{ path: '/ai/umra-dasturi', query: { group: String(g.id) } }" class="text-amber-700 font-medium hover:underline">Ochish</router-link>
              <button v-if="programs[String(g.id)].source === 'template'" @click="customizeProgram(g)" :disabled="programSavingId === g.id"
                class="text-gray-500 hover:text-gray-900 disabled:opacity-50">Moslashtirish</button>
              <button v-else @click="revertProgram(g)" :disabled="programSavingId === g.id"
                class="text-gray-500 hover:text-rose-600 disabled:opacity-50">Shablonga qaytarish</button>
            </template>
          </div>

          <div class="flex items-center justify-end gap-3 mt-3">
            <p v-if="errorId === g.id" class="error-text mr-auto">{{ errorMsg }}</p>
            <button @click="save(g)" :disabled="savingId === g.id" class="btn btn-primary">
              {{ savingId === g.id ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import api, { teamApi } from '../../../api'
import { useAuthStore } from '../../../stores/auth'
import { useHotelsStore } from '../../../stores/hotels'
import { useToast } from '../../../composables/useToast'
import { useConfirm } from '../../../composables/useConfirm'
import { byGroupNumber } from '../../../utils/groupOrder'

// Dashboard-managed hotel list (Mehmonxonalar page), filtered by city slot.
// Keeps a group's already-saved hotel in the list even if it was later removed.
const hotelsStore = useHotelsStore()
const hotelOptions = (city: string, current?: string | null) => hotelsStore.optionsForCity(city, current)

// When a Makka hotel is picked, apply its default tier (Taj Park = comfort, etc.)
// to the group — this is what the hotel's `default_tier` is for. The admin can
// still override the tier select afterwards.
function applyHotelTier(g: Grp) {
  const h = hotelsStore.items.find(x => x.name === g.hotel_makka)
  if (h?.default_tier) g.hotel_tier = h.default_tier
}

type Order = 'madina_makka' | 'makka_madina' | 'makka_only'

interface Grp {
  id: number
  title: string | null
  trip_start_date: string
  order: Order
  jidda_nights: number | string | null
  madina_nights: number | string | null
  makka_nights: number | string | null
  hotel_tier: string
  ellikboshi_username: string
  // Read-only here: the split is made on the Ellikboshilar screen. Carried so this card
  // can SAY a group is split instead of showing one of its two leaders as if it were the
  // only one.
  ellikboshi_makka: string
  ellikboshi_madina: string
  hotel_makka: string
  hotel_madina: string
  hotel_jidda: string
  bot_silent: boolean
  // The forum topic the bot works in (message_thread_id), '' = not bound.
  bot_topic_id: number | string
  // The CRM binding («this chat is CRM group 006») and the join link the bot minted
  // once it was bound. Both are written by their own endpoints, never by Saqlash.
  crm_link: CrmLink | null
  invite_link: string | null
}

interface CrmLink {
  departure_id: string
  group_index: number
  season_no: number | null
  confirmed_by: string | null
  confirmed_at: string | null
}

/** One CRM group carrying the searched season number — as `crm-candidates` returns it. */
interface CrmCandidate {
  departure_id: string
  group_index: number
  season_no: number | null
  departure_date: string | null
  package_name: string | null
  status: string | null
}

interface BindForm {
  season: string
  candidates: CrmCandidate[] | null
  chosen: CrmCandidate | null
  error: string
}

const authStore = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
// The fully-silent switch is admin + main-nazoratchi only (the API enforces it);
// this page is also served to the qa role, which must not even see the button.
// «Admin» here means whoever may manage a group: the admin, and the office login
// (owner, 2026-09-17), which has every panel except Tizim and Nazorat. The API
// grants the same two roles on these endpoints.
const isAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'ofis')
const silentSavingId = ref<number | null>(null)

// ─── Umra dasturi per group (admin only — the API is admin-only too) ──────────────
interface ProgramRes { source: 'group' | 'template' | 'none'; program_id: number | null; program_name: string | null; shape: { days: number; tier: string; order?: string } | null; warnings: string[]; package?: string | null }
const programs = ref<Record<string, ProgramRes>>({})
const programSavingId = ref<number | null>(null)

async function loadPrograms() {
  if (!isAdmin.value) return
  try {
    const { data } = await api.get('/programs/groups')
    programs.value = data
  } catch { programs.value = {} }
}
function programNone(r: ProgramRes): string {
  if (r.warnings.includes('no_day_map')) return 'kechalar kiritilmagan'
  if (r.package) return "paketning dasturi yo'q"
  const t = r.shape?.tier === 'comfort' ? 'comfort' : 'lux'
  // The route is part of the cell: a Makka-only trip has its own template even when a
  // classic one of the same length exists.
  const route = r.shape?.order === 'makka_only' ? ' · Jidda → Makka → Jidda' : ''
  return `${r.shape?.days} kun · ${t}${route} uchun shablon yo'q`
}
async function customizeProgram(g: Grp) {
  programSavingId.value = g.id
  try {
    await api.post(`/programs/groups/${g.id}/customize`)
    toast.success('Moslashtirildi')
    await loadPrograms()
  } catch (e: any) {
    toast.error(e?.response?.data?.detail || 'Moslashtirilmadi')
  } finally { programSavingId.value = null }
}
async function revertProgram(g: Grp) {
  if (!(await confirm({ title: 'Shablonga qaytarish', message: "Guruh nusxasi o'chiriladi.", confirmText: 'Qaytarish' }))) return
  programSavingId.value = g.id
  try {
    await api.delete(`/programs/groups/${g.id}/customize`)
    toast.success('Guruh shablonga qaytdi')
    await loadPrograms()
  } catch (e: any) {
    toast.error(e?.response?.data?.detail || 'Qaytarilmadi')
  } finally { programSavingId.value = null }
}

async function toggleSilent(g: Grp) {
  silentSavingId.value = g.id
  try {
    const { data } = await api.put(`/groups/${g.id}/bot-silent`, { silent: !g.bot_silent })
    g.bot_silent = !!data.bot_silent
    toast.success(g.bot_silent ? 'Bot jim' : 'Bot faol')
  } catch {
    toast.error('Saqlanmadi')
  } finally {
    silentSavingId.value = null
  }
}

const loading = ref(false)
const groups = ref<Grp[]>([])
const search = ref('')
const savingId = ref<number | null>(null)
const savedId = ref<number | null>(null)
const errorId = ref<number | null>(null)
const errorMsg = ref('')

// ─── Ellikboshi picker ──────────────────────────────────────────────────────────
// The same list the «Ellikboshilar» screen keeps. The qa login cannot read that list
// (the API opens it to the mingboshi and up), so the leaders already standing on the
// groups are offered too — qa can still move a group to any leader who runs one.

interface PoolLeader { username: string; name: string | null }
const pool = ref<PoolLeader[]>([])

async function loadPool() {
  try {
    const { data } = await api.get('/ellikboshilar')
    pool.value = (data as any[]).filter(e => e.is_active !== false)
  } catch {
    pool.value = []
  }
}

function sameLeader(a: string, b: string): boolean {
  const n = (u: string) => u.trim().replace(/^@/, '').toLowerCase()
  return n(a) === n(b)
}

/** The group's own value first and VERBATIM — the select matches strings exactly, so
 *  a stored «@Ali» must stay «@Ali» even where the list spells it «@ali», or the box
 *  would show «tanlanmagan» and the next Saqlash would clear the leader. */
function leaderOptions(g: Grp): string[] {
  const opts: string[] = []
  const add = (u: string | null | undefined) => {
    if (u && u.trim() && !opts.some(o => sameLeader(o, u))) opts.push(u)
  }
  add(g.ellikboshi_username)
  const rest: string[] = []
  for (const e of pool.value) rest.push(e.username)
  for (const x of groups.value) rest.push(x.ellikboshi_username, x.ellikboshi_makka, x.ellikboshi_madina)
  rest.sort((a, b) => leaderLabel(a).localeCompare(leaderLabel(b)))
  for (const u of rest) add(u)
  return opts
}

function leaderLabel(username: string): string {
  const e = pool.value.find(x => sameLeader(x.username, username))
  return e?.name ? `${e.name} (${username})` : username
}

/** Two different people across the two cities. The legacy column is the fallback for a
 *  city that was never filled — the same rule the server resolves by. */
function isSplit(g: Grp): boolean {
  const mk = (g.ellikboshi_makka || g.ellikboshi_username || '').trim().toLowerCase()
  const md = (g.ellikboshi_madina || g.ellikboshi_username || '').trim().toLowerCase()
  return mk !== md
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = q
    ? groups.value.filter(g => (g.title || '').toLowerCase().includes(q) || String(g.id).includes(q))
    : groups.value
  // Order by the #NNN number in each group's title (see utils/groupOrder) so the
  // list always reads #001, #002, #003… instead of raw API order.
  return [...list].sort(byGroupNumber)
})

function hasLocation(g: Grp) {
  return (g.madina_nights != null && g.madina_nights !== '') || (g.makka_nights != null && g.makka_nights !== '')
}

/** The topic field, as the API wants it: a real id, or 0 to CLEAR the binding.
 *  Deliberately NOT numOrNull — that returns null for an emptied box, and null means
 *  "field not sent" to the server, so a topic could be bound and never unbound. */
function topicOrClear(v: number | string | null): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function numOrNull(v: number | string | null): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Nights entered per city -> the start/end day ranges the bot stores. 1 night = 1
// day-slot, so the stays are laid back-to-back from day 1: Jidda first when there is
// one (it is the arrival airport city), then the two holy cities in the chosen order.
// These three ranges ARE the trip's shape — the bot reads its length, its city-by-day
// map, its return date and its fly-home day off them, so a 6-day and a 13-day package
// on the same plane stay independent.
function computeRanges(g: Grp) {
  const jd = numOrNull(g.jidda_nights)
  const md = numOrNull(g.madina_nights)
  const mk = numOrNull(g.makka_nights)
  // 0, never null, for EVERY leg: the API leaves a NULL field untouched, so a zeroed
  // range is the only way to CLEAR a leg that was set before. The card tells the admin
  // to write 0 for a city the group does not stay in — with a null default that 0 did
  // nothing and the OLD range survived underneath, overlapping the new ones. The bot
  // reads the first range that covers a day (Jidda, then Makka, then Madina), so a
  // stale Makka range silently won a day the group spends in Madina, and the Madina
  // crew was never tagged.
  const out: Record<string, number | null> = {
    madina_start_day: 0, madina_end_day: 0,
    makka_start_day: 0, makka_end_day: 0,
    jidda_start_day: 0, jidda_end_day: 0,
  }
  let cur = 1
  const place = (city: 'jidda' | 'madina' | 'makka', days: number | null) => {
    if (!days) return
    out[`${city}_start_day`] = cur
    out[`${city}_end_day`] = cur + days - 1
    cur += days
  }
  place('jidda', jd)
  if (g.order === 'makka_only') {
    // Jidda → Makka → Jidda (owner, 2026-10-15): no Madina stay — its range stays 0/0,
    // which also clears one left over from before the route was changed.
    place('makka', mk)
  } else if (g.order === 'makka_madina') {
    place('makka', mk)
    place('madina', md)
  } else {
    place('madina', md)
    place('makka', mk)
  }
  return out
}

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
const CITY_META = {
  jidda: { label: 'Jidda', dot: 'bg-amber-400' },
  madina: { label: 'Madina', dot: 'bg-emerald-400' },
  makka: { label: 'Makka', dot: 'bg-sky-400' },
} as const
type City = keyof typeof CITY_META

/** Parse the date parts explicitly so the weekday is never shifted by timezone. */
function parseStart(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

// Which city a group starts in is decided by the PLANE, and the season runs two
// rotations (Reyslar): the Shanba one flies Toshkent -> Jidda and home from Madina, so
// those groups start Makka-side; the Payshanba one flies Toshkent -> Madina and home
// from Jidda, so they start in Madina and take the Haramain train across. getDay():
// Sunday=0, so Payshanba=4 and Shanba=6. Any other weekday is not a rotation we fly —
// we make no claim about it rather than guess.
const ROUTE_BY_WEEKDAY: Record<number, Order> = {
  4: 'madina_makka',  // Payshanba — lands in Madina
  6: 'makka_madina',  // Shanba    — lands in Jidda
}

function routeForWeekday(iso: string): Order | null {
  const d = parseStart(iso)
  return d ? (ROUTE_BY_WEEKDAY[d.getDay()] ?? null) : null
}

/** The route to assume for a group whose stored map cannot say — it is blank, or only
 *  one leg is filled in. A blank Shanba card defaulting to Madina-first wrote Madina
 *  over the days the group is actually in Makka, and the city is what picks the crew to
 *  tag. A stored map with both legs always wins over this. */
function defaultOrder(iso: string): Order {
  return routeForWeekday(iso) ?? 'madina_makka'
}

/** The card contradicts its own plane: a Shanba group going Madina-first, or a
 *  Payshanba one going Makka-first. One of the two — the route or the departure date —
 *  is wrong, and the office is the only one who knows which, so this is flagged and not
 *  corrected. Left alone it is invisible: the day map still looks filled in, and the bot
 *  quietly tags the other city's crew. */
function routeLooksWrong(g: Grp): boolean {
  // The Makka-only route has no weekday of its own here — no claim is made about it.
  if (g.order === 'makka_only') return false
  const route = routeForWeekday(g.trip_start_date)
  return route !== null && g.order !== route
}

function routeWarning(g: Grp): string {
  return routeForWeekday(g.trip_start_date) === 'makka_madina'
    ? "Shanba reysi: avval Makka bo'lishi kerak"
    : "Payshanba reysi: avval Madina bo'lishi kerak"
}

/** Departure weekday, spelled out — a date typed into the wrong week is otherwise
 *  invisible, and the weekday is what picks the flight. */
function startWeekday(g: Grp): string {
  const d = parseStart(g.trip_start_date)
  return d ? WEEKDAYS[d.getDay()] : ''
}

function totalNights(g: Grp): number {
  return (numOrNull(g.jidda_nights) || 0)
    + (numOrNull(g.madina_nights) || 0)
    + (numOrNull(g.makka_nights) || 0)
}

/** Cities in travel order: Jidda is the arrival airport, so it always comes first when
 *  there is a night there; the select then orders the two holy cities. */
function cityOrder(g: Grp): City[] {
  if (g.order === 'makka_only') return ['jidda', 'makka']
  return g.order === 'makka_madina'
    ? ['jidda', 'makka', 'madina']
    : ['jidda', 'madina', 'makka']
}

function routeLabel(g: Grp, order: Order): string {
  // Lands in Jidda, stays in Makka, flies home from Jidda — both ends are named.
  if (order === 'makka_only') return 'Jidda → Makka → Jidda'
  const seq: City[] = order === 'makka_madina'
    ? ['jidda', 'makka', 'madina']
    : ['jidda', 'madina', 'makka']
  // Jidda belongs in the label when the group's PLANE lands there — which is a fact about
  // the Shanba rotation, not about whether anyone has typed a night into the Jidda box.
  //
  // It used to depend on the nights, and that split the list in two: a group entered the
  // old way (the arrival night folded into «Makka 1-9») read «Makka → Madina», while the
  // same trip entered as «Jidda 1 · Makka 8» read «Jidda → Makka → Madina». Same
  // itinerary, same plane, two different routes on screen — and the Jidda leg ROW is on
  // every card either way, so the label was the only thing disagreeing.
  //
  // Payshanba is not affected and must not be: that plane lands in MADINA and only
  // touches Jidda on the way home, so there is no Jidda stay to name.
  const showJidda = routeForWeekday(g.trip_start_date) === 'makka_madina'
    || !!numOrNull(g.jidda_nights)
  return seq.filter(c => c !== 'jidda' || showJidda).map(c => CITY_META[c].label).join(' → ')
}

/** One descriptor per leg, in travel order — the row model for the card. */
function legs(g: Grp) {
  const r = computeRanges(g)
  return cityOrder(g).map(city => {
    const s = r[`${city}_start_day`]
    const e = r[`${city}_end_day`]
    return {
      city,
      label: CITY_META[city].label,
      dot: CITY_META[city].dot,
      nightsKey: `${city}_nights` as const,
      hotelKey: `hotel_${city}` as const,
      nights: numOrNull(g[`${city}_nights` as 'jidda_nights']) || 0,
      days: !s || !e ? '—' : s === e ? `${s}-kun` : `${s}–${e}-kun`,
    }
  })
}

/** Total nights, the fly-home day, and the RETURN DATE. The date is the line to check
 *  against the season sheet — a wrong night count shows up there as a wrong day, where
 *  the day-number alone would not look wrong to anyone. */
function summary(g: Grp): string {
  const total = totalNights(g)
  if (!total) return 'Kecha kiritilmagan'
  const start = parseStart(g.trip_start_date)
  const base = `Jami ${total} kecha · uyga ${total + 1}-kun`
  if (!start) return base
  const ret = new Date(start)
  ret.setDate(ret.getDate() + total)
  return `${base} · qaytish ${fmt(ret)} (${WEEKDAYS[ret.getDay()]})`
}

// Stored day-ranges -> per-city night-counts for the simplified inputs (1 night =
// 1 day-slot, so the count of day-slots a city spans is its number of nights).
// A zeroed 0/0 range means "no such leg" (that is how one is cleared), so it must read
// back as blank — day 0 is not a trip day, and `0 - 0 + 1` would otherwise say 1 night.
function nightsFromRange(start: any, end: any): number | string {
  if (!start || !end) return ''
  const d = Number(end) - Number(start) + 1
  return Number.isFinite(d) && d > 0 ? d : ''
}

async function load() {
  loading.value = true
  try {
    // Only company groups REGISTERED in the Turon (team) system should appear: a
    // trip's group_chat_id is the registry. Random groups the AI bot happens to be
    // added to have no trip, so they are filtered out. The team API needs a team
    // session (the admin login has one; qa/flight do not) — guard the call so a
    // missing/expired team token can never 401-logout a non-admin; in that case we
    // skip the filter and fall back to showing all AI groups.
    const auth = useAuthStore()
    const calls: Promise<any>[] = [api.get('/groups')]
    if (auth.teamToken) calls.push(teamApi.get('/api/trips'))
    const [aiRes, tripsRes] = await Promise.allSettled(calls)

    let registered: Set<string> | null = null
    // The trip's own name, per chat — shown on the card next to the Telegram one. Only
    // an admin session can read /api/trips, so this is absent for qa/mingboshi and the
    // line simply does not render.
    const tripName = new Map<string, string>()
    if (tripsRes && tripsRes.status === 'fulfilled') {
      registered = new Set<string>(
        tripsRes.value.data
          .filter((t: any) => t.group_chat_id)
          .map((t: any) => String(t.group_chat_id)),
      )
      for (const t of tripsRes.value.data) {
        if (t.group_chat_id && t.name) tripName.set(String(t.group_chat_id), t.name)
      }
    }

    const aiGroups: any[] = aiRes.status === 'fulfilled' ? aiRes.value.data : []
    const visible = registered ? aiGroups.filter(g => registered!.has(String(g.id))) : aiGroups
    groups.value = visible.map((g: any): Grp => {
      const ms = g.madina_start_day, ks = g.makka_start_day
      // The stored map decides the route whenever it can. It only cannot for a group
      // whose map is blank or half-filled — and there the default has to be the route
      // the company actually flies today (Jidda -> Makka -> Madina, all three
      // packages). Defaulting the other way laid Madina on the days the group spends
      // in Makka the first time the admin filled the nights in and saved, which tags
      // the wrong city's crew for the whole first leg.
      // Both legs must really exist for the map to settle the question: a missing leg
      // reads as 0, and 0 < anything would call a Makka-only group Madina-first. When
      // the map cannot say, the departure weekday does — see defaultOrder().
      // A map with a Makka stay and no Madina one IS the Makka-only route (Jidda →
      // Makka → Jidda) — that is how the bot reads it too, so the card says the same.
      const msN = Number(ms), ksN = Number(ks)
      const order: Order = (msN > 0 && ksN > 0)
        ? (msN < ksN ? 'madina_makka' : 'makka_madina')
        : (ksN > 0 ? 'makka_only' : defaultOrder(g.trip_start_date || ''))
      return {
        id: g.id,
        // The name the trip is REGISTERED under in Turon, not the Telegram chat's.
        // They are two separate fields and nothing syncs them, so a group renamed in one
        // kept showing its old name here — and the office reads the name on this card to
        // decide what to enter. One name, and it is the registered one. The chat's title
        // is the fallback for a group no trip claims (and for the qa/mingboshi logins,
        // which cannot read /api/trips at all).
        title: tripName.get(String(g.id)) || g.title,
        trip_start_date: g.trip_start_date || '',
        order,
        jidda_nights: nightsFromRange(g.jidda_start_day, g.jidda_end_day),
        madina_nights: nightsFromRange(g.madina_start_day, g.madina_end_day),
        makka_nights: nightsFromRange(g.makka_start_day, g.makka_end_day),
        hotel_tier: g.hotel_tier || '',
        ellikboshi_username: g.ellikboshi_username || '',
        ellikboshi_makka: g.ellikboshi_makka || '',
        ellikboshi_madina: g.ellikboshi_madina || '',
        hotel_makka: g.hotel_makka || '',
        hotel_madina: g.hotel_madina || '',
        hotel_jidda: g.hotel_jidda || '',
        bot_silent: !!g.bot_silent,
        bot_topic_id: g.bot_topic_id ?? '',
        crm_link: g.crm_link ?? null,
        invite_link: g.invite_link ?? null,
      }
    })
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

async function save(g: Grp) {
  savingId.value = g.id
  savedId.value = null
  errorId.value = null
  try {
    await api.put(`/groups/${g.id}/location/public`, {
      trip_start_date: g.trip_start_date || null,
      ...computeRanges(g),
      hotel_tier: g.hotel_tier ?? '',
      ellikboshi_username: g.ellikboshi_username ?? '',
      hotel_makka: g.hotel_makka ?? '',
      hotel_madina: g.hotel_madina ?? '',
      hotel_jidda: g.hotel_jidda ?? '',
      bot_topic_id: topicOrClear(g.bot_topic_id),
    })
    savedId.value = g.id
    setTimeout(() => { if (savedId.value === g.id) savedId.value = null }, 2500)
  } catch (e: any) {
    errorId.value = g.id
    errorMsg.value = e?.response?.data?.detail || 'Saqlanmadi'
  } finally {
    savingId.value = null
  }
}

// ─── CRM binding + invite link ──────────────────────────────────────────────────
// The same three endpoints the bot's chat button and the internal CRM caller use,
// through the same server function: one crm_group_links row per chat either way.

const bindForms = ref<Record<number, BindForm>>({})
const bindBusyId = ref<number | null>(null)
const remintingId = ref<number | null>(null)
const remintError = ref<Record<number, string>>({})

function bindForm(id: number): BindForm {
  if (!bindForms.value[id]) {
    bindForms.value[id] = { season: '', candidates: null, chosen: null, error: '' }
  }
  return bindForms.value[id]
}

/** 006, the number the office knows the group by; the CRM's own index when the
 *  season number was never set. */
function crmLabel(link: CrmLink): string {
  return link.season_no != null ? String(link.season_no).padStart(3, '0') : `#${link.group_index}`
}

/** Who confirmed the binding and when — the bot writes the tapping user, this
 *  screen writes dashboard:<login>, so a wrong binding has a name on it. */
function crmWho(link: CrmLink): string {
  const when = link.confirmed_at ? fmtIso(link.confirmed_at) : ''
  return ['·', link.confirmed_by || '?', when].filter(Boolean).join(' ')
}

function fmtIso(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${d}.${m}.${y}` : iso
}

function candidateLabel(c: CrmCandidate): string {
  const no = c.season_no != null ? String(c.season_no).padStart(3, '0') : `#${c.group_index}`
  const parts = [`${no}-guruh`, fmtIso(c.departure_date), c.package_name ?? '']
  if (c.status && c.status !== 'SELLING') parts.push(c.status.toLowerCase())
  return parts.filter(Boolean).join(' · ')
}

async function searchCrm(g: Grp) {
  const form = bindForm(g.id)
  const season = Number(form.season)
  if (!Number.isInteger(season) || season < 1 || season > 999) {
    form.error = '1–999'
    return
  }
  bindBusyId.value = g.id
  form.error = ''
  form.candidates = null
  form.chosen = null
  try {
    const { data } = await api.get(`/groups/${g.id}/crm-candidates`, { params: { season_no: season } })
    form.candidates = data.groups as CrmCandidate[]
    // One match is the common case — preselect it so the bind is a single tap.
    if (form.candidates.length === 1) form.chosen = form.candidates[0] ?? null
  } catch (e: any) {
    // 503 is the CRM not answering, which is a different message from «no such group».
    form.error = e?.response?.status === 503
      ? 'CRM javob bermadi'
      : (e?.response?.data?.detail || "Qidirib bo'lmadi")
  } finally {
    bindBusyId.value = null
  }
}

async function bind(g: Grp) {
  const form = bindForm(g.id)
  if (!form.chosen) return
  bindBusyId.value = g.id
  form.error = ''
  try {
    const { data } = await api.post(`/groups/${g.id}/crm-link`, {
      departure_id: form.chosen.departure_id,
      group_index: form.chosen.group_index,
      season_no: form.chosen.season_no,
    })
    g.crm_link = data.crm_link
    g.invite_link = data.invite_link ?? g.invite_link
    delete bindForms.value[g.id]
    toast.success(`CRM guruhi bog'landi: ${crmLabel(data.crm_link)}-guruh`)
    // The link is minted in the same call. When the bot is not admin in the chat it
    // cannot be — Telegram's reason stays on the card until the rights are fixed.
    if (data.invite_error) remintError.value[g.id] = `Havola yaratilmadi: ${data.invite_error}`
  } catch (e: any) {
    form.error = e?.response?.data?.detail || "Bog'lab bo'lmadi"
  } finally {
    bindBusyId.value = null
  }
}

async function unbind(g: Grp) {
  if (!g.crm_link) return
  const ok = await confirm({
    title: "CRM bog'lanishini uzish",
    message: 'Taklif havolasi bekor qilinadi.',
    confirmText: 'Uzish',
  })
  if (!ok) return
  bindBusyId.value = g.id
  try {
    await api.delete(`/groups/${g.id}/crm-link`)
    g.crm_link = null
    g.invite_link = null
    delete remintError.value[g.id]
    toast.success("CRM bog'lanishi olib tashlandi")
  } catch (e: any) {
    toast.error(e?.response?.data?.detail || "Olib tashlab bo'lmadi")
  } finally {
    bindBusyId.value = null
  }
}

async function copyLink(g: Grp) {
  if (!g.invite_link) return
  try {
    await navigator.clipboard.writeText(g.invite_link)
    toast.success('Havola nusxalandi')
  } catch {
    // Clipboard blocked (http, or no permission) — the link is still on screen to select.
    toast.error('Nusxalanmadi')
  }
}

async function remint(g: Grp) {
  remintingId.value = g.id
  delete remintError.value[g.id]
  try {
    const { data } = await api.post(`/groups/${g.id}/invite-link`)
    g.invite_link = data.invite_link ?? g.invite_link
    if (data.error) remintError.value[g.id] = `Yaratilmadi: ${data.error}`
    else toast.success('Havola yangilandi')
  } catch (e: any) {
    remintError.value[g.id] = e?.response?.data?.detail || 'Yaratilmadi'
  } finally {
    remintingId.value = null
  }
}

onMounted(() => { hotelsStore.fetch(); load(); loadPrograms(); loadPool() })
</script>

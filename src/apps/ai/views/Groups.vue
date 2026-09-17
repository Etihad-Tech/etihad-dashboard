<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Guruhlar</h2>
        <p class="text-sm text-gray-500 mt-1">
          Har bir guruhning jo'nash sanasi va shaharlarda necha <b>kecha</b> turishini yozing.
          Safar uzunligi, qaytish sanasi va joriy shahar shu raqamlardan hisoblanadi — reys jadvalidan emas,
          shuning uchun bir kunda uchadigan har xil uzunlikdagi safarlar bir-biriga xalaqit bermaydi.
        </p>
        <p class="text-xs text-gray-500 mt-1">
          Odatda: <b>Payshanba</b> — 9 kecha (Madina 4, keyin Makka 5), <b>Shanba</b> — 12 kecha (Makka 9, keyin Madina 3).
          6 kunlik safar — istisno, kechalari qo'lda yoziladi. Guruh nomi paketni emas, faqat nomni bildiradi.
        </p>
        <p class="text-xs text-gray-400 mt-1">
          Faqat Turon tizimida ro'yxatdan o'tgan (safarga biriktirilgan) guruhlar ko'rsatiladi — botga tasodifan
          qo'shilgan begona guruhlar bu yerda chiqmaydi.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <div class="flex items-center gap-3 animate-fade-up">
          <font-awesome-icon icon="location-dot" class="w-4 h-4 text-amber-600" />
          <h3 class="text-base font-semibold text-gray-900">Guruhlar ({{ filtered.length }})</h3>
          <input v-model="search" type="text" placeholder="Guruhni qidirish..."
            class="ml-auto bg-white border border-gray-200 rounded-2xl px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        <div v-if="!filtered.length" class="text-center py-10 text-sm text-gray-400">Guruh topilmadi.</div>

        <div v-else class="grid gap-3">
          <div v-for="g in filtered" :key="g.id" class="bg-white rounded-2xl border border-gray-200 p-5 animate-fade-up">
            <div class="flex items-center gap-3 mb-4">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ g.title || g.id }}</p>
                <p class="text-[11px] text-gray-400">{{ g.id }}</p>
              </div>
              <!-- The CRM binding at a glance. Unbound = the pilgrim cabinet has no group
                   link and no ellikboshi for these pilgrims; the block below fixes it. -->
              <span class="shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-medium border"
                :class="g.crm_link ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'"
                :title="g.crm_link ? `CRM: ${g.crm_link.departure_id} / ${g.crm_link.group_index}` : `Pastdagi «CRM guruhi» qatoridan bog'lang yoki chatda bot taklifini tasdiqlang`">
                {{ g.crm_link ? `CRM · ${crmLabel(g.crm_link)}-guruh` : "CRMga bog'lanmagan" }}
              </span>
              <!-- Fully-silent switch (admin here; the main nazoratchi has the same
                   toggle in the Nazorat panel). Saves IMMEDIATELY via its own
                   endpoint — deliberately independent of the Saqlash button, so
                   silencing a group never rides along with unrelated form edits. -->
              <button v-if="isAdmin" @click="toggleSilent(g)" :disabled="silentSavingId === g.id"
                class="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-colors"
                :class="g.bot_silent ? 'bg-rose-50 text-rose-600 border-rose-200' : 'border-gray-200 text-gray-400 hover:text-gray-600'"
                :title="g.bot_silent ? 'Bot bu guruhda javob yozmaydi (kartochkalar baribir boradi)' : 'Bot bu guruhda javob beradi'">
                <font-awesome-icon :icon="g.bot_silent ? 'toggle-off' : 'toggle-on'" class="w-3.5 h-3.5" />
                {{ g.bot_silent ? 'Bot JIM' : 'Bot faol' }}
              </button>
              <span v-if="!hasLocation(g)" class="text-[11px] text-rose-600 shrink-0">Kechalar kiritilmagan — bot shaharni bilmaydi</span>
              <span v-if="savedId === g.id" class="text-emerald-600 text-xs flex items-center gap-1 shrink-0">
                <font-awesome-icon icon="circle" class="w-2 h-2" /> Saqlandi
              </span>
            </div>

            <!-- CRM BINDING. «This chat is CRM group 006» — the row the pilgrim cabinet's
                 group link, invite link and ellikboshi all hang off. Two ways in, one row:
                 the bot proposes in the chat and the ellikboshi taps, or the office types
                 the season number here and picks the departure. Both call the same server
                 function, so whoever binds last moves the CRM group to their chat. Acts
                 IMMEDIATELY through its own endpoints, like the Bot JIM switch — it never
                 rides along with Saqlash. Admin binds and unbinds; qa sees the state. -->
            <div class="mb-4 rounded-2xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-xs space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[11px] text-gray-500 font-medium">CRM guruhi</span>
                <template v-if="g.crm_link">
                  <span class="font-medium text-gray-800">{{ crmLabel(g.crm_link) }}-guruh</span>
                  <span class="text-gray-400" :title="g.crm_link.departure_id">{{ crmWho(g.crm_link) }}</span>
                  <button v-if="isAdmin" @click="unbind(g)" :disabled="bindBusyId === g.id"
                    class="ml-auto px-2.5 py-1 rounded-xl border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50 transition-colors">
                    {{ bindBusyId === g.id ? '...' : 'Uzish' }}
                  </button>
                </template>
                <template v-else-if="isAdmin">
                  <input v-model="bindForm(g.id).season" type="number" min="1" max="999" placeholder="raqam, m-n 006"
                    @keyup.enter="searchCrm(g)"
                    class="w-32 bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <button @click="searchCrm(g)" :disabled="bindBusyId === g.id || !bindForm(g.id).season"
                    class="px-2.5 py-1 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                    {{ bindBusyId === g.id && !bindForm(g.id).candidates ? 'Qidirilmoqda...' : 'Qidirish' }}
                  </button>
                  <span v-if="bindForm(g.id).error" class="text-rose-600">{{ bindForm(g.id).error }}</span>
                  <span v-else class="text-[11px] text-gray-400">Mavsum raqami bo'yicha — chatda bot taklifini tasdiqlash bilan bir xil</span>
                </template>
                <span v-else class="text-gray-400">bog'lanmagan — chatda bot taklifini tasdiqlang</span>
              </div>
              <div v-if="!g.crm_link && isAdmin && bindForm(g.id).candidates" class="flex flex-col gap-1">
                <p v-if="bindForm(g.id).candidates!.length === 0" class="text-gray-500">
                  CRMda bunday raqamli ishchi guruh yo'q. Raqamni tekshiring.
                </p>
                <label v-for="c in bindForm(g.id).candidates" :key="c.departure_id + ':' + c.group_index"
                  class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" :name="`crm-${g.id}`" :value="c" v-model="bindForm(g.id).chosen" />
                  <span class="text-gray-800">{{ candidateLabel(c) }}</span>
                </label>
                <div v-if="bindForm(g.id).candidates!.length">
                  <button @click="bind(g)" :disabled="!bindForm(g.id).chosen || bindBusyId === g.id"
                    class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium transition-colors">
                    {{ bindBusyId === g.id ? "Bog'lanmoqda..." : "Bog'lash" }}
                  </button>
                </div>
              </div>
              <!-- The join link the bot minted (join-request style: pilgrims ask, the CRM
                   match or the ellikboshi approves). Only once the chat is bound. -->
              <div v-if="g.crm_link" class="flex flex-wrap items-center gap-2">
                <span class="text-[11px] text-gray-500 font-medium">Taklif havolasi</span>
                <template v-if="g.invite_link">
                  <a :href="g.invite_link" target="_blank" rel="noopener"
                    class="font-mono text-indigo-600 hover:underline truncate max-w-[16rem]">{{ g.invite_link }}</a>
                  <button @click="copyLink(g)"
                    class="px-2.5 py-1 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                    Nusxalash
                  </button>
                </template>
                <span v-else class="text-amber-600">yo'q — bot guruhda admin emas</span>
                <button v-if="isAdmin" @click="remint(g)" :disabled="remintingId === g.id"
                  class="px-2.5 py-1 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  {{ remintingId === g.id ? 'Yaratilmoqda...' : (g.invite_link ? 'Qayta yaratish' : 'Yaratish') }}
                </button>
                <span v-if="remintError[g.id]" class="text-rose-600">{{ remintError[g.id] }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[11px] text-gray-400 mb-1">Jo'nash sanasi</label>
                <input v-model="g.trip_start_date" type="date" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <p class="text-[11px] text-gray-400 mt-1">{{ startWeekday(g) }}</p>
              </div>
              <div class="col-span-2 sm:col-span-2">
                <label class="block text-[11px] text-gray-400 mb-1">Marshrut</label>
                <select v-model="g.order" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="makka_madina">{{ routeLabel(g, 'makka_madina') }}</option>
                  <option value="madina_makka">{{ routeLabel(g, 'madina_makka') }}</option>
                </select>
                <p v-if="routeLooksWrong(g)" class="text-[11px] text-amber-600 mt-1">
                  {{ routeWarning(g) }}
                </p>
              </div>
              <div>
                <label class="block text-[11px] text-gray-400 mb-1">Ellikboshi</label>
                <input v-model="g.ellikboshi_username" type="text" placeholder="@username" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <!-- This box sets ONE leader for the whole trip. A group split between
                     cities says so rather than pretending the box describes it: leaving
                     it silent would let somebody flatten a split by saving an unrelated
                     field on this card. (Saving it UNCHANGED never does — the server
                     only propagates a value that actually changed.) -->
                <p v-if="isSplit(g)" class="text-[11px] text-amber-600 mt-1 leading-snug">
                  Shaharlar bo'yicha ajratilgan: Makka {{ g.ellikboshi_makka || '—' }},
                  Madina {{ g.ellikboshi_madina || '—' }}. Bu yerga yozilsa, ikkalasi ham
                  o'zgaradi — «Ellikboshilar» bo'limidan tahrirlang.
                </p>
              </div>
            </div>

            <!-- One row per leg, in travel order: nights and hotel belong to the same
                 stay, so they are read and fixed together, and each leg shows the trip
                 days it works out to. -->
            <div class="mt-3 rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              <div v-for="leg in legs(g)" :key="leg.city"
                class="flex items-center gap-3 px-3 py-2.5" :class="leg.nights ? 'bg-white' : 'bg-gray-50/60'">
                <span class="w-1.5 h-6 rounded-full shrink-0" :class="leg.dot"></span>
                <span class="w-14 text-sm font-medium text-gray-700 shrink-0">{{ leg.label }}</span>
                <input v-model="g[leg.nightsKey]" type="number" min="0" placeholder="—"
                  class="w-16 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <span class="text-[11px] text-gray-400 shrink-0 hidden sm:inline">kecha</span>
                <select v-model="g[leg.hotelKey]" @change="leg.city === 'makka' && applyHotelTier(g)"
                  class="flex-1 min-w-0 bg-gray-50 border rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  :class="leg.nights && !g[leg.hotelKey] ? 'border-rose-300 ring-1 ring-rose-200' : 'border-gray-200'">
                  <option value="">— mehmonxona —</option>
                  <option v-for="h in hotelOptions(leg.city, g[leg.hotelKey])" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="w-20 text-right text-[11px] shrink-0"
                  :class="leg.nights ? 'text-gray-500' : 'text-gray-300'">{{ leg.days }}</span>
              </div>
            </div>

            <!-- FORUM TOPIC. A group with a lot of traffic is split into topics: one
                 where the bot answers, one where only announcements are posted. Fill
                 this in and the bot works ONLY in that topic; leave it empty and
                 nothing changes — it answers wherever it is spoken to, as today. -->
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <label class="text-[11px] text-gray-500 font-medium">Bot ishlaydigan mavzu</label>
              <input v-model="g.bot_topic_id" type="number" min="0" placeholder="—"
                class="w-20 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <p class="text-[11px] text-gray-400 leading-snug flex-1 min-w-[16rem]">
                Guruh mavzularga (topics) bo'lingan bo'lsa, bot <b>faqat shu mavzuda</b> javob beradi —
                e'lonlar mavzusiga umuman aralashmaydi. Bo'sh qoldirilsa, hozirgidek hamma joyda ishlaydi.
                Raqamni mavzudagi istalgan xabar havolasidan oling: t.me/c/1234567890/<b>2</b>/15 — bu yerda <b>2</b>.
              </p>
            </div>

            <!-- UMRA DASTURI. Which day-by-day programme this group shows: its own copy,
                 or its cell's template (days x Daraja), or none. Resolved by the API from
                 the nights and Daraja on THIS card — so a change here moves the group. -->
            <div v-if="isAdmin && programs[String(g.id)]" class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <font-awesome-icon icon="route" class="w-3 h-3 text-gray-400" />
              <span class="text-gray-400">Umra dasturi:</span>
              <template v-if="programs[String(g.id)].source === 'none'">
                <span class="text-rose-600">{{ programNone(programs[String(g.id)]) }}</span>
              </template>
              <template v-else>
                <span class="font-medium text-gray-700">{{ programs[String(g.id)].program_name }}</span>
                <span class="px-1.5 py-0.5 rounded-lg"
                  :class="programs[String(g.id)].source === 'group' ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'">
                  {{ programs[String(g.id)].source === 'group' ? 'moslashtirilgan' : 'shablon' }}
                </span>
                <span v-if="programs[String(g.id)].warnings.includes('map_mismatch')" class="text-amber-600">kechalar shablondan farq qiladi</span>
                <span v-if="programs[String(g.id)].warnings.includes('tier_inferred')" class="text-amber-600">Daraja avtomatik</span>
                <router-link :to="{ path: '/ai/umra-dasturi', query: { group: String(g.id) } }" class="text-amber-700 hover:underline">Ochish</router-link>
                <button v-if="programs[String(g.id)].source === 'template'" @click="customizeProgram(g)" :disabled="programSavingId === g.id"
                  class="text-gray-500 hover:text-gray-900 disabled:opacity-50">Guruhga moslashtirish</button>
                <button v-else @click="revertProgram(g)" :disabled="programSavingId === g.id"
                  class="text-gray-500 hover:text-rose-600 disabled:opacity-50">Shablonga qaytarish</button>
              </template>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span class="font-medium text-gray-700">{{ summary(g) }}</span>
              <span class="text-gray-400">Daraja:</span>
              <select v-model="g.hotel_tier" class="bg-transparent text-gray-600 border-0 p-0 text-[11px] focus:outline-none cursor-pointer">
                <option value="">avtomatik</option>
                <option value="comfort">comfort</option>
                <option value="premium">premium</option>
              </select>
            </div>

            <div class="flex items-center justify-end gap-3 mt-4">
              <p v-if="errorId === g.id" class="text-xs text-rose-600 mr-auto">{{ errorMsg }}</p>
              <button @click="save(g)" :disabled="savingId === g.id"
                class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
                {{ savingId === g.id ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </div>
        </div>
        <p class="text-[11px] text-gray-400">
          Shahar kechasi yo'q bo'lsa <b>0</b> yozing. Har bir kartochkada chiqadigan <b>qaytish sanasi</b> —
          kechalar to'g'ri kiritilganini tekshirishning eng oson yo'li: uni jadvaldagi qaytish sanasi bilan solishtiring.
        </p>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
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

type Order = 'madina_makka' | 'makka_madina'

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
const isAdmin = computed(() => authStore.role === 'admin')
const silentSavingId = ref<number | null>(null)

// ─── Umra dasturi per group (admin only — the API is admin-only too) ──────────────
interface ProgramRes { source: 'group' | 'template' | 'none'; program_id: number | null; program_name: string | null; shape: { days: number; tier: string } | null; warnings: string[] }
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
  const t = r.shape?.tier === 'comfort' ? 'comfort' : 'lux'
  return `${r.shape?.days} kun · ${t} uchun shablon yo'q`
}
async function customizeProgram(g: Grp) {
  programSavingId.value = g.id
  try {
    await api.post(`/programs/groups/${g.id}/customize`)
    toast.success("Guruh o'z nusxasini oldi — Umra dasturi sahifasida tahrirlang")
    await loadPrograms()
  } catch (e: any) {
    toast.error(e?.response?.data?.detail || 'Moslashtirilmadi')
  } finally { programSavingId.value = null }
}
async function revertProgram(g: Grp) {
  if (!(await confirm({ title: 'Shablonga qaytarish', message: "Guruhning o'z dasturi o'chiriladi, u yana shablonni ko'radi.", confirmText: 'Qaytarish' }))) return
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
    toast.success(g.bot_silent
      ? 'Bot bu guruhda JIM — kartochkalar va DMlar baribir boradi'
      : 'Bot bu guruhda yana javob beradi')
  } catch {
    toast.error('Saqlashda xatolik yuz berdi')
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
  if (g.order === 'makka_madina') {
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
  const route = routeForWeekday(g.trip_start_date)
  return route !== null && g.order !== route
}

function routeWarning(g: Grp): string {
  return routeForWeekday(g.trip_start_date) === 'makka_madina'
    ? "Shanba reysi Jiddaga qo'nadi — avval Makka bo'lishi kerak. Marshrut yoki sanani tekshiring."
    : "Payshanba reysi Madinaga qo'nadi — avval Madina bo'lishi kerak. Marshrut yoki sanani tekshiring."
}

/** Departure weekday, spelled out — a date typed into the wrong week is otherwise
 *  invisible, and the weekday is what picks the flight. */
function startWeekday(g: Grp): string {
  const d = parseStart(g.trip_start_date)
  return d ? WEEKDAYS[d.getDay()] : 'Sana kiritilmagan'
}

function totalNights(g: Grp): number {
  return (numOrNull(g.jidda_nights) || 0)
    + (numOrNull(g.madina_nights) || 0)
    + (numOrNull(g.makka_nights) || 0)
}

/** Cities in travel order: Jidda is the arrival airport, so it always comes first when
 *  there is a night there; the select then orders the two holy cities. */
function cityOrder(g: Grp): City[] {
  return g.order === 'makka_madina'
    ? ['jidda', 'makka', 'madina']
    : ['jidda', 'madina', 'makka']
}

function routeLabel(g: Grp, order: Order): string {
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
      const msN = Number(ms), ksN = Number(ks)
      const order: Order = (msN > 0 && ksN > 0)
        ? (msN < ksN ? 'madina_makka' : 'makka_madina')
        : defaultOrder(g.trip_start_date || '')
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
    errorMsg.value = e?.response?.data?.detail || 'Saqlashda xatolik'
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
    form.error = "Raqam 1 dan 999 gacha bo'lishi kerak"
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
      ? "CRM javob bermadi, keyinroq urinib ko'ring"
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
    message: `${g.title || g.id} — ${crmLabel(g.crm_link)}-guruhdan uziladi, taklif havolasi bekor qilinadi. `
      + "Kabinet bu guruhni ko'rmay qoladi.",
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
    toast.error("Nusxalab bo'lmadi — havolani qo'lda belgilang")
  }
}

async function remint(g: Grp) {
  remintingId.value = g.id
  delete remintError.value[g.id]
  try {
    const { data } = await api.post(`/groups/${g.id}/invite-link`)
    g.invite_link = data.invite_link ?? g.invite_link
    if (data.error) remintError.value[g.id] = `Yaratilmadi: ${data.error}`
    else toast.success('Yangi taklif havolasi yaratildi')
  } catch (e: any) {
    remintError.value[g.id] = e?.response?.data?.detail || 'Yaratilmadi'
  } finally {
    remintingId.value = null
  }
}

onMounted(() => { hotelsStore.fetch(); load(); loadPrograms() })
</script>

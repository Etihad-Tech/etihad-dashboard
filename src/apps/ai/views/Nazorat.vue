<template>
   <AppLayout>
      <div class="nazorat">
         <!-- ───────────────────────── TOP BAR ─────────────────────────
              Sticky and thin. On a phone the panel is the whole app (a controller login
              reaches no other page), so this is its title bar: what you are looking at,
              which period, and the two controls that are always needed. -->
         <div class="nazorat-topbar px-4 pt-3 pb-2.5 lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:px-0 lg:pt-0">
            <div class="flex items-center gap-2.5">
               <button v-if="isDetail" @click="router.back()"
                  class="n-topbtn -ml-1 shrink-0 text-gray-500">
                  <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                     <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.75"
                        stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span class="sr-only">Orqaga</span>
               </button>
               <!-- The panel's own mark. A controller never sees the sidebar on a phone,
                    so without it the app opens on an unbranded sheet of numbers. -->
               <img v-else src="/logo.svg" alt="" aria-hidden="true"
                  class="w-8 h-8 shrink-0 rounded-full bg-white p-1 shadow-sm lg:hidden" />
               <h2 class="text-[19px] lg:text-[26px] leading-tight font-bold tracking-tight text-gray-900 truncate">
                  {{ isDetail ? personWord : scopeTitle }}
               </h2>

               <div class="ml-auto flex items-center gap-1.5 shrink-0">
                  <!-- The exceptions live here now instead of on top of the main screen.
                       The badge is the whole point: the panel is worth opening only when
                       it has something in it. -->
                  <button @click="showBell = true" class="n-topbtn"
                     :class="activeProblems.length ? 'text-gray-700' : 'text-gray-400'"
                     :title="activeProblems.length ? `${activeProblems.length} ta diqqat talab qiladigan holat` : 'Yangi bildirishnoma yo\'q'">
                     <span class="relative inline-flex">
                        <font-awesome-icon icon="bell" class="w-4 h-4" />
                        <span v-if="activeProblems.length" class="n-bell-badge">{{ activeProblems.length }}</span>
                     </span>
                     <span class="sr-only">Diqqat talab qiladi</span>
                  </button>
                  <button @click="refresh" class="n-topbtn text-gray-400"
                     :class="s.loading ? 'animate-spin' : ''" title="Yangilash">
                     <font-awesome-icon icon="rotate-right" class="w-4 h-4" />
                     <span class="sr-only">Yangilash</span>
                  </button>
                  <!-- A controller has no sidebar on a phone (it would hold one link), so
                       the way out lives here. -->
                  <button v-if="isNazoratchi" @click="logout"
                     class="n-topbtn lg:hidden text-gray-400 active:text-red-500">
                     <font-awesome-icon icon="right-from-bracket" class="w-4 h-4" />
                     <span class="sr-only">Chiqish</span>
                  </button>
               </div>
            </div>

            <div v-if="!isDetail" class="seg mt-2.5 lg:mt-3 lg:inline-flex lg:w-auto">
               <button v-for="p in PERIODS" :key="p.value" @click="s.setPeriod(p.value)"
                  :class="s.period === p.value ? 'is-on' : ''">
                  {{ p.label }}
               </button>
            </div>
         </div>

         <div class="nazorat-scroll px-4 pt-3 lg:px-0 lg:pb-0">
            <!-- The design's greeting line. Chrome, not data: it says who is logged in
                 and which slice of time the screen below is describing, which on a phone
                 (where the title bar is one line) is otherwise nowhere. Mobile only —
                 the desktop page is read in a meeting and opens with the numbers. -->
            <div v-if="!isDetail && isHolat && !isDesktop" class="mb-3.5">
               <p class="text-[17px] font-bold text-gray-900 leading-tight">
                  Assalomu alaykum, {{ displayName }} 👋
               </p>
               <p class="text-[13px] text-gray-500 mt-0.5">{{ periodCaption }}</p>
            </div>

            <!-- WHICH SLICE. Applied on the SERVER, so the cards, the ranking, the
                 journal and the person screens can never describe different slices. -->
            <div v-if="!isDetail" class="flex flex-wrap items-center gap-2 mb-3">
               <select v-model="s.filterGroup" @change="s.setSlice()" class="filter-select flex-1 min-w-0 lg:flex-none lg:max-w-[260px]">
                  <option value="">Barcha guruhlar</option>
                  <option v-for="g in groupChoices" :key="g.chat_id" :value="String(g.chat_id)">
                     {{ g.label }}
                  </option>
               </select>
               <select v-model="s.filterCity" @change="s.setSlice()" class="filter-select shrink-0">
                  <option value="">Ikkala shahar</option>
                  <option value="makka">Makka</option>
                  <option value="madina">Madina</option>
               </select>
               <template v-if="s.filterGroup || s.filterCity">
                  <button @click="s.clearSlice()"
                     class="text-[13px] text-gray-500 underline underline-offset-2">
                     Filtrni tozalash
                  </button>
                  <span class="text-xs text-gray-400">
                     Quyidagi barcha raqamlar faqat shu tanlov bo'yicha
                  </span>
               </template>
            </div>

            <div v-if="s.loading" class="flex justify-center py-20">
               <div class="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            </div>

            <div v-else-if="s.loadError" class="card p-5">
               <p class="font-semibold text-gray-900 mb-1">Ma'lumotni yuklab bo'lmadi</p>
               <p class="text-sm text-gray-600 mb-4">
                  Bu «murojaat yo'q» degani EMAS — server javob bermadi yoki ruxsat yetmadi.
               </p>
               <button @click="s.load()" class="btn-primary">Qayta urinish</button>
            </div>

            <!-- A person's screen replaces everything, on a phone and on a desktop alike:
                 it is a different question, not a section of the same page. -->
            <router-view v-else-if="isDetail" />

            <!-- One screen at a time on a phone; on a desktop the same three panels stay
                 a single scroll, because the office reads the whole thing in a meeting
                 and tabbing through it there would be a step backwards. -->
            <router-view v-else-if="!isDesktop" />
            <div v-else class="space-y-6">
               <Holat />
               <div>
                  <h3 class="text-base font-semibold text-gray-900 mb-3">Reyting</h3>
                  <Reyting />
               </div>
               <div>
                  <h3 class="text-base font-semibold text-gray-900 mb-3">Jurnal</h3>
                  <Jurnal />
               </div>
            </div>
         </div>

         <!-- ───────────────────────── TAB BAR ─────────────────────────
              Phone only. Fixed, thumb-height and padded for the home indicator — the
              panel is installed to the home screen, so an unpadded bar would sit under
              the iPhone's own. -->
         <nav v-if="!isDesktop && !isDetail" class="nazorat-tabbar">
            <router-link v-for="t in TABS" :key="t.to" :to="t.to"
               :class="route.path === t.to ? 'is-active' : ''">
               <font-awesome-icon :icon="t.icon" class="w-5 h-5" />
               {{ t.label }}
            </router-link>
         </nav>

         <Ogohlantirishlar v-if="showBell" @close="showBell = false" />
      </div>
   </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Holat from './nazorat/Holat.vue'
import Reyting from './nazorat/Reyting.vue'
import Jurnal from './nazorat/Jurnal.vue'
import Ogohlantirishlar from './nazorat/Ogohlantirishlar.vue'
import { useNazoratStore } from '../stores/nazorat'
import { useAuthStore } from '../../../stores/auth'
import { PERIODS, useNazoratView } from './nazorat/shared'
import './nazorat/nazorat.css'

const s = useNazoratStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { scopeTitle, personWord, groupChoices, activeProblems } = useNazoratView()

const TABS = [
   { key: 'holat', to: '/ai/nazorat', label: 'Holat', icon: 'gauge-high' },
   { key: 'reyting', to: '/ai/nazorat/reyting', label: 'Reyting', icon: 'ranking-star' },
   { key: 'jurnal', to: '/ai/nazorat/jurnal', label: 'Jurnal', icon: 'list-ul' },
]

const isNazoratchi = computed(() => !!auth.role && auth.role.startsWith('nazoratchi'))
const isDetail = computed(() => route.path.startsWith('/ai/nazorat/xodim/'))
const isHolat = computed(() => route.path === '/ai/nazorat')

/** Who is logged in, for the greeting — the same derivation the sidebar footer uses, so
 *  the two never disagree about the reader's name. */
const displayName = computed(() => {
   const u = auth.username
   if (!u) return 'Admin'
   return u.includes('@') ? u.split('@')[0] : u
})

/** "Bugungi ko'rsatkichlar" — which slice of time everything below describes. Reads off
 *  the same period control beside it, so it can never claim a different window. */
const PERIOD_CAPTIONS: Record<string, string> = {
   day: "Bugungi ko'rsatkichlar",
   week: "Oxirgi 7 kun ko'rsatkichlari",
   month: "Oxirgi 30 kun ko'rsatkichlari",
}
const periodCaption = computed(() => PERIOD_CAPTIONS[s.period] || PERIOD_CAPTIONS.day)

// The notifications panel. Closed by navigating as well as by the ✕ — leaving a sheet
// hanging over a screen the reader has already moved away from is how a panel starts
// feeling like a bug.
const showBell = ref(false)
watch(() => route.path, () => (showBell.value = false))

/** Which arrangement to render. A media query rather than `lg:hidden`, because the two
 *  arrangements mount DIFFERENT component instances — with CSS alone a desktop would
 *  build both and every screen would fetch twice. */
const mq = window.matchMedia('(min-width: 1024px)')
const isDesktop = ref(mq.matches)
function onMq(e: MediaQueryListEvent) { isDesktop.value = e.matches }
onMounted(() => mq.addEventListener('change', onMq))
onUnmounted(() => mq.removeEventListener('change', onMq))

async function refresh() {
   await s.load()
   // Whichever screen is open re-pulls what it needs; the drill-down is invalidated by
   // load(), so this only costs a request on the screens that actually read it.
   if (isDetail.value || route.path === '/ai/nazorat/jurnal' || isDesktop.value) {
      await s.loadRequests()
   }
}

function logout() {
   auth.logout()
   router.push('/login')
}

onMounted(() => s.load())
</script>

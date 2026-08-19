<template>
   <AppLayout>
      <div class="nazorat">
         <!-- Watched by the observer below to tell the title bar whether anything has
              scrolled under it yet. A sentinel rather than a scroll listener: a listener
              on this page would fire on every frame of every swipe. -->
         <div ref="sentinel" aria-hidden="true" class="h-px"></div>

         <!-- ───────────────────────── TOP BAR ─────────────────────────
              Glass, and sticky. On a phone the panel is the whole app (a controller
              login reaches no other page), so this is its title bar: what you are
              looking at, which period, and the two controls that are always needed. -->
         <div class="nazorat-topbar px-5 pb-3.5 lg:static lg:bg-transparent lg:backdrop-blur-none lg:px-0"
            :class="!isDesktop && stuck ? 'is-stuck' : ''">
            <!-- ROW 1: the mark, the title and the controls. The title fits here at
                 17px with the scope stacked under it; at the 26px it once used, three
                 40px buttons and a title left neither of them room on a 390px row,
                 which is what the owner saw as everything sticking together. -->
            <div class="flex items-center gap-3">
               <button v-if="isDetail || isChatThread" @click="router.back()"
                  class="n-topbtn -ml-0.5 shrink-0">
                  <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                     <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span class="sr-only">Orqaga</span>
               </button>
               <!-- The panel's own mark. A controller never sees the sidebar on a phone,
                    so without it the app opens on an unbranded sheet of numbers. -->
               <img v-else src="/logo.svg" alt="" aria-hidden="true"
                  class="w-9 h-9 shrink-0 rounded-[0.85rem] bg-white p-1 lg:hidden"
                  style="box-shadow: 0 1px 2px rgba(16,24,40,0.06)" />

               <!-- The phone's title. One copy, one size, one place — it neither moves
                    nor resizes as the page scrolls under it. -->
               <div class="min-w-0 flex-1 lg:hidden">
                  <h2 class="n-title truncate">{{ topTitle }}</h2>
                  <p v-if="!isDetail && !isChatThread && scopeSuffix" class="n-title-scope truncate">
                     {{ scopeSuffix }}
                  </p>
               </div>
               <!-- A desktop keeps the title inline, where it always was: the panel sits
                    inside the dashboard chrome there and the row has room for it. The
                    two-row arrangement below exists for the phone. -->
               <div class="hidden lg:block min-w-0 flex-1">
                  <h2 class="text-[30px] leading-none font-bold tracking-[-0.03em] truncate">
                     {{ topTitle }}
                  </h2>
                  <p v-if="!isDetail && !isChatThread && scopeSuffix"
                     class="text-[13.5px] font-medium text-[color:var(--n-muted)] mt-1.5 truncate">
                     {{ scopeSuffix }}
                  </p>
               </div>

               <div class="flex items-center gap-2.5 shrink-0">
                  <!-- The exceptions live here now instead of on top of the main screen.
                       The badge is the whole point: the panel is worth opening only when
                       it has something in it. -->
                  <button @click="showBell = true" class="n-topbtn"
                     :title="activeProblems.length ? `${activeProblems.length} ta diqqat talab qiladigan holat` : 'Yangi bildirishnoma yo\'q'">
                     <span class="relative inline-flex">
                        <font-awesome-icon icon="bell" class="w-[17px] h-[17px]" />
                        <span v-if="activeProblems.length" class="n-bell-badge">{{ activeProblems.length }}</span>
                     </span>
                     <span class="sr-only">Diqqat talab qiladi</span>
                  </button>
                  <!-- Suhbat in the refresh slot (owner, 2026-08-15): the chat is the
                       button a controller actually reaches for, on the phone as well as
                       the desktop, and the panel already reloads itself on every period
                       and slice change. The refresh button survives only for logins with
                       no conversation to open (admin), so nobody is left with neither.
                       Restored here because the #79 revert rolled this region back. -->
                  <router-link v-if="canChat" to="/ai/nazorat/suhbat"
                     class="n-topbtn" title="Suhbat">
                     <span class="relative inline-flex">
                        <font-awesome-icon icon="comments" class="w-[17px] h-[17px]" />
                        <span v-if="s.chatUnread" class="n-bell-badge is-chat">{{ s.chatUnread }}</span>
                     </span>
                     <span class="sr-only">Suhbat</span>
                  </router-link>
                  <button v-else @click="refresh" class="n-topbtn" title="Yangilash">
                     <font-awesome-icon icon="rotate-right" class="w-[17px] h-[17px]"
                        :class="s.loading ? 'animate-spin' : ''" />
                     <span class="sr-only">Yangilash</span>
                  </button>
                  <!-- A controller has no sidebar on a phone (it would hold one link), so
                       the way out lives here. -->
                  <button v-if="isNazoratchi" @click="logout" class="n-topbtn lg:hidden">
                     <font-awesome-icon icon="right-from-bracket" class="w-[17px] h-[17px]" />
                     <span class="sr-only">Chiqish</span>
                  </button>
               </div>
            </div>

            <!-- Not over the chat: a conversation does not answer to a period, and a
                 date filter above it invites the reader to think their messages do. -->
            <div v-if="isKpiScreen" class="mt-3.5">
               <router-link to="/ai/nazorat/qiymatlar" v-if="!isValues"
                  class="btn-ghost inline-flex items-center gap-1.5 text-[13px]">
                  <font-awesome-icon icon="sliders" class="w-3.5 h-3.5" />
                  Qiymatlar
               </router-link>
               <router-link to="/ai/nazorat/kpi" v-else
                  class="btn-ghost inline-flex items-center gap-1.5 text-[13px]">
                  <font-awesome-icon icon="chevron-left" class="w-3 h-3" />
                  KPI
               </router-link>
            </div>
            <div v-if="!isDetail && !isChat && !isValues" class="seg mt-3.5 lg:inline-flex lg:w-auto">
               <button v-for="p in PERIODS" :key="p.value" @click="s.setPeriod(p.value)"
                  :class="s.period === p.value ? 'is-on' : ''">
                  {{ p.label }}
               </button>
            </div>
         </div>

         <div class="nazorat-scroll px-5 pt-4 lg:px-0 lg:pb-0">
            <!-- WHICH SLICE. Applied on the SERVER, so the cards, the ranking, the
                 journal and the person screens can never describe different slices. -->
            <!-- NOT on the KPI board or on Qiymatlar. A slice asks «what happened in
                 that group / that city»; the KPI board answers «what is this person
                 paid this month», which has no per-city version — the salary is one
                 number for the whole month. Leaving the controls there let somebody
                 slice a payslip and read the fragment as pay. -->
            <div v-if="!isDetail && !isChat && !isKpiScreen" class="flex flex-wrap items-center gap-2 mb-4">
               <select v-model="s.filterGroup" @change="s.setSlice()"
                  class="filter-select flex-1 min-w-0 lg:flex-none lg:max-w-[280px]">
                  <option value="">Barcha guruhlar</option>
                  <option v-for="g in groupChoices" :key="g.chat_id" :value="String(g.chat_id)">
                     {{ g.label }}
                  </option>
               </select>
               <!-- Not on Reyting (owner, 2026-08-07). It is cleared on the way in, not
                    just hidden: a slice that still applies behind a control the reader
                    cannot see is worse than one they can. See the watcher below. -->
               <select v-if="!isRating" v-model="s.filterCity" @change="s.setSlice()"
                  class="filter-select shrink-0">
                  <option value="">Ikkala shahar</option>
                  <option value="makka">Makka</option>
                  <option value="madina">Madina</option>
               </select>
               <template v-if="s.filterGroup || s.filterCity">
                  <button @click="s.clearSlice()" class="btn-ghost shrink-0">Tozalash</button>
                  <span class="text-[13px] text-[color:var(--n-muted)] basis-full">
                     Quyidagi barcha raqamlar faqat shu tanlov bo'yicha
                  </span>
               </template>
            </div>

            <!-- A skeleton in the shape of what is coming, not a spinner. The overview is
                 a known layout, so the wait can look like it. -->
            <div v-if="s.loading" class="space-y-3">
               <div class="card h-[168px] animate-pulse"></div>
               <div class="grid grid-cols-2 gap-3">
                  <div class="n-tile h-[124px] animate-pulse"></div>
                  <div class="n-tile h-[124px] animate-pulse"></div>
               </div>
               <div class="card h-[280px] animate-pulse"></div>
            </div>

            <div v-else-if="s.loadError" class="card p-6">
               <p class="n-h mb-1.5">Ma'lumotni yuklab bo'lmadi</p>
               <p class="text-[15px] text-[color:var(--n-ink-2)] leading-snug mb-5">
                  Bu «murojaat yo'q» degani EMAS. Server javob bermadi yoki ruxsat yetmadi.
               </p>
               <button @click="s.load()" class="btn-primary">Qayta urinish</button>
            </div>

            <!-- A person's screen replaces everything, on a phone and on a desktop alike:
                 it is a different question, not a section of the same page. -->
            <!-- The person screen and the CHAT get their own view even on a desktop.
                 The one-scroll below is four REPORTS read together in a meeting; a
                 conversation is not one of them, and dropping a message composer between
                 the ranking and the journal would make both harder to read. -->
            <router-view v-else-if="isDetail || isChat" />

            <!-- One screen at a time on a phone; on a desktop the same four panels stay a
                 single scroll, because the office reads the whole thing in a meeting and
                 tabbing through it there would be a step backwards. -->
            <router-view v-else-if="!isDesktop" />
            <div v-else class="space-y-8">
               <Holat />
               <section>
                  <h3 class="n-group-h mb-3">Reyting</h3>
                  <Reyting />
               </section>
               <section>
                  <h3 class="n-group-h mb-3">KPI</h3>
                  <Kpi />
               </section>
               <section v-if="auth.role !== 'nazoratchi_staff'">
                  <h3 class="n-group-h mb-3">Guruhlar taqsimoti</h3>
                  <Guruhlar />
               </section>
               <!-- Named so an outcome row on the overview can scroll to it: on a
                    desktop these are one page, so filtering the Jurnal from up there
                    changes nothing the reader can see unless the page moves. -->
               <section id="nazorat-jurnal" class="scroll-mt-4">
                  <h3 class="n-group-h mb-3">Jurnal</h3>
                  <Jurnal />
               </section>
            </div>
         </div>

         <!-- ───────────────────────── TAB BAR ─────────────────────────
              Phone only. A floating glass capsule inset from the edges, with the content
              scrolling under it, and padded for the home indicator: the panel is
              installed to the home screen, so an unpadded bar would sit under the
              iPhone's own. -->
         <nav v-if="!isDesktop && !isDetail && !isChatThread" class="nazorat-tabbar">
            <router-link v-for="t in TABS" :key="t.to" :to="t.to"
               :class="route.path === t.to ? 'is-active' : ''">
               <span class="relative inline-flex">
                  <font-awesome-icon :icon="t.icon" class="w-[22px] h-[22px]" />
               </span>
               <span class="truncate max-w-full">{{ t.label }}</span>
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
import Kpi from './nazorat/Kpi.vue'
import Jurnal from './nazorat/Jurnal.vue'
import Guruhlar from './nazorat/Guruhlar.vue'
import Ogohlantirishlar from './nazorat/Ogohlantirishlar.vue'
import { CHAT_ROLES, useNazoratStore } from '../stores/nazorat'
import { useAuthStore } from '../../../stores/auth'
import { PERIODS, useNazoratView } from './nazorat/shared'
import './nazorat/nazorat.css'

const s = useNazoratStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const {
   personWord, groupChoices, activeProblems, isStaffScope, isLeaderScope,
} = useNazoratView()

/** Whether this login has anybody to talk to. Mirrors CHAT_ROLES; the API is the
 *  authority and answers everyone else an empty inbox. */
const canChat = computed(() => CHAT_ROLES.includes(auth.role || ''))

const TABS = [
   { key: 'holat', to: '/ai/nazorat', label: 'Holat', icon: 'gauge-high' },
   { key: 'reyting', to: '/ai/nazorat/reyting', label: 'Reyting', icon: 'ranking-star' },
   { key: 'kpi', to: '/ai/nazorat/kpi', label: 'KPI', icon: 'star' },
   { key: 'jurnal', to: '/ai/nazorat/jurnal', label: 'Jurnal', icon: 'list-ul' },
   // Hidden from the crew's controller: the API refuses them this read, and offering a
   // tab that can only answer 403 is worse than not offering it.
   ...(auth.role === 'nazoratchi_staff'
      ? []
      : [{ key: 'guruhlar', to: '/ai/nazorat/guruhlar', label: 'Guruhlar', icon: 'users' }]),
   // NO Suhbat tab (owner, 2026-08-15): the chat's one entry is the top-bar button,
   // which shows on the phone too since it took the refresh slot. A sixth tab was
   // also what truncated «Reyting» and «Guruhlar» into «Reyti…» / «Guru…».
]

const isNazoratchi = computed(() => !!auth.role && auth.role.startsWith('nazoratchi'))
const isDetail = computed(() => route.path.startsWith('/ai/nazorat/xodim/'))
const isChat = computed(() => route.path === '/ai/nazorat/suhbat')
/** An OPEN CONVERSATION, not just the inbox. It behaves like the person screen — its own
 *  title, a back arrow, and no tab bar — because the composer lives at the bottom of the
 *  viewport and the tab bar is `position: fixed` over exactly that space. */
const isChatThread = computed(() => isChat.value && !!route.query.suhbat)
const chatPeerLabel = computed(() =>
   s.chatPeers.find((p) => p.role === route.query.suhbat)?.label || 'Suhbat')

/** Which population this login reads, as a subtitle under the panel's name. Empty for
 *  the combined account, which sees everyone and so has nothing to qualify. */
/** What the bar is titled. A conversation is titled by WHO it is with — the panel's name
 *  above somebody's messages tells the reader nothing they need. */
const topTitle = computed(() =>
   isDetail.value ? personWord.value
      : isChatThread.value ? chatPeerLabel.value : 'Nazorat')

const scopeSuffix = computed(() =>
   isStaffScope.value ? 'Xodimlar' : isLeaderScope.value ? 'Ellikboshilar' : '')

// The notifications panel. Closed by navigating as well as by the ✕: leaving a sheet
// hanging over a screen the reader has already moved away from is how a panel starts
// feeling like a bug.
const showBell = ref(false)
watch(() => route.path, () => (showBell.value = false))

/** Has anything scrolled under the title bar. Drives the hairline, which is drawn only
 *  once there is something on the other side of it to separate. */
const sentinel = ref<HTMLElement | null>(null)
const stuck = ref(false)
let io: IntersectionObserver | null = null

/** Which arrangement to render. A media query rather than `lg:hidden`, because the two
 *  arrangements mount DIFFERENT component instances - with CSS alone a desktop would
 *  build both and every screen would fetch twice. */
const mq = window.matchMedia('(min-width: 1024px)')
const isDesktop = ref(mq.matches)
function onMq(e: MediaQueryListEvent) { isDesktop.value = e.matches }

/** Reyting has no city filter (owner, 2026-08-07): the boards answer "who", and a city
 *  is a fact about the NEED, not about the person — a xodim works one city, so slicing
 *  their board by it only ever empties the other one.
 *
 *  Cleared on the way in rather than merely hidden. A filter that keeps applying while
 *  its control is off screen is exactly how a reader ends up comparing two numbers that
 *  were never describing the same thing. On a desktop the screens are one scroll, so the
 *  control stays: nothing is hidden there.
 *
 *  MUST stay below `isDesktop`. It reads it, and `immediate: true` runs the getter during
 *  setup — declared any earlier, `const isDesktop` is still in its temporal dead zone and
 *  the whole panel throws before it mounts. That is a blank screen with the reason only in
 *  a console, which cost an afternoon of chasing the network instead (2026-08-07). The
 *  compiler cannot see it: a TDZ violation is legal TypeScript. */
const isValues = computed(() => route.path === '/ai/nazorat/qiymatlar')
// The two screens the slice controls do not belong on. Grouped because they answer the
// same kind of question — one person's money, and the scheme behind it — neither of
// which has a per-city version.
const isKpiScreen = computed(() =>
   route.path === '/ai/nazorat/kpi' || isValues.value)
const isRating = computed(() => !isDesktop.value && route.path === '/ai/nazorat/reyting')
watch(isRating, (on) => {
   if (on && s.filterCity) {
      s.filterCity = ''
      s.setSlice()
   }
}, { immediate: true })

onMounted(() => {
   mq.addEventListener('change', onMq)
   if (sentinel.value) {
      io = new IntersectionObserver(([e]) => (stuck.value = !e.isIntersecting))
      io.observe(sentinel.value)
   }
})
onUnmounted(() => {
   mq.removeEventListener('change', onMq)
   io?.disconnect()
})

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

/** The unread badge, owned by the shell. It used to be refreshed only by the chat screen
 *  itself, which meant it only became correct once the reader had already opened the
 *  thing it exists to announce. Polled here it is right on whichever screen they are on,
 *  and it costs one small request a minute.
 *
 *  Deliberately slower than the chat's own 10s poll: a badge is an interruption, and it
 *  does not need to be to the second. Skipped entirely while the tab is hidden. */
let unreadTimer: number | undefined
onMounted(() => {
   if (!canChat.value) return
   s.loadChatUnread()
   unreadTimer = window.setInterval(() => {
      if (!document.hidden) s.loadChatUnread()
   }, 60000)
})
onUnmounted(() => { if (unreadTimer) window.clearInterval(unreadTimer) })
</script>

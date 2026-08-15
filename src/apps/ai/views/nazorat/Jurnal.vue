<template>
   <div class="space-y-3">
      <!-- One card per MUROJAAT, not one per person it was DM'd to.
           The old journal printed a sentence for every recipient, and a crew need goes
           to the whole city team — so about two of every three lines said "boshqa xodim
           qabul qildi", which is the same event told three times. What a reader actually
           asks of a log is "what happened to this complaint"; "what did THIS person do"
           is a different question and lives on the person's own screen. -->
      <!-- Two ways in, because they answer different questions and the office uses both:
           «Murojaatlar» is what happened to each complaint, «Xodimlar» is the way the
           journal was always read — find Ali, tap Ali, get Ali's log. -->
      <div class="seg">
         <button :class="mode === 'feed' ? 'is-on' : ''" @click="mode = 'feed'">Murojaatlar</button>
         <button :class="mode === 'people' ? 'is-on' : ''" @click="mode = 'people'">
            {{ personWord }}lar
         </button>
      </div>

      <!-- The chip row bleeds to the screen edges so a chip scrolled halfway out is cut
           by the screen rather than by an invisible container. The negative margin has
           to track the scroll container's own padding (px-5). -->
      <div v-if="mode === 'feed'" class="no-bar flex gap-2 overflow-x-auto -mx-5 px-5 py-0.5 lg:mx-0 lg:px-0">
         <button v-for="f in filters" :key="f.key" class="fchip shrink-0"
            :class="filter === f.key ? 'is-on' : ''" @click="setFilter(f.key)">
            {{ f.label }}<span v-if="f.count !== null" class="fchip-n">{{ f.count }}</span>
         </button>
      </div>

      <!-- A skeleton in the shape of the feed rather than a spinner: the wait should
           look like what is coming. -->
      <div v-if="s.requestsLoading" class="card divide-y divide-gray-100 overflow-hidden">
         <div v-for="i in 4" :key="i" class="flex gap-3.5 px-4 py-4">
            <span class="w-10 h-10 rounded-[1.125rem] bg-gray-100 shrink-0 animate-pulse"></span>
            <div class="flex-1 space-y-2 py-1">
               <div class="h-3 rounded-full bg-gray-100 animate-pulse"></div>
               <div class="h-3 w-2/3 rounded-full bg-gray-100 animate-pulse"></div>
            </div>
         </div>
      </div>

      <!-- BY PERSON. Tapping a name opens that person's screen — the same log as before,
           now with their numbers above it instead of only the sentences. -->
      <template v-else-if="mode === 'people'">
         <div v-if="!journalPeople.length"
            class="card py-16 text-center text-[15px] text-[color:var(--n-muted)]">
            {{ s.workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
               : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
         </div>
         <div v-else class="card divide-y divide-gray-100 overflow-hidden">
            <button v-for="p in journalPeople" :key="p.telegram_id" type="button"
               class="row-tap flex items-center gap-3.5 px-4 py-3 hover:bg-gray-50"
               @click="openPerson(p.telegram_id)">
               <span class="n-avatar" :class="p.leaderLevel ? 'n-avatar-leader' : ''">{{ p.initials }}</span>
               <span class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span class="text-[16px] font-semibold tracking-[-0.015em]">{{ p.name }}</span>
                  <span class="badge shrink-0"
                     :class="p.leaderLevel ? 'badge-indigo' : 'badge-amber'">{{ p.job }}</span>
               </span>
               <span class="text-[13.5px] text-[color:var(--n-muted)] shrink-0 tabular-nums">
                  {{ p.count }} ta
               </span>
               <font-awesome-icon icon="chevron-right"
                  class="w-3 h-3 text-[color:var(--n-faint)] shrink-0" />
            </button>
         </div>
      </template>

      <div v-else-if="!rows.length" class="card py-16 text-center text-[15px] text-[color:var(--n-muted)]">
         {{ s.requests.length ? 'Bu turdagi murojaat yo\'q' : 'Bu davrda murojaat bo\'lmagan' }}
      </div>

      <div v-else class="card divide-y divide-gray-100 overflow-hidden">
         <!-- One row = one murojaat, led by the outcome's own colour, the way the design
              leads every list row with a tinted icon. Colour here is never decoration:
              it is the same four-colour outcome vocabulary the rest of the panel uses. -->
         <article v-for="r in rows" :key="r.id" class="flex gap-3.5 px-4 py-4">
            <span class="n-ico mt-0.5" :style="{ '--c': r.outcome.color }">
               <font-awesome-icon :icon="r.outcome.icon" class="w-4 h-4" />
            </span>
            <div class="min-w-0 flex-1">
               <p class="text-[15.5px] leading-snug clamp2">
                  <!-- WHICH DOOR it came through, on every row. «Guruh» is what the
                       journal always held; «Shaxsiy» is a request the pilgrim opened in
                       their own cabinet, which nobody in the group saw them ask — which
                       is why a worker who answers it in the chat has just published one
                       pilgrim's private complaint to forty people. Same list either
                       way: it reached the same crew and it is graded the same. -->
                  <span class="badge mr-1 align-middle" :class="r.tag.cls" :title="r.tag.hint">
                     {{ r.tag.label }}
                  </span>
                  <span v-if="r.is_repeat" class="badge badge-amber mr-1 align-middle">Takroriy</span>
                  <span v-if="r.text">{{ r.text }}</span>
                  <span v-else class="text-[color:var(--n-faint)]">Matnsiz</span>
               </p>

               <!-- The outcome as a coloured word instead of a full sentence. Everything
                    the old sentence carried — who took it, how long it waited — is still
                    here, as data rather than prose. -->
               <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                  <span class="pill" :style="{ color: r.outcome.color, background: r.outcome.color + '17' }">
                     <i></i>{{ r.outcome.label }}
                  </span>
                  <span class="text-[13.5px] text-[color:var(--n-muted)] min-w-0">{{ r.outcome.detail }}</span>
               </div>

               <!-- WHERE it came from. The controller was not in that chat, so a request
                    text on its own is unreadable. -->
               <p class="flex flex-wrap gap-x-1.5 gap-y-0.5 mt-2 text-[12.5px] text-[color:var(--n-faint)]">
                  <span>{{ fmtDateTime(r.created_at) }}</span>
                  <span class="text-[color:var(--n-muted)]">· {{ r.group_label }}</span>
                  <span v-if="r.city">· {{ cityLabel(r.city) }}</span>
                  <span v-if="r.room_no">· {{ r.room_no }}-xona</span>
                  <span v-if="r.pilgrim_username">· {{ r.pilgrim_username }}</span>
                  <a v-if="r.message_link" :href="r.message_link" target="_blank"
                     class="font-medium text-[color:var(--n-ink-2)] underline underline-offset-2">Xabarni ko'rish</a>
                  <button v-if="r.is_repeat" @click="s.dismissReopen(r.id)"
                     class="font-medium text-[color:var(--n-ink-2)] underline underline-offset-2"
                     title="Bu aslida takror emas. Noto'g'ri aniqlangan qayta so'rovni bekor qiladi (asl murojaat yana «bajarildi» bo'ladi)">
                     Takror emas
                  </button>
               </p>
            </div>
         </article>
      </div>

      <!-- The feed is built from the last `reqLimit` murojaat, so say so rather than let
           a truncated list read as the whole period. -->
      <div v-if="s.requestsTruncated"
         class="flex flex-wrap items-center gap-3 text-[13.5px] text-[color:var(--n-muted)] px-1 pt-1">
         <span>
            Faqat oxirgi {{ s.requests.length }} ta murojaat ko'rsatilmoqda.
            Reyting esa butun davrni sanaydi.
         </span>
         <button v-if="s.reqLimit < MAX_REQ_LIMIT" @click="s.loadMoreRequests()" class="btn-ghost">
            Ko'proq yuklash
         </button>
      </div>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNazoratStore, MAX_REQ_LIMIT } from '../../stores/nazorat'
import { cityLabel, fmtDateTime, useNazoratView } from './shared'

const s = useNazoratStore()
const route = useRoute()
const router = useRouter()
const { feed, journalPeople, personWord, personWordLower } = useNazoratView()

// Which way in. Module-scope would survive a tab switch, but a fresh visit should land on
// the overview: the per-person list is the deliberate second step.
const mode = ref<'feed' | 'people'>('feed')

/** The outcome the feed is filtered to, taken from `?holat=` so an overview row can
 *  open this screen already narrowed (see Holat.vue). Watched rather than only read at
 *  setup, because on a desktop this component is already mounted when the overview
 *  above it navigates. */
const queryFilter = () =>
   typeof route.query.holat === 'string' && route.query.holat ? route.query.holat : 'all'
const filter = ref(queryFilter())
watch(() => route.query.holat, () => {
   filter.value = queryFilter()
   // A filter names an outcome, which only the feed has. Arriving with one while the
   // per-person list is open would apply it to nothing.
   if (filter.value !== 'all') mode.value = 'feed'
})

/** Clearing the chip clears the URL too, so the address bar never claims a filter the
 *  feed is no longer applying. */
function setFilter(key: string) {
   filter.value = key
   const holat = key === 'all' ? undefined : key
   if (route.query.holat !== holat) router.replace({ path: route.path, query: { holat } })
}

function openPerson(id: number) {
   router.push(`/ai/nazorat/xodim/${id}`)
}

const filters = computed(() => {
   const n = (k: string) => feed.value.filter((r) => r.outcome.key === k).length
   return [
      { key: 'all', label: 'Hammasi', count: feed.value.length },
      { key: 'never_accepted', label: 'Javobsiz', count: n('never_accepted') },
      { key: 'reopened', label: 'Bajarilmagan', count: n('reopened') },
      // The two chips that are NOT outcomes. Both cut across the grades, because they
      // are properties of the COMPLAINT rather than verdicts on a worker (see BUCKETS):
      // a takroriy need is graded Bajarildi and still answers «Takroriy», and a cabinet
      // request is graded exactly like a group one and still answers «Shaxsiy».
      { key: 'repeat', label: 'Takroriy', count: feed.value.filter((r) => r.is_repeat).length },
      // The only chip «Shaxsiy murojaat» left behind, and all it needs to be. It is a
      // filter over the window already loaded, not a second fetch: the truncation note
      // under the list says how much of the period that window is, and it says it for
      // this chip exactly as it does for every other one.
      {
         key: 'shaxsiy', label: 'Shaxsiy',
         count: feed.value.filter((r) => r.source === 'miniapp').length,
      },
      { key: 'completed', label: 'Bajarildi', count: n('completed') },
      { key: 'flagged', label: 'Xatolik', count: n('flagged') },
      // Empty outcomes are dropped, EXCEPT the one currently selected: arriving from an
      // overview row that reads 0 must still show which slice is being asked for, and
      // leave a chip to step back out of. The counts can legitimately differ from the
      // overview's anyway, since the feed holds only the last `reqLimit` murojaat.
   ].filter((f) => f.key === 'all' || f.count > 0 || f.key === filter.value)
})

const rows = computed(() =>
   filter.value === 'all' ? feed.value
      : filter.value === 'repeat' ? feed.value.filter((r) => r.is_repeat)
         : filter.value === 'shaxsiy' ? feed.value.filter((r) => r.source === 'miniapp')
            : feed.value.filter((r) => r.outcome.key === filter.value))

// This screen is the reason the drill-down exists, so it is the one that pays for it.
onMounted(() => s.loadRequests())
</script>

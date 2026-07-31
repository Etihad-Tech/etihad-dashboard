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

      <div v-if="mode === 'feed'" class="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-0.5 lg:mx-0 lg:px-0">
         <button v-for="f in filters" :key="f.key" class="fchip shrink-0"
            :class="filter === f.key ? 'is-on' : ''" @click="filter = f.key">
            {{ f.label }}<span v-if="f.count !== null" class="ml-1 opacity-60">{{ f.count }}</span>
         </button>
      </div>

      <div v-if="s.requestsLoading" class="card py-16 flex justify-center">
         <span class="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></span>
      </div>

      <!-- BY PERSON. Tapping a name opens that person's screen — the same log as before,
           now with their numbers above it instead of only the sentences. -->
      <template v-else-if="mode === 'people'">
         <div v-if="!journalPeople.length" class="card py-16 text-center text-gray-400 text-sm">
            {{ s.workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
               : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
         </div>
         <div v-else class="card divide-y divide-gray-100 overflow-hidden">
            <button v-for="p in journalPeople" :key="p.telegram_id" type="button"
               class="row-tap flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-gray-50/70"
               @click="openPerson(p.telegram_id)">
               <span class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span class="text-sm font-medium text-gray-900">{{ p.name }}</span>
                  <span class="badge shrink-0"
                     :class="p.role === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">{{ p.job }}</span>
               </span>
               <span class="text-[13px] text-gray-400 shrink-0 tabular-nums">{{ p.count }} ta murojaat</span>
               <svg class="w-3 h-3 text-gray-300 shrink-0" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.5"
                     stroke-linecap="round" stroke-linejoin="round" />
               </svg>
            </button>
         </div>
      </template>

      <div v-else-if="!rows.length" class="card py-16 text-center text-gray-400 text-sm">
         {{ s.requests.length ? 'Bu turdagi murojaat yo\'q' : 'Bu davrda murojaat bo\'lmagan' }}
      </div>

      <div v-else class="card divide-y divide-gray-100 overflow-hidden">
         <article v-for="r in rows" :key="r.id" class="px-4 py-3">
            <p class="text-sm text-gray-900 leading-snug clamp2">
               <span v-if="r.is_repeat" class="badge badge-amber mr-1 align-middle">Takroriy</span>
               {{ r.text || '—' }}
            </p>

            <!-- The outcome as a coloured word instead of a full sentence. Everything the
                 old sentence carried — who took it, how long it waited — is still here,
                 as data rather than prose. -->
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
               <span class="pill" :style="{ color: r.outcome.color, background: r.outcome.color + '14' }">
                  <i></i>{{ r.outcome.label }}
               </span>
               <span class="text-[13px] text-gray-500 min-w-0">{{ r.outcome.detail }}</span>
            </div>

            <!-- WHERE it came from. The controller was not in that chat, so a request
                 text on its own is unreadable. -->
            <p class="flex flex-wrap gap-x-1.5 gap-y-0.5 mt-1.5 text-[11px] text-gray-400">
               <span>{{ fmtDateTime(r.created_at) }}</span>
               <span class="text-gray-500">· {{ r.group_label }}</span>
               <span v-if="r.city">· {{ cityLabel(r.city) }}</span>
               <span v-if="r.room_no">· {{ r.room_no }}-xona</span>
               <span v-if="r.pilgrim_username">· {{ r.pilgrim_username }}</span>
               <a v-if="r.message_link" :href="r.message_link" target="_blank"
                  class="underline underline-offset-2 hover:text-gray-700">Xabarni ko'rish</a>
               <button v-if="r.is_repeat" @click="s.dismissReopen(r.id)"
                  class="underline underline-offset-2 hover:text-gray-700"
                  title="Bu aslida takror emas — noto'g'ri aniqlangan qayta so'rovni bekor qiladi (asl murojaat yana «bajarildi» bo'ladi)">
                  Takror emas
               </button>
            </p>
         </article>
      </div>

      <!-- The feed is built from the last `reqLimit` murojaat, so say so rather than let
           a truncated list read as the whole period. -->
      <div v-if="s.requestsTruncated" class="flex flex-wrap items-center gap-3 text-[13px] text-gray-500 px-1">
         <span>
            Faqat oxirgi {{ s.requests.length }} ta murojaat ko'rsatilmoqda —
            Reyting esa butun davrni sanaydi.
         </span>
         <button v-if="s.reqLimit < MAX_REQ_LIMIT" @click="s.loadMoreRequests()" class="btn-ghost">
            Ko'proq yuklash
         </button>
      </div>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNazoratStore, MAX_REQ_LIMIT } from '../../stores/nazorat'
import { cityLabel, fmtDateTime, useNazoratView } from './shared'

const s = useNazoratStore()
const router = useRouter()
const { feed, journalPeople, personWord, personWordLower } = useNazoratView()

// Which way in. Module-scope would survive a tab switch, but a fresh visit should land on
// the overview — the per-person list is the deliberate second step.
const mode = ref<'feed' | 'people'>('feed')
const filter = ref('all')

function openPerson(id: number) {
   router.push(`/ai/nazorat/xodim/${id}`)
}

const filters = computed(() => {
   const n = (k: string) => feed.value.filter((r) => r.outcome.key === k).length
   return [
      { key: 'all', label: 'Hammasi', count: feed.value.length },
      { key: 'never_accepted', label: 'Javobsiz', count: n('never_accepted') },
      { key: 'reopened', label: 'Bajarilmagan', count: n('reopened') },
      { key: 're_requests', label: 'Takroriy', count: n('re_requests') },
      { key: 'completed', label: 'Bajarildi', count: n('completed') },
      { key: 'flagged', label: 'Xatolik', count: n('flagged') },
   ].filter((f) => f.key === 'all' || f.count > 0)
})

const rows = computed(() =>
   filter.value === 'all' ? feed.value : feed.value.filter((r) => r.outcome.key === filter.value))

// This screen is the reason the drill-down exists, so it is the one that pays for it.
onMounted(() => s.loadRequests())
</script>

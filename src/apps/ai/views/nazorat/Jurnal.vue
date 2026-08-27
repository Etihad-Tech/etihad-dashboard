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

      <!-- LAVOZIM, not guruh/shahar (owner, 2026-08-20). The journal is read to find a
           PERSON, so the cut that helps here is "whose list am I reading" — a crew of
           twenty and eight leaders are two different questions and the answer to one is
           noise in the other. It narrows BOTH views: the murojaat feed keeps only the
           cards sent to that population, and the person list keeps only those people, so
           the two can never describe different sets. Hidden for a controller whose own
           scope is already one population — a filter with one option is furniture. -->
      <div v-if="!isLeaderScope && !isStaffScope" class="seg">
         <button :class="s.filterRole === '' ? 'is-on' : ''" @click="setRole('')">Hammasi</button>
         <button :class="s.filterRole === 'staff' ? 'is-on' : ''" @click="setRole('staff')">
            Ishchilar
         </button>
         <button :class="s.filterRole === 'ellikboshi' ? 'is-on' : ''"
            @click="setRole('ellikboshi')">Ellikboshilar</button>
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

      <!-- BY PERSON. Tapping a name opens THAT PERSON'S LOG, right here.
           It used to navigate to the person's screen, and when the duplicate journal was
           taken off that screen (owner: «журнал там лишний») this list started opening a
           payslip instead of a log — the journal by employee simply stopped existing
           (owner, 2026-08-20: «журнал по сотрудникам не работает, открывает kpi»).
           The log belongs to the journal, so it stays in the journal; the person's screen
           stays what it now is, which is their money. The link to it is still one tap. -->
      <template v-else-if="mode === 'people'">
         <div v-if="!journalPeople.length"
            class="card py-16 text-center text-[15px] text-[color:var(--n-muted)]">
            {{ s.workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
               : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
         </div>
         <div v-else class="card divide-y divide-gray-100 overflow-hidden">
            <template v-for="p in journalPeople" :key="p.telegram_id">
               <button type="button"
                  class="row-tap w-full flex items-center gap-3.5 px-4 py-3 hover:bg-gray-50"
                  @click="togglePerson(p.telegram_id)">
                  <span class="n-avatar" :class="p.leaderLevel ? 'n-avatar-leader' : ''">{{ p.initials }}</span>
                  <span class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                     <span class="text-[16px] font-semibold tracking-[-0.015em]">{{ p.name }}</span>
                     <span class="badge shrink-0"
                        :class="p.leaderLevel ? 'badge-indigo' : 'badge-amber'">{{ p.job }}</span>
                  </span>
                  <span class="text-[13.5px] text-[color:var(--n-muted)] shrink-0 tabular-nums">
                     {{ p.count }} ta
                  </span>
                  <font-awesome-icon :icon="openPersonId === p.telegram_id ? 'chevron-down' : 'chevron-right'"
                     class="w-3 h-3 text-[color:var(--n-faint)] shrink-0" />
               </button>

               <!-- Their log: one sentence per murojaat they were sent, newest first —
                    the same sentences the person's screen used to print. -->
               <div v-if="openPersonId === p.telegram_id" class="bg-gray-50/60 px-4 py-3">
                  <div v-if="!openEntries.length"
                     class="text-[13.5px] text-[color:var(--n-muted)]">
                     Bu davrda murojaat yo'q.
                  </div>
                  <ul v-else class="space-y-2.5">
                     <li v-for="e in openEntries" :key="e.id"
                        class="pl-3 border-l-2" :style="{ borderColor: e.sum.rail }">
                        <p class="text-[14px] leading-snug">{{ e.text }}</p>
                        <p class="text-[12.5px] mt-0.5" :style="{ color: e.sum.ink }">
                           {{ e.sum.text }}
                        </p>
                        <p class="text-[12px] text-[color:var(--n-faint)] mt-0.5">
                           {{ e.group_label }}
                           <template v-if="e.city"> · {{ cityLabel(e.city) }}</template>
                           <template v-if="e.room_no"> · {{ e.room_no }}-xona</template>
                           · {{ fmtDateTime(e.created_at) }}
                           <a v-if="e.message_link" :href="e.message_link" target="_blank"
                              rel="noopener" class="text-[color:var(--n-accent)] ml-1">Telegram</a>
                        </p>

                        <!-- CURATING THE BASE FROM THE PERSON'S OWN MONTH (owner,
                             2026-08-26). The control existed only in the feed, so the one
                             screen a nazoratchi actually reads a leader's month on could
                             show the cards and not correct them — and an already-excluded
                             card was not even marked here, which is worse: the month read
                             as if every card counted.

                             Same call as the feed's, deliberately: it takes the WHOLE
                             murojaat out, not this person's card, because «bu murojaat
                             xato edi» cannot be true of one recipient and false of the
                             colleague who got the same card. The line below says so, so
                             nobody reads it as a private edit to one leader's score. -->
                        <p v-if="entryExcluded(e)"
                           class="text-[12px] text-[color:var(--n-muted)] mt-0.5">
                           Xatolik — KPI dan chiqarilgan ·
                           {{ reasonTitle(entryExcluded(e)?.reason) }}
                           <span v-if="entryExcluded(e)?.note">— {{ entryExcluded(e)?.note }}</span>
                        </p>
                        <button v-if="requestById(e.id)" type="button"
                           class="text-[12px] text-[color:var(--n-accent)] mt-0.5 underline underline-offset-2"
                           @click="toggleExclude(e.id)">
                           {{ openExclude === e.id ? 'Yopish'
                              : entryExcluded(e) ? 'Sababni o\'zgartirish' : 'KPI dan chiqarish' }}
                        </button>
                        <div v-if="openExclude === e.id && requestById(e.id)" class="mt-1.5 space-y-1.5">
                           <div class="flex flex-wrap items-center gap-2 text-[12.5px]">
                              <span class="text-[color:var(--n-faint)]">
                                 Butun murojaat · {{ requestById(e.id)?.graded?.length || 0 }} kartochka
                              </span>
                              <select class="px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[12.5px]"
                                 :value="entryExcluded(e)?.reason || ''"
                                 @change="pick(requestById(e.id), $event)">
                                 <option value="">Hisobda</option>
                                 <option v-for="o in s.exclusionReasons" :key="o.code" :value="o.code">
                                    {{ o.title }}
                                 </option>
                              </select>
                           </div>
                           <input v-if="noteFor" v-model="noteText" type="text" maxlength="200"
                              placeholder="Sabab izohi — majburiy"
                              class="w-full px-2.5 py-1.5 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[12.5px]"
                              @keyup.enter="commitNote()" />
                           <button v-if="noteFor" class="btn-ghost text-[12.5px]" @click="commitNote()">
                              Saqlash
                           </button>
                        </div>
                     </li>
                  </ul>
                  <button type="button" class="btn-ghost mt-3 text-[13px]"
                     @click="openPerson(p.telegram_id)">
                     {{ p.name }} — KPI va oylik
                  </button>
               </div>
            </template>
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
                  <!-- «XATOLIK», not «KPI» (owner, 2026-08-20). The button names what
                       the controller is saying — this murojaat was a mistake — instead
                       of naming the machinery it happens to feed. -->
                  <button v-if="r.graded.length" @click="toggleExclude(r.id)"
                     class="font-medium text-[color:var(--n-ink-2)] underline underline-offset-2">
                     XATOLIK
                  </button>
               </p>

               <!-- TZ 5 — which of this murojaat's cards are out of the §8.1 base, and
                    why. Shown WITHOUT opening anything: an exclusion is the one thing on
                    this row that changes somebody's pay, so it cannot be a state you have
                    to go looking for. -->
               <p v-if="excludedInfo(r)" class="mt-1.5 text-[12.5px] text-[color:var(--n-muted)]">
                  Xatolik — KPI dan chiqarilgan · {{ reasonTitle(excludedInfo(r)?.reason) }}
                  <span v-if="excludedInfo(r)?.note">— {{ excludedInfo(r)?.note }}</span>
                  <span v-if="excludedInfo(r)?.partial">
                     · {{ excludedInfo(r)?.count }}/{{ r.graded.length }} kartochka
                  </span>
               </p>

               <!-- ONE reason for the whole murojaat (owner, 2026-08-20): «не надо там по
                    каждому сотруднику выбирать причину, нужно просто причина для этой
                    карточки». And that is what is being judged — «this murojaat was a
                    mistake» is a fact about the MESSAGE, and it cannot be true of one
                    recipient and false of the colleague who got the same card. The server
                    writes every graded card in one transaction. -->
               <div v-if="openExclude === r.id" class="mt-2 space-y-2">
                  <div class="flex flex-wrap items-center gap-2 text-[13px]">
                     <span class="min-w-0 flex-1 truncate text-[color:var(--n-muted)]">
                        {{ r.graded.length }} ta kartochka · {{ gradedNames(r) }}
                     </span>
                     <select class="px-2 py-1 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13px]"
                        :value="excludedInfo(r)?.reason || ''" @change="pick(r, $event)">
                        <option value="">Hisobda</option>
                        <option v-for="o in s.exclusionReasons" :key="o.code" :value="o.code">
                           {{ o.title }}
                        </option>
                     </select>
                  </div>
                  <!-- «Boshqa sabab» is the one code that cannot stand alone: an
                       unexplained «other» is an exclusion with no reason at all, and the
                       server refuses it. Asking here beats a rejected save. -->
                  <input v-if="noteFor" v-model="noteText" type="text" maxlength="200"
                     placeholder="Sabab izohi — majburiy"
                     class="w-full px-2.5 py-1.5 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13px]"
                     @keyup.enter="commitNote()" />
                  <button v-if="noteFor" class="btn-ghost text-[13px]" @click="commitNote()">
                     Saqlash
                  </button>
               </div>
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
import { useToast } from '../../../../composables/useToast'

const s = useNazoratStore()
const toast = useToast()

// TZ 5 — the open row, and the card waiting on a mandatory note. Both are single-
// valued: two half-finished exclusions on one screen is a way to save the wrong one.
const openExclude = ref<number | null>(null)
const noteFor = ref<any>(null)
const noteText = ref('')

function toggleExclude(id: number) {
   openExclude.value = openExclude.value === id ? null : id
   noteFor.value = null
   noteText.value = ''
   void s.loadExclusionReasons()
}

function cardName(c: any): string {
   const w = s.workers.find((x) => x.telegram_id === c.telegram_id)
   return (w && (w.name || w.username)) || c.username || ('ID ' + c.telegram_id)
}

function reasonTitle(code?: string | null): string {
   return s.exclusionReasons.find((o) => o.code === code)?.title || code || ''
}

/** What this murojaat's exclusion currently says, or null if it counts.
 *
 *  Read off the CARDS, because that is where it is stored and where every other reader
 *  (the ball, the export, a frozen month) reads it from. `partial` covers the rows
 *  written one card at a time before the reason became per-murojaat: they are shown as
 *  they are rather than rounded up into "excluded", which would claim a colleague's card
 *  had been taken out of their base when it had not. */
function excludedInfo(r: any) {
   const out = (r.graded || []).filter((c: any) => c.excluded_at)
   if (!out.length) return null
   return {
      reason: out[0].excluded_reason,
      note: out[0].excluded_note,
      count: out.length,
      partial: out.length < (r.graded || []).length,
   }
}

/** Who the murojaat's graded cards belong to — named, because the reason is one but the
 *  people it affects are not, and a controller should see whose month this touches. */
function gradedNames(r: any): string {
   const names = (r.graded || []).map(cardName)
   return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ')
}

/** The whole murojaat behind a per-person log entry.
 *
 *  The per-person log is built from one RECIPIENT row each (entriesFor), but an
 *  exclusion is a fact about the MESSAGE and is written for every graded recipient at
 *  once (owner, 2026-08-20). Looking the murojaat back up lets the person log reuse
 *  `pick` / `commitNote` / `excludedInfo` exactly as the feed calls them, so the two
 *  modes cannot end up with two different scopes for the same button.
 *
 *  Read off `feed`, NOT `s.requests`: `graded` (the cards this murojaat actually puts
 *  into somebody's base) is computed in the feed mapping and does not exist on the raw
 *  store rows. Looking it up there would have returned a murojaat whose `graded` was
 *  undefined, so `excludedInfo` would have found nothing and an already-excluded card
 *  would have silently rendered as counting — the button would have looked wired and
 *  the marker would never once have appeared. */
function requestById(id: number) {
   return feed.value.find((r: any) => r.id === id) || null
}

/** `excludedInfo` for a log entry, safe when the murojaat is not in the loaded page. */
function entryExcluded(e: any) {
   const r = requestById(e.id)
   return r ? excludedInfo(r) : null
}

/** A reason picked from the select. «boshqa» waits for its note; everything else
 *  writes at once — a confirm step on a reversible, audited action is friction that
 *  teaches people to tap through dialogs. */
async function pick(request: any, ev: Event) {
   const code = (ev.target as HTMLSelectElement).value || null
   if (code === 'boshqa') {
      noteFor.value = request
      noteText.value = excludedInfo(request)?.note || ''
      return
   }
   noteFor.value = null
   if (!(await s.setRequestExclusion(request.id, code))) {
      toast.error('Saqlanmadi')
      return
   }
   toast.success(code ? 'Xatolik — KPI dan chiqarildi' : 'KPI ga qaytarildi')
}

async function commitNote() {
   const request = noteFor.value
   if (!request || !noteText.value.trim()) return
   if (await s.setRequestExclusion(request.id, 'boshqa', noteText.value.trim())) {
      toast.success('Xatolik — KPI dan chiqarildi')
      noteFor.value = null
      noteText.value = ''
   } else {
      toast.error('Saqlanmadi')
   }
}
const route = useRoute()
const router = useRouter()
const { feed, journalPeople, entriesFor, personWord, personWordLower,
        isLeaderScope, isStaffScope } = useNazoratView()

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

/** The person whose log is expanded. One at a time: two open logs on a phone is a
 *  scroll through somebody else's month to reach the end of this one. */
const openPersonId = ref<number | null>(null)
function togglePerson(id: number) {
   openPersonId.value = openPersonId.value === id ? null : id
}

/** Built once per open person, not once per render: entriesFor walks every loaded
 *  murojaat, and the template asks for it twice (the empty check and the list). */
const openEntries = computed(() =>
   openPersonId.value === null ? [] : entriesFor(openPersonId.value))

/** ...and the way out to their money, kept as a deliberate second tap. */
function openPerson(id: number) {
   router.push(`/ai/nazorat/xodim/${id}`)
}

/** Changing the lavozim filter reloads nothing — both views are computed from the
 *  requests already loaded — but an expanded log belonging to somebody the filter has
 *  just hidden must not stay open underneath it. */
function setRole(role: string) {
   s.filterRole = role
   openPersonId.value = null
}

const filters = computed(() => {
   const n = (k: string) => feed.value.filter((r) => r.outcome.key === k).length
   return [
      { key: 'all', label: 'Hammasi', count: feed.value.length },
      { key: 'never_accepted', label: 'Javobsiz', count: n('never_accepted') },
      { key: 'reopened', label: 'Bajarilmagan', count: n('reopened') },
      // The one chip that is NOT an outcome: «Takroriy» cuts across the grades, because
      // a repeat is a property of the complaint and not a verdict on the worker (see
      // BUCKETS). A takroriy need is graded Bajarildi and still answers this chip.
      { key: 'repeat', label: 'Takroriy', count: feed.value.filter((r) => r.is_repeat).length },
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
         : feed.value.filter((r) => r.outcome.key === filter.value))

// This screen is the reason the drill-down exists, so it is the one that pays for it.
onMounted(() => s.loadRequests())
</script>

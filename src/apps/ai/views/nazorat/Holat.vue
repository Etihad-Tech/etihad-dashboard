<template>
   <div class="space-y-3">
      <!-- ──────────────── 1. WHAT NEEDS ATTENTION ────────────────
           The lead, by owner's choice: this panel is read to find the exceptions, so
           the exceptions come first and everything merely informative sits below.
           The wording of every hint is the owner's and stays verbatim — the compaction
           here is spacing, never words. -->
      <section v-if="problems.length" class="space-y-2">
         <div class="flex items-center gap-2 px-1">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ background: BUCKETS[2].color }"></span>
            <h3 class="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
               Diqqat talab qiladi
            </h3>
         </div>
         <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <!-- «Javobsiz qolgan» opens: a number nobody can act on is only half the
                 story, so tapping it names the messages and the people who did not take
                 them. The other tiles stay plain — they either already list their
                 people, or there is nothing to drill into. -->
            <component :is="p.key === 'never_accepted' ? 'button' : 'div'"
               v-for="p in problems" :key="p.key" type="button"
               class="card p-4 relative overflow-hidden text-left w-full"
               :class="p.key === 'never_accepted' ? 'active:bg-gray-50 transition-colors' : ''"
               @click="p.key === 'never_accepted' && toggleUnanswered()">
               <span class="absolute left-0 top-0 bottom-0 w-[3px]" :style="{ background: p.color }"></span>
               <div class="flex items-baseline gap-2">
                  <span class="text-[26px] leading-none font-semibold tracking-tight"
                     :style="{ color: p.color }">{{ p.value }}</span>
                  <span class="text-sm font-medium text-gray-900">{{ p.label }}</span>
                  <span v-if="p.key === 'never_accepted'"
                     class="ml-auto text-[13px] font-medium text-gray-500 whitespace-nowrap">
                     {{ showUnanswered ? 'Yashirish' : "Ko'rish" }}
                  </span>
               </div>
               <p class="text-[13px] text-gray-500 mt-1.5 leading-snug">{{ p.hint }}</p>
               <div v-if="p.people && p.people.length" class="flex flex-wrap gap-1.5 mt-2.5">
                  <span v-for="(who, i) in p.people" :key="i" class="chip">{{ who }}</span>
               </div>
            </component>
         </div>

         <!-- WHICH messages, and WHO did not take them. One block per message, because a
              crew need is sent to several people at once and the question is always
              "who ignored this one". -->
         <div v-if="showUnanswered" class="card p-4">
            <div v-if="s.requestsLoading" class="py-6 flex justify-center">
               <span class="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></span>
            </div>
            <template v-else>
               <div class="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <h4 class="text-sm font-semibold text-gray-900">Javobsiz qolgan murojaatlar</h4>
                  <p v-if="s.report && s.report.never_accepted > unansweredNeeds.length"
                     class="text-[13px] text-gray-500">
                     Jami {{ s.report.never_accepted }} ta kartochka · quyida oxirgi
                     {{ unansweredNeeds.length }} ta murojaat
                  </p>
               </div>
               <div v-if="!unansweredNeeds.length"
                  class="flex flex-wrap items-center gap-3 py-2 text-[13px] text-gray-500">
                  <span>Bu murojaatlar ko'rsatilayotgan oxirgi {{ s.requests.length }} tadan tashqarida.</span>
                  <button v-if="s.reqLimit < MAX_REQ_LIMIT" @click="s.loadMoreRequests()" class="btn-ghost">
                     Ko'proq yuklash
                  </button>
               </div>
               <div v-else class="divide-y divide-gray-100 -mx-4">
                  <div v-for="n in unansweredNeeds" :key="n.id" class="px-4 py-3">
                     <p class="text-sm text-gray-900 leading-snug">{{ n.text || '—' }}</p>
                     <p class="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-xs text-gray-500">
                        <span>{{ fmtDateTime(n.created_at) }}</span>
                        <span class="font-medium text-gray-700">· {{ n.group_label }}</span>
                        <span v-if="n.city">· {{ cityLabel(n.city) }}</span>
                        <span v-if="n.room_no">· {{ n.room_no }}-xona</span>
                        <span v-if="n.pilgrim_username">· {{ n.pilgrim_username }}</span>
                        <a v-if="n.message_link" :href="n.message_link" target="_blank"
                           class="text-gray-500 underline underline-offset-2">Xabarni ko'rish</a>
                     </p>
                     <!-- The people it reached who never took it, each with the JOB that
                          explains why they were the ones asked. -->
                     <div class="flex flex-wrap gap-1.5 mt-2">
                        <span class="text-xs text-gray-500 mr-0.5">Qabul qilmadi:</span>
                        <span v-for="w in n.ignored" :key="w.telegram_id"
                           class="chip inline-flex items-center gap-1.5">
                           {{ w.name }}
                           <span class="badge"
                              :class="w.role === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">
                              {{ w.job }}
                           </span>
                        </span>
                     </div>
                  </div>
               </div>
            </template>
         </div>
      </section>

      <section v-else class="card px-4 py-3.5 flex items-center gap-3">
         <span class="w-8 h-8 rounded-full grid place-items-center shrink-0"
            :style="{ background: BUCKETS[0].color + '1a' }">
            <span class="w-2 h-2 rounded-full" :style="{ background: BUCKETS[0].color }"></span>
         </span>
         <div>
            <p class="text-sm font-medium text-gray-900">Diqqat talab qiladigan holat yo'q</p>
            <p class="text-[13px] text-gray-500">
               Bu davrda javobsiz qolgan, qayta so'ralgan yoki yetib bormagan murojaat yo'q.
            </p>
         </div>
      </section>

      <!-- ──────────────── 2. THE SPLIT ────────────────
           One proportional bar instead of four equal cards: the question is "how did the
           work end up", and that is a composition, not four unrelated numbers. Direct-
           labelled underneath, so identity never rests on colour alone. -->
      <section class="card p-4">
         <div class="flex flex-wrap items-baseline justify-between gap-x-2">
            <h3 class="text-[15px] font-semibold text-gray-900">
               {{ personWord }} javoblari — natija
            </h3>
            <p class="text-[13px] text-gray-500">
               Jami {{ bucketTotal }} ta kartochka · har bir {{ personWordLower }} uchun
               alohida sanaladi
            </p>
         </div>

         <div v-if="bucketTotal" class="mt-3 flex gap-0.5 h-3" role="img"
            :aria-label="bucketSegments.map(sg => `${sg.label}: ${sg.value}`).join(', ')">
            <div v-for="sg in bucketSegments" :key="sg.key" class="rounded-[3px] transition-all"
               :style="{ width: sg.pct + '%', background: sg.color }" :title="`${sg.label}: ${sg.value}`">
            </div>
         </div>
         <div v-else class="mt-3 h-3 rounded-[3px] bg-gray-100"></div>

         <div class="grid gap-x-5 gap-y-2.5 mt-4 sm:grid-cols-2">
            <div v-for="b in bucketRows" :key="b.key" class="flex gap-2">
               <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" :style="{ background: b.color }"></span>
               <div class="min-w-0">
                  <p class="text-sm">
                     <span class="font-semibold text-gray-900 tabular-nums">{{ b.value }}</span>
                     <span class="text-gray-900 font-medium ml-1.5">{{ b.label }}</span>
                     <span v-if="bucketTotal" class="text-gray-500 ml-1.5 tabular-nums">{{ b.pctLabel }}</span>
                  </p>
                  <p class="text-[13px] text-gray-500 leading-snug">{{ b.hint }}</p>
               </div>
            </div>
         </div>
      </section>

      <!-- ──────────────── 3. CONTEXT NUMBERS ────────────────
           Deliberately small: they describe the period, they are not the verdict on
           anybody. One row even on a phone — stacked they took three full-width rows and
           read as three findings rather than one footnote. -->
      <section class="card flex divide-x divide-gray-100">
         <!-- Labels WRAP rather than truncate: «O'rtacha javob vaqti» is the owner's
              wording and clipping it to «O'rtacha jav…» would be shortening it by other
              means. -->
         <div v-for="c in contextStats" :key="c.label" class="flex-1 min-w-0 px-3 py-2.5">
            <p class="text-[11px] text-gray-500 leading-tight">{{ c.label }}</p>
            <p class="text-[17px] font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">
               {{ c.value }}
            </p>
            <p v-if="c.hint" class="text-[11px] text-gray-400 leading-tight mt-0.5">{{ c.hint }}</p>
         </div>
      </section>

      <!-- confirmed bot mistakes, by kind -->
      <section v-if="errorKinds.length" class="card p-4">
         <h3 class="text-[15px] font-semibold text-gray-900 mb-3">Bot xatolari — turlari bo'yicha</h3>
         <div class="space-y-2.5">
            <div v-for="k in errorKinds" :key="k.label" class="flex items-center gap-3">
               <span class="text-[13px] text-gray-600 w-32 sm:w-44 shrink-0 truncate">{{ k.label }}</span>
               <div class="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full bg-gray-500"
                     :style="{ width: (s.report && s.report.bot_mistakes ? (k.count / s.report.bot_mistakes * 100) : 0) + '%' }"></div>
               </div>
               <span class="text-sm font-semibold text-gray-900 tabular-nums w-6 text-right">{{ k.count }}</span>
            </div>
         </div>
      </section>

      <!-- tuning — ADMIN ONLY: these fields decide who turns red, and the toggle can stop
           the recording entirely, so the nazoratchi does not get them (the API enforces
           it too; this only avoids showing a button that 403s) -->
      <section v-if="isAdmin" class="card p-4">
         <h3 class="text-[15px] font-semibold text-gray-900 mb-1">Sozlamalar</h3>
         <p class="text-[13px] text-gray-500 mb-4">
            Bir xil so'rov qayta kelganda: xodim uchun oyna tugagach — yangi so'rov;
            ellikboshi uchun 0 = hech qachon tugamaydi (doim hal qilinmagan deb sanaladi).
         </p>
         <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
               <label class="lbl">Xodim oynasi (soat)</label>
               <input v-model.number="s.form.staff_repeat_window_hours" type="number" min="0" class="inp" />
            </div>
            <div>
               <label class="lbl">Ellikboshi oynasi (soat, 0 = cheksiz)</label>
               <input v-model.number="s.form.ellikboshi_repeat_window_hours" type="number" min="0" class="inp" />
            </div>
            <div>
               <label class="lbl">IT guruh ID</label>
               <input v-model.number="s.form.it_group_id" type="number" class="inp" />
            </div>
            <div>
               <label class="lbl">IT mavzu (topic) ID</label>
               <input v-model.number="s.form.it_topic_id" type="number" class="inp" />
            </div>
         </div>
         <div class="flex flex-wrap gap-3 items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button @click="s.form.is_enabled = !s.form.is_enabled"
               class="flex items-center gap-2 text-sm font-medium transition-colors"
               :class="s.form.is_enabled ? 'text-gray-900' : 'text-gray-400'">
               <font-awesome-icon :icon="s.form.is_enabled ? 'toggle-on' : 'toggle-off'" class="w-5 h-5" />
               {{ s.form.is_enabled ? 'Nazorat yoqilgan' : 'Nazorat o\'chirilgan' }}
            </button>
            <div class="flex items-center gap-3">
               <span v-if="s.savedMsg" class="text-[13px] text-gray-500">{{ s.savedMsg }}</span>
               <button @click="s.save()" :disabled="s.saving" class="btn-primary">
                  {{ s.saving ? 'Saqlanmoqda...' : 'Saqlash' }}
               </button>
            </div>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNazoratStore, MAX_REQ_LIMIT } from '../../stores/nazorat'
import { useAuthStore } from '../../../../stores/auth'
import { BUCKETS, cityLabel, fmtDateTime, useNazoratView } from './shared'

const s = useNazoratStore()
const auth = useAuthStore()
const {
   personWord, personWordLower, problems, bucketRows, bucketTotal, bucketSegments,
   contextStats, errorKinds, unansweredNeeds,
} = useNazoratView()

// Only the admin may tune the control system (the API enforces it; this hides the form).
const isAdmin = computed(() => !auth.role || auth.role === 'admin')

// Closed by default — the tile is a headline first, a drill-down only when asked. Opening
// it is also what pays for the heavy /control/requests read, which is why that fetch no
// longer rides along with the summary.
const showUnanswered = ref(false)
function toggleUnanswered() {
   showUnanswered.value = !showUnanswered.value
   if (showUnanswered.value) s.loadRequests()
}
</script>

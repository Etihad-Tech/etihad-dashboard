<template>
   <AppLayout>
      <div class="space-y-5">
         <!-- ───────────────────────── HEADER ───────────────────────── -->
         <div class="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
            <div>
               <h2 class="text-[26px] leading-tight font-semibold tracking-tight text-gray-900">
                  {{ scopeTitle }}
               </h2>
               <p class="text-sm text-gray-500 mt-1">{{ scopeSubtitle }}</p>
            </div>
            <div class="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
               <button v-for="p in PERIODS" :key="p.value" @click="setPeriod(p.value)"
                  class="px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all"
                  :class="period === p.value
                     ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                     : 'text-gray-500 hover:text-gray-900'">
                  {{ p.label }}
               </button>
            </div>
         </div>

         <!-- WHICH SLICE. Applied on the SERVER, so the cards, the trend, the table and
              the journal can never end up describing different slices. -->
         <div class="flex flex-wrap items-center gap-2 animate-fade-up">
            <select v-model="filterGroup" @change="load" class="filter-select max-w-[260px]">
               <option value="">Barcha guruhlar</option>
               <option v-for="g in groupChoices" :key="g.chat_id" :value="String(g.chat_id)">
                  {{ g.label }}
               </option>
            </select>
            <select v-model="filterCity" @change="load" class="filter-select">
               <option value="">Ikkala shahar</option>
               <option value="makka">Makka</option>
               <option value="madina">Madina</option>
            </select>
            <template v-if="filterGroup || filterCity">
               <button @click="clearSlice"
                  class="text-[13px] text-gray-500 hover:text-gray-900 underline underline-offset-2">
                  Filtrni tozalash
               </button>
               <span class="text-xs text-gray-400">
                  Quyidagi barcha raqamlar faqat shu tanlov bo'yicha
               </span>
            </template>
         </div>

         <div v-if="loading" class="flex justify-center py-20">
            <div class="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
         </div>

         <div v-else-if="loadError" class="card p-5 animate-fade-up">
            <p class="font-semibold text-gray-900 mb-1">Ma'lumotni yuklab bo'lmadi</p>
            <p class="text-sm text-gray-600 mb-4">
               Bu «murojaat yo'q» degani EMAS — server javob bermadi yoki ruxsat yetmadi.
            </p>
            <button @click="load" class="btn-primary">Qayta urinish</button>
         </div>

         <template v-else>
            <!-- ──────────────── 1. WHAT NEEDS ATTENTION ────────────────
                 The lead, by owner's choice: this page is read in a meeting to find
                 the exceptions, so the exceptions come first and everything that is
                 merely informative sits below them. -->
            <section v-if="problems.length" class="space-y-2.5 animate-fade-up">
               <div class="flex items-center gap-2 px-1">
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ background: BUCKETS[2].color }"></span>
                  <h3 class="text-[13px] font-semibold uppercase tracking-wide text-gray-500">
                     Diqqat talab qiladi
                  </h3>
               </div>
               <!-- Separate tiles rather than one divided panel: the count varies from one
                    to six, and a divided grid leaves a visible empty cell whenever the
                    last row is short. -->
               <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  <div v-for="p in problems" :key="p.key" class="card p-5 relative overflow-hidden">
                     <span class="absolute left-0 top-0 bottom-0 w-[3px]" :style="{ background: p.color }"></span>
                     <div class="flex items-baseline gap-2">
                        <span class="text-[32px] leading-none font-semibold tracking-tight"
                           :style="{ color: p.color }">{{ p.value }}</span>
                        <span class="text-sm font-medium text-gray-900">{{ p.label }}</span>
                     </div>
                     <p class="text-[13px] text-gray-500 mt-2 leading-snug">{{ p.hint }}</p>
                     <div v-if="p.people && p.people.length" class="flex flex-wrap gap-1.5 mt-3">
                        <span v-for="(who, i) in p.people" :key="i" class="chip">{{ who }}</span>
                     </div>
                  </div>
               </div>
            </section>

            <section v-else class="card px-5 py-4 flex items-center gap-3 animate-fade-up">
               <span class="w-8 h-8 rounded-full grid place-items-center"
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
                 One proportional bar instead of four equal cards: the question is
                 "how did the work end up", and that is a composition, not four
                 unrelated numbers. Direct-labelled underneath, so identity never
                 rests on colour alone. -->
            <section class="card p-5 animate-fade-up">
               <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 class="text-base font-semibold text-gray-900">
                     {{ personWord }} javoblari — natija
                  </h3>
                  <p class="text-[13px] text-gray-500">
                     Jami {{ bucketTotal }} ta kartochka · har bir {{ personWordLower }} uchun
                     alohida sanaladi
                  </p>
               </div>

               <div v-if="bucketTotal" class="mt-4 flex gap-0.5 h-3.5" role="img"
                  :aria-label="bucketSegments.map(s => `${s.label}: ${s.value}`).join(', ')">
                  <div v-for="s in bucketSegments" :key="s.key" class="rounded-[3px] transition-all"
                     :style="{ width: s.pct + '%', background: s.color }" :title="`${s.label}: ${s.value}`">
                  </div>
               </div>
               <div v-else class="mt-4 h-3.5 rounded-[3px] bg-gray-100"></div>

               <div class="grid gap-x-6 gap-y-3 mt-5 sm:grid-cols-2">
                  <div v-for="b in bucketRows" :key="b.key" class="flex gap-2.5">
                     <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" :style="{ background: b.color }"></span>
                     <div class="min-w-0">
                        <p class="text-sm">
                           <span class="font-semibold text-gray-900 tabular-nums">{{ b.value }}</span>
                           <span class="text-gray-900 font-medium ml-1.5">{{ b.label }}</span>
                           <span v-if="bucketTotal" class="text-gray-500 ml-1.5 tabular-nums">
                              {{ b.pctLabel }}
                           </span>
                        </p>
                        <p class="text-[13px] text-gray-500 leading-snug">{{ b.hint }}</p>
                     </div>
                  </div>
               </div>

               <p class="text-[13px] text-gray-500 mt-5 pt-4 border-t border-gray-100 leading-relaxed">
                  Ziyoratchi bitta narsani ikki marta so'rasa, u <b>bitta</b> hodisa <b>ikkita</b>
                  raqam beradi: birinchi murojaatni olgan {{ personWordLower }}ga
                  <b class="whitespace-nowrap">Bajarilmagan</b>, ikkinchisini olganiga
                  <b class="whitespace-nowrap">Takroriy so'rov</b>.
               </p>
            </section>

            <!-- ──────────────── 3. CONTEXT NUMBERS ────────────────
                 Deliberately small: they describe the period, they are not the
                 verdict on anybody. -->
            <section class="card divide-y divide-gray-100 sm:divide-y-0 sm:flex sm:divide-x animate-fade-up">
               <div v-for="c in contextStats" :key="c.label" class="flex-1 px-5 py-4">
                  <p class="text-[13px] text-gray-500">{{ c.label }}</p>
                  <p class="text-xl font-semibold text-gray-900 tabular-nums mt-0.5">{{ c.value }}</p>
                  <p v-if="c.hint" class="text-xs text-gray-400 mt-0.5">{{ c.hint }}</p>
               </div>
            </section>

            <!-- ──────────────── 4. TREND ──────────────── -->
            <section class="card p-5 animate-fade-up">
               <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                     <h3 class="text-base font-semibold text-gray-900">Vaqt bo'yicha dinamika</h3>
                     <p class="text-[13px] text-gray-500 mt-0.5">
                        {{ period === 'day' ? 'Soatlar' : 'Kunlar' }} bo'yicha
                        {{ personWordLower }} javoblari · Makka/Madina vaqti
                     </p>
                  </div>
                  <!-- Own legend rather than chart.js's, so it matches the split bar
                       above it exactly — same dots, same order, same wording. -->
                  <div class="flex flex-wrap gap-x-4 gap-y-1.5">
                     <span v-for="b in BUCKETS" :key="b.key" class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full" :style="{ background: b.color }"></span>
                        <span class="text-[13px] text-gray-600">{{ b.label }}</span>
                     </span>
                  </div>
               </div>
               <div v-if="trendLabels.length" class="h-64 sm:h-72 mt-5">
                  <Line :data="trendData" :options="trendOptions" :plugins="[crosshairPlugin]" />
               </div>
               <div v-else class="py-16 text-center text-gray-400 text-sm">
                  Bu davr uchun ma'lumot yo'q
               </div>
            </section>

            <!-- confirmed bot mistakes, by kind -->
            <section v-if="errorKinds.length" class="card p-5 animate-fade-up">
               <h3 class="text-base font-semibold text-gray-900 mb-4">Bot xatolari — turlari bo'yicha</h3>
               <div class="space-y-3">
                  <div v-for="k in errorKinds" :key="k.label" class="flex items-center gap-3">
                     <span class="text-[13px] text-gray-600 w-44 shrink-0">{{ k.label }}</span>
                     <div class="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div class="h-full rounded-full bg-gray-500"
                           :style="{ width: (report && report.bot_mistakes ? (k.count / report.bot_mistakes * 100) : 0) + '%' }"></div>
                     </div>
                     <span class="text-sm font-semibold text-gray-900 tabular-nums w-6 text-right">{{ k.count }}</span>
                  </div>
               </div>
            </section>

            <!-- ──────────────── 5. PER-PERSON EVIDENCE ──────────────── -->
            <section class="animate-fade-up">
               <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 class="text-base font-semibold text-gray-900">{{ personWord }}lar nazorati</h3>
                  <div class="flex flex-wrap items-center gap-2">
                     <!-- Only the combined account ever sees both lavozim in the data. -->
                     <select v-if="scope === 'all'" v-model="filterRole" class="filter-select">
                        <option value="">Barcha lavozimlar</option>
                        <option value="staff">Xodim</option>
                        <option value="ellikboshi">Ellikboshi</option>
                     </select>
                     <select v-model="filterName" class="filter-select max-w-[190px]">
                        <option value="">Barcha ismlar</option>
                        <option v-for="n in workerNameOptions" :key="n" :value="n">{{ n }}</option>
                     </select>
                  </div>
               </div>

               <div v-if="filteredWorkers.length === 0" class="card py-16 text-center text-gray-400 text-sm">
                  {{ workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
                     : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
               </div>
               <div v-else class="card overflow-x-auto">
                  <table class="w-full text-sm min-w-[860px]">
                     <thead>
                        <tr class="text-left text-xs text-gray-500 bg-gray-50/80 border-b border-gray-100">
                           <th class="px-5 py-3 font-medium">{{ personWord }}</th>
                           <th class="px-3 py-3 font-medium" title="Qaysi shaharlarda va nechta guruhda ishlagan">Qayerda</th>
                           <th class="px-3 py-3 font-medium text-right" title="Shu odamga yuborilgan kartochkalar soni">Murojaat</th>
                           <th class="px-3 py-3 font-medium text-right">Qabul</th>
                           <th class="px-4 py-3 font-medium">Natija</th>
                           <th v-for="(b, bi) in BUCKETS" :key="b.key" class="py-3 font-medium text-right"
                              :class="bi === BUCKETS.length - 1 ? 'px-5' : 'px-3'" :title="b.hint">
                              <span class="inline-flex items-center gap-1.5">
                                 <span class="w-1.5 h-1.5 rounded-full" :style="{ background: b.color }"></span>
                                 {{ b.short }}
                              </span>
                           </th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="w in filteredWorkers" :key="w.telegram_id"
                           class="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors">
                           <td class="px-5 py-3.5">
                              <div class="flex items-center gap-2 min-w-0">
                                 <span class="font-medium text-gray-900 truncate">
                                    {{ w.name || w.username || ('ID ' + w.telegram_id) }}
                                 </span>
                                 <span class="badge shrink-0"
                                    :class="w.role === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">
                                    {{ jobLabel(w) }}
                                 </span>
                              </div>
                              <p v-if="w.name && w.username" class="text-xs text-gray-400 mt-0.5">{{ w.username }}</p>
                           </td>
                           <td class="px-3 py-3.5 text-[13px] text-gray-500 whitespace-nowrap">{{ whereLabel(w) }}</td>
                           <td class="px-3 py-3.5 text-right text-gray-900 tabular-nums">{{ w.dms }}</td>
                           <td class="px-3 py-3.5 text-right text-gray-900 tabular-nums">{{ w.accepted }}</td>
                           <!-- The row's own composition, so a sheet of numbers can be
                                scanned at a glance for who is mostly red or mostly blue. -->
                           <td class="px-4 py-3.5">
                              <div v-if="w.dms" class="flex gap-0.5 h-2 w-[120px]" :title="rowSplitHint(w)">
                                 <div v-for="s in rowSegments(w)" :key="s.key" class="rounded-[2px]"
                                    :style="{ width: s.pct + '%', background: s.color }"></div>
                              </div>
                           </td>
                           <!-- Values in ink, identity from the dot in the header: an
                                amber numeral on white is unreadable at this size. -->
                           <td v-for="(b, bi) in BUCKETS" :key="b.key" class="py-3.5 text-right tabular-nums"
                              :class="[bi === BUCKETS.length - 1 ? 'px-5' : 'px-3',
                                       (w as any)[b.key] ? 'text-gray-900 font-medium' : 'text-gray-400']">
                              {{ (w as any)[b.key] }}
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
               <p class="text-[13px] text-gray-500 mt-3 leading-relaxed">
                  Har bir qatorda <b>Qabul = Bajarildi + Takroriy so'rov + Bajarilmagan</b>.
                  Qabul va Javobsiz yig'indisi Murojaatdan kam bo'lishi mumkin — ba'zi kartochkalar
                  {{ personWordLower }}ning zimmasidan chiqib ketadi (boshqasi qabul qilgan yoki
                  umuman yetib bormagan); ular «Natija» ustunida <b>kulrang</b> ko'rinadi.
                  Sonlar {{ personWordLower }}lar o'rtasida turlicha bo'lishi ham normal: kartochka faqat
                  <b>o'sha paytdagi shahar jamoasiga</b> yuboriladi, shifokorga esa faqat sog'liq
                  murojaatlari — hammaga hamma murojaat bormaydi.
               </p>
            </section>

            <!-- ──────────────── 6. JOURNAL ──────────────── -->
            <section class="animate-fade-up">
               <div class="flex items-center justify-between mb-3">
                  <h3 class="text-base font-semibold text-gray-900">
                     Har bir {{ personWordLower }} bo'yicha jurnal
                  </h3>
                  <button @click="showRequests = !showRequests"
                     class="text-[13px] font-medium text-gray-500 hover:text-gray-900">
                     {{ showRequests ? 'Yashirish' : 'Ko\'rsatish' }}
                  </button>
               </div>
               <div v-if="showRequests">
                  <div v-if="staffLogs.length === 0" class="card py-16 text-center text-gray-400 text-sm">
                     {{ workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
                        : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
                  </div>
                  <div v-else class="card divide-y divide-gray-100 overflow-hidden">
                     <div v-for="s in staffLogs" :key="s.telegram_id">
                        <button type="button" @click="toggleStaff(s.telegram_id)"
                           class="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-gray-50/70 transition-colors">
                           <span class="flex items-center gap-2.5 min-w-0">
                              <!-- An SVG chevron, not a "▶" character: the glyph falls back
                                   to an emoji box in several Windows fonts. -->
                              <svg class="w-3 h-3 shrink-0 text-gray-400 transition-transform"
                                 :class="expandedStaff.has(s.telegram_id) ? 'rotate-90' : ''"
                                 viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                 <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.5"
                                    stroke-linecap="round" stroke-linejoin="round" />
                              </svg>
                              <span class="text-sm font-medium text-gray-900 truncate">
                                 {{ s.name || s.username || ('ID ' + s.telegram_id) }}
                              </span>
                              <span v-if="scope === 'all'" class="badge shrink-0"
                                 :class="s.role === 'ellikboshi' ? 'badge-indigo' : 'badge-amber'">
                                 {{ s.role === 'ellikboshi' ? 'Ellikboshi' : 'Xodim' }}
                              </span>
                           </span>
                           <span class="text-[13px] text-gray-400 shrink-0 tabular-nums">
                              {{ s.entries.length }} ta murojaat
                           </span>
                        </button>
                        <div v-if="expandedStaff.has(s.telegram_id)" class="px-5 pb-4 pt-1 space-y-4 bg-gray-50/60">
                           <div v-for="(e, i) in s.entries" :key="i" class="pl-3.5 border-l-2"
                              :style="{ borderColor: e.sum.rail }">
                              <p class="text-sm text-gray-900 leading-snug">
                                 <span v-if="e.parent_request_id && !e.reopen_dismissed"
                                    class="badge badge-amber mr-1.5 align-middle">Takroriy so'rov</span>
                                 {{ e.text || '—' }}
                              </p>
                              <!-- WHERE it came from. The controller was not in that
                                   chat, so a request text on its own is unreadable. -->
                              <p class="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-xs text-gray-500">
                                 <span class="font-medium text-gray-700">{{ e.group_label }}</span>
                                 <span v-if="e.city">· {{ cityLabel(e.city) }}</span>
                                 <span v-if="e.room_no">· {{ e.room_no }}-xona</span>
                                 <span v-if="e.pilgrim_username">· {{ e.pilgrim_username }}</span>
                              </p>
                              <p class="text-[13px] mt-1 leading-snug" :style="{ color: e.sum.ink }">
                                 {{ e.sum.text }}
                                 <a v-if="e.message_link" :href="e.message_link" target="_blank"
                                    class="text-gray-500 hover:text-gray-900 underline underline-offset-2 ml-1 whitespace-nowrap">
                                    Xabarni ko'rish
                                 </a>
                                 <button v-if="e.parent_request_id && !e.reopen_dismissed"
                                    @click="dismissReopen(e.id)"
                                    class="text-gray-400 hover:text-gray-700 underline underline-offset-2 ml-2 whitespace-nowrap"
                                    title="Bu aslida takror emas — noto'g'ri aniqlangan qayta so'rovni bekor qiladi (asl murojaat yana «bajarildi» bo'ladi)">
                                    Takror emas
                                 </button>
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <!-- The jurnal is built from the last `reqLimit` murojaat, so say so
                       rather than let a truncated list read as the whole period. -->
                  <div v-if="requestsTruncated" class="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-gray-500">
                     <span>
                        Faqat oxirgi {{ requests.length }} ta murojaat ko'rsatilmoqda —
                        yuqoridagi jadval esa butun davrni sanaydi.
                     </span>
                     <button v-if="reqLimit < MAX_REQ_LIMIT" @click="loadMoreRequests" class="btn-ghost">
                        Ko'proq yuklash
                     </button>
                  </div>
               </div>
            </section>

            <!-- tuning — ADMIN ONLY: these fields decide who turns red, and the toggle
                 can stop the recording entirely, so the nazoratchi does not get them
                 (the API enforces it too; this only avoids showing a button that 403s) -->
            <section v-if="isAdmin" class="card p-5 animate-fade-up">
               <h3 class="text-base font-semibold text-gray-900 mb-1">Sozlamalar</h3>
               <p class="text-[13px] text-gray-500 mb-5">
                  Bir xil so'rov qayta kelganda: xodim uchun oyna tugagach — yangi so'rov;
                  ellikboshi uchun 0 = hech qachon tugamaydi (doim hal qilinmagan deb sanaladi).
               </p>
               <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label class="lbl">Xodim oynasi (soat)</label>
                     <input v-model.number="form.staff_repeat_window_hours" type="number" min="0" class="inp" />
                  </div>
                  <div>
                     <label class="lbl">Ellikboshi oynasi (soat, 0 = cheksiz)</label>
                     <input v-model.number="form.ellikboshi_repeat_window_hours" type="number" min="0" class="inp" />
                  </div>
                  <div>
                     <label class="lbl">IT guruh ID</label>
                     <input v-model.number="form.it_group_id" type="number" class="inp" />
                  </div>
                  <div>
                     <label class="lbl">IT mavzu (topic) ID</label>
                     <input v-model.number="form.it_topic_id" type="number" class="inp" />
                  </div>
               </div>
               <div class="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                  <button @click="form.is_enabled = !form.is_enabled"
                     class="flex items-center gap-2 text-sm font-medium transition-colors"
                     :class="form.is_enabled ? 'text-gray-900' : 'text-gray-400'">
                     <font-awesome-icon :icon="form.is_enabled ? 'toggle-on' : 'toggle-off'" class="w-5 h-5" />
                     {{ form.is_enabled ? 'Nazorat yoqilgan' : 'Nazorat o\'chirilgan' }}
                  </button>
                  <div class="flex items-center gap-3">
                     <span v-if="savedMsg" class="text-[13px] text-gray-500">{{ savedMsg }}</span>
                     <button @click="save" :disabled="saving" class="btn-primary">
                        {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
                     </button>
                  </div>
               </div>
            </section>
         </template>
      </div>
   </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
   Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
   Tooltip, Legend, Filler, type ChartOptions, type Plugin,
} from 'chart.js'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'
import { useAuthStore } from '../../../stores/auth'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface Report {
   // per NEED
   requests: number; unassigned: number
   // per RECIPIENT ROW (one per worker the need was DM'd to)
   dms: number; delivered: number; undelivered: number
   accepted: number; never_accepted: number; completed: number; re_requests: number
   reopened: number; avg_response_seconds: number | null
   flagged: number; bot_mistakes: number; flags_neutral: number; flags_pending: number
   error_kinds: Record<string, number>
}
interface Worker {
   telegram_id: number; username: string | null; name: string | null; role: string
   dms: number; undelivered: number; accepted: number; never_accepted: number
   completed: number; re_requests: number; reopened: number; released: number
   flagged: number; flags_confirmed: number; flags_neutral: number
   avg_response_seconds: number | null
   // Where this person actually worked, from the needs themselves — "7 murojaat" reads
   // very differently across nine groups than inside one.
   cities: string[]; group_count: number
   // Their JOB from the staff table (ishchi_guruh / doctor / airport), NOT the
   // control-system role. A doctor only ever receives health needs.
   staff_role: string | null
}
interface GroupOption { chat_id: number; title: string | null; cities: string[] }
// `location` is null for an ellikboshi — a leader belongs to a GROUP, not a city, and
// `group` is that group's title (null for crew). Which group still assigns them is the
// one fact that makes the warning actionable: the fix is on the Guruhlar page.
interface StaffReady {
   role: string; location: string | null; username: string | null; name: string | null
   group?: string | null
   // false = this group still names a leader who is no longer in the Ellikboshilar
   // pool. Deleting them there does not clear the group's assignment, so the bot
   // would still be DMing a removed person.
   in_pool?: boolean
}

/** The four outcomes, defined ONCE — the split bar, the legend, the chart, the table
 *  headers and the per-row bars all read from here, so a colour or a wording can never
 *  drift between them.
 *
 *  Palette: validated with the dataviz skill's checker against a white surface —
 *  lightness band, chroma floor, CVD separation (worst adjacent pair ΔE 13.0, target
 *  ≥8) and the normal-vision floor (19.8, floor 15) all PASS. Amber sits below 3:1
 *  contrast, so it is never the only carrier of meaning: every use is paired with a
 *  visible label, and table VALUES are ink with the colour reduced to a header dot.
 *  Hues are the ones already in the workers' DM cards and in the owner's head —
 *  only the green was deepened (#10b981 -> #059669), which is what lifted the worst
 *  CVD pair from 8.9 to 13.0. */
const BUCKETS = [
   {
      key: 'completed', label: 'Bajarildi', short: 'Bajarildi', color: '#059669',
      hint: "qabul qildi, ziyoratchi qayta so'ramadi",
   },
   {
      key: 're_requests', label: "Takroriy so'rov", short: 'Takroriy', color: '#f59e0b',
      hint: "ziyoratchi ilgari ham so'ragan edi — shu odam ikkinchi so'rovni qabul qildi",
   },
   {
      key: 'reopened', label: 'Bajarilmagan', short: 'Bajarilmagan', color: '#ef4444',
      hint: "qabul qilgan, LEKIN ziyoratchi qayta so'radi — aslida hal qilinmagan",
   },
   {
      key: 'never_accepted', label: 'Javobsiz', short: 'Javobsiz', color: '#3b82f6',
      hint: 'kartochka yetib bordi, lekin umuman qabul qilinmadi',
   },
] as const

const CITY_LABELS: Record<string, string> = { makka: 'Makka', madina: 'Madina' }
function cityLabel(c: string | null): string {
   return c ? (CITY_LABELS[c] || c) : ''
}

// Xatolik taxonomy labels — codes mirror server IT_ERROR_KINDS (bot/services/control.py).
const KIND_LABELS: Record<string, string> = {
   wp: "Noto'g'ri shaxs",
   nr: "So'rov emas",
   wl: "Noto'g'ri shahar/xona",
   wa: "Javob noto'g'ri",
   unlabeled: 'Turi belgilanmagan',
}

const PERIODS = [
   { value: 'day', label: 'Kunlik' },
   { value: 'week', label: 'Haftalik' },
   { value: 'month', label: 'Oylik' },
]

const period = ref('day')
const loading = ref(false)
const saving = ref(false)
const savedMsg = ref('')
const showRequests = ref(true)
const report = ref<Report | null>(null)
const workers = ref<Worker[]>([])
const timeseries = ref<{ period: string; completed: number; re_requests: number; reopened: number; never_accepted: number }[]>([])
const filterRole = ref('')          // '' = all, else 'staff' | 'ellikboshi'
const filterName = ref('')          // matches name OR username (case-insensitive)
// Slice filters — sent to the SERVER, so every number on the page moves together.
const filterGroup = ref('')         // '' = all groups, else the chat_id as a string
const filterCity = ref('')          // '' = both, else 'makka' | 'madina'
const groupOptions = ref<GroupOption[]>([])
const requests = ref<any[]>([])
const staffReadiness = ref<StaffReady[]>([])
const loadError = ref(false)

// Which population this LOGIN may see: 'staff' | 'ellikboshi' | 'all'. Comes from the
// API (the token decides it), never from a dropdown — a scoped controller cannot widen
// their own view, and the page must not label itself as something it is not.
const scope = ref<'staff' | 'ellikboshi' | 'all'>('all')
const isStaffScope = computed(() => scope.value === 'staff')
const isLeaderScope = computed(() => scope.value === 'ellikboshi')

/** "Xodim" / "Ellikboshi" — the word for one person in this account's population. */
const personWord = computed(() => (isLeaderScope.value ? 'Ellikboshi' : 'Xodim'))
const personWordLower = computed(() => personWord.value.toLowerCase())

const scopeTitle = computed(() =>
   isStaffScope.value ? 'Nazorat — Xodimlar'
      : isLeaderScope.value ? 'Nazorat — Ellikboshilar'
         : 'Nazorat',
)
const scopeSubtitle = computed(() =>
   isStaffScope.value
      ? "Ishchi guruh murojaatlarni qanday bajarayotgani — dalillar bilan"
      : isLeaderScope.value
         ? "Ellikboshilar murojaatlarni qanday bajarayotgani — dalillar bilan"
         : "Xodimlar va ellikboshilar murojaatlarni qanday bajarayotgani — dalillar bilan",
)

// Drill-down paging. The per-staff jurnal is built from these rows, so a silent cap
// would make a truncated log look like the worker's whole period.
const REQ_PAGE = 200
const MAX_REQ_LIMIT = 500          // the API's own ceiling
const reqLimit = ref(REQ_PAGE)
const requestsTruncated = computed(() => requests.value.length >= reqLimit.value)

// Only the admin may tune the control system (the API enforces it; this hides the form).
const auth = useAuthStore()
const isAdmin = computed(() => !auth.role || auth.role === 'admin')

const form = ref({
   staff_repeat_window_hours: 6,
   ellikboshi_repeat_window_hours: 0,
   it_group_id: null as number | null,
   it_topic_id: null as number | null,
   is_enabled: true,
})

/** Seconds -> a short Uzbek duration ("2 soat 5 daq"). null when never measured. */
function dur(s: number | null): string {
   if (s === null || s === undefined) return '—'
   if (s < 60) return `${Math.round(s)} soniya`
   const m = Math.floor(s / 60)
   if (m < 60) return `${m} daq`
   const h = Math.floor(m / 60)
   const rem = m % 60
   return rem ? `${h} soat ${rem} daq` : `${h} soat`
}

function fmtTime(iso: string | null): string {
   if (!iso) return '—'
   return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

/** ── THE LEAD ──────────────────────────────────────────────────────────────
 *  Everything on this page that is a PROBLEM, biggest first, and nothing else.
 *  The owner reads this panel in a meeting to find the exceptions, so the
 *  exceptions get the top of the page and the size; the rest is context below.
 *  A clean period renders the calm state instead, never an empty red box. */
const problems = computed(() => {
   const r = report.value
   if (!r) return [] as any[]
   const out: any[] = []
   if (r.never_accepted) out.push({
      key: 'never_accepted', value: r.never_accepted, label: 'Javobsiz qolgan',
      color: BUCKETS[3].color,
      hint: `Kartochka yetib bordi, lekin ${personWordLower.value} umuman qabul qilmadi.`,
   })
   if (r.reopened) out.push({
      key: 'reopened', value: r.reopened, label: 'Bajarilmagan',
      color: BUCKETS[2].color,
      hint: "Qabul qilingan edi, lekin ziyoratchi qayta so'radi — aslida hal bo'lmagan.",
   })
   // «Hech kimga yetmagan» (report.unassigned) is deliberately NOT shown. Owner rule,
   // stated three times: this panel is for the CREW and the ELLIKBOSHI, and a need that
   // reached nobody has no recipient — so there is no person it is a statistic about.
   // The API still returns the number; nothing on this page reads it. Unreachable
   // people surface below as «DM yuborib bo'lmaydi», which IS about them.
   if (r.undelivered) out.push({
      key: 'undelivered', value: r.undelivered, label: 'Yetib bormagan',
      color: '#a16207',
      hint: 'Ular botni «Start» qilmagan — javob bermagani o\'zlarining aybi emas '
         + 'va hisobotda ularga yozilmaydi.',
      people: undeliveredPeople.value,
   })
   if (staffReadiness.value.length) out.push({
      key: 'readiness', value: staffReadiness.value.length, label: 'DM yuborib bo\'lmaydi',
      color: '#a16207',
      hint: 'Botni «Start» qilmagan — murojaatlar ularga umuman bormaydi. Har biri botga '
         + '/start yozishi kerak (yoki Xodimlar sahifasida Telegram ID raqamini kiriting). '
         + 'Ellikboshi qaysi guruhga biriktirilgani qavs ichida — endi kerak bo\'lmasa, '
         + 'Guruhlar sahifasidan o\'zgartiring.',
      // Say WHERE each one is still assigned. A bare @username left the office asking
      // why somebody they had already removed was on the page — the answer is always
      // "a group still names them".
      people: staffReadiness.value.map((s) =>
         (s.username || s.name || '—')
         + (s.location ? ` · ${cityLabel(s.location)}` : '')
         + (s.group ? ` · ${s.group}` : '')
         + (s.role === 'ellikboshi' && s.in_pool === false
            ? " · ro'yxatdan o'chirilgan" : '')),
   })
   if (r.flags_neutral) out.push({
      key: 'flags_neutral', value: r.flags_neutral, label: 'Asossiz «Xatolik»',
      color: '#a16207',
      hint: 'Xodim «bot xatosi» dedi, IT esa neytral deb topdi — da\'vo tasdiqlanmadi.',
   })
   return out
})

/** The four outcome counts as a proportional bar: how the work ENDED UP, which is a
 *  composition — four separate cards made the reader do the division in their head. */
const bucketRows = computed(() => {
   const r = report.value
   const total = bucketTotal.value
   return BUCKETS.map((b) => {
      const value = r ? ((r as any)[b.key] as number) : 0
      return {
         ...b, value,
         pct: total ? (value / total) * 100 : 0,
         pctLabel: total ? `${Math.round((value / total) * 100)}%` : '',
      }
   })
})
const bucketTotal = computed(() => {
   const r = report.value
   if (!r) return 0
   return BUCKETS.reduce((sum, b) => sum + ((r as any)[b.key] as number || 0), 0)
})
/** Only the non-zero slices get drawn — a 0%-wide segment is still a 2px gap. */
const bucketSegments = computed(() => bucketRows.value.filter((b) => b.value > 0))

/** Context, not verdict: period-level facts that belong nowhere near the colour
 *  buckets, because they count NEEDS while the buckets count recipient rows. */
const contextStats = computed(() => {
   const r = report.value
   if (!r) return []
   return [
      {
         label: 'Murojaatlar', value: r.requests,
         hint: `${r.delivered} ta ${personWordLower.value} kartochkasi yetib bordi`,
      },
      { label: "O'rtacha javob vaqti", value: dur(r.avg_response_seconds), hint: 'DM → Qabul' },
      {
         label: 'Bot xatosi (tasdiqlangan)', value: r.bot_mistakes,
         hint: r.flags_pending ? `${r.flags_pending} ta kutilmoqda` : 'IT tasdiqlagan',
      },
   ]
})

// ── Trend ────────────────────────────────────────────────────────────────────
/** X-axis labels: hour for the day period, else day/month. Rendered in SAUDI time
 *  (Asia/Riyadh) because that is how the server groups them — the crew and the pilgrims
 *  are there, so an evening in Makka must not straddle two labels for a viewer in
 *  Tashkent. */
const SAUDI_TZ = 'Asia/Riyadh'
const trendLabels = computed(() =>
   timeseries.value.map((t) => {
      const d = new Date(t.period)
      return period.value === 'day'
         ? d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit', timeZone: SAUDI_TZ })
         : d.toLocaleDateString('uz', { day: '2-digit', month: '2-digit', timeZone: SAUDI_TZ })
   }),
)

const trendData = computed(() => ({
   labels: trendLabels.value,
   datasets: BUCKETS.map((b) => ({
      label: b.label,
      data: timeseries.value.map((t) => (t as any)[b.key] ?? 0),
      borderColor: b.color,
      backgroundColor: b.color,
      pointBackgroundColor: b.color,
      pointBorderWidth: 0,
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2,
      tension: 0.4,
      fill: false,
      borderCapStyle: 'round' as CanvasLineCap,
      borderJoinStyle: 'round' as CanvasLineJoin,
   })),
}))

const trendOptions: ChartOptions<'line'> = {
   responsive: true,
   maintainAspectRatio: false,
   layout: { padding: { top: 8, right: 8, left: 2 } },
   interaction: { mode: 'index', intersect: false, axis: 'x' },
   plugins: {
      // Our own legend sits in the section header — one legend for the bar and the
      // chart, so they can never disagree.
      legend: { display: false },
      tooltip: {
         backgroundColor: 'rgba(17, 24, 39, 0.96)',
         padding: 12, cornerRadius: 10,
         titleColor: '#9ca3af', titleFont: { size: 11, weight: 600 },
         bodyColor: '#f9fafb', bodyFont: { size: 12, weight: 500 },
         bodySpacing: 6, boxPadding: 6, usePointStyle: true,
         caretSize: 0, caretPadding: 12, displayColors: true,
         borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1,
      },
   },
   scales: {
      x: {
         grid: { display: false },
         border: { display: false },
         ticks: {
            color: '#9ca3af', font: { size: 12 }, padding: 10,
            maxRotation: 0, autoSkipPadding: 24,
         },
      },
      y: {
         beginAtZero: true, grace: '30%',
         border: { display: false },
         grid: { color: 'rgba(17, 24, 39, 0.04)' },
         ticks: { color: '#9ca3af', font: { size: 12 }, padding: 12, stepSize: 1, precision: 0 },
      },
   },
}

// A soft dashed vertical guide at the hovered point — pairs with the index tooltip so all
// four series read at the same moment. Drawn under the points, over the lines.
const crosshairPlugin: Plugin<'line'> = {
   id: 'nazoratCrosshair',
   afterDatasetsDraw(chart) {
      const first = chart.getActiveElements()[0]
      if (!first) return
      const x = (first.element as PointElement).x
      const { ctx, chartArea } = chart
      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([3, 4])
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.18)'
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
      ctx.restore()
   },
}

// ── People ───────────────────────────────────────────────────────────────────
/** Display label for a worker/recipient — the DASHBOARD name if entered, else @username. */
function personLabel(p: { name?: string | null; username?: string | null; telegram_id: number }): string {
   return p.name || p.username || ('ID ' + p.telegram_id)
}

/** Distinct worker labels for the "filter by name" dropdown. */
const workerNameOptions = computed(() =>
   [...new Set(workers.value.map(personLabel))].sort((a, b) => a.localeCompare(b)),
)

/** Workers filtered by the lavozim (role) dropdown and the chosen name. */
const filteredWorkers = computed(() =>
   workers.value.filter((w) => {
      if (filterRole.value && w.role !== filterRole.value) return false
      if (filterName.value && personLabel(w) !== filterName.value) return false
      return true
   }),
)

// staff.role -> a job an ordinary reader recognises. The job is WHY two people's
// numbers differ: the doctor is deliberately kept out of the whole-crew tag and only
// receives health needs, the airport contact only airport ones.
const JOB_LABELS: Record<string, string> = {
   ishchi_guruh: 'Ishchi guruh',
   doctor: 'Shifokor',
   airport: 'Aeroport',
}
function jobLabel(w: Worker): string {
   if (w.role === 'ellikboshi') return 'Ellikboshi'
   const j = w.staff_role
   return j ? (JOB_LABELS[j] || j) : 'Xodim'
}

/** Cards that left this person's accountability: never arrived, a colleague claimed it
 *  first, or they marked it a bot error. They belong to none of the four colour buckets.
 *  Owner removed the numeric column for these (2026-07-28) — the count is now carried
 *  only by the gray tail of the row's Natija bar and by its tooltip, which names the
 *  three causes in plain words instead of one abstract heading. */
function uncounted(w: Worker): number {
   return (w.undelivered || 0) + (w.released || 0) + (w.flagged || 0)
}

/** One row's composition as a mini bar — lets a long sheet be scanned for "who is
 *  mostly red" without reading every number. The cards that left their accountability
 *  ride along in gray, so the bar always spans the row's whole Murojaat count and a
 *  short coloured bar is visibly "most of this was never theirs". */
function rowSegments(w: Worker) {
   const total = w.dms || 1
   const segs: { key: string; color: string; value: number }[] = BUCKETS
      .map((b) => ({ key: b.key as string, color: b.color as string, value: (w as any)[b.key] as number }))
   segs.push({ key: 'uncounted', color: '#e5e7eb', value: uncounted(w) })
   return segs.filter((s) => s.value > 0).map((s) => ({ ...s, pct: (s.value / total) * 100 }))
}
function rowSplitHint(w: Worker): string {
   const parts = BUCKETS.map((b) => `${b.label}: ${(w as any)[b.key]}`)
   // Spelled out rather than summed under a heading: "boshqa xodim oldi" is a fact
   // anyone can act on, "hisobga olinmagan" was a word people had to ask about.
   if (w.released) parts.push(`Boshqa xodim oldi: ${w.released}`)
   if (w.undelivered) parts.push(`Yetib bormadi: ${w.undelivered}`)
   if (w.flagged) parts.push(`«Xatolik» deb belgilangan: ${w.flagged}`)
   return parts.join(' · ')
}

/** Who the bot actually FAILED to reach this period. `staff-readiness` only predicts
 *  this (and misses anyone whose staff row carries a telegram_id they never activated
 *  by pressing Start); an undelivered card is the proof it really happened. */
const undeliveredPeople = computed(() =>
   workers.value.filter((w) => w.undelivered > 0)
      .map((w) => `${personLabel(w)} (${w.undelivered})`),
)

/** The Guruh dropdown. Two groups CAN carry the same Telegram title, and two identical
 *  options would leave the reader unable to tell which slice they picked — so a repeated
 *  label falls back to the chat id, which is always unique. */
const groupChoices = computed(() => {
   const seen = new Map<string, number>()
   for (const g of groupOptions.value) {
      const l = groupLabel(g)
      seen.set(l, (seen.get(l) || 0) + 1)
   }
   return groupOptions.value.map((g) => {
      const l = groupLabel(g)
      return { chat_id: g.chat_id, label: (seen.get(l) || 0) > 1 ? `${l} · ${g.chat_id}` : l }
   })
})

/** Group name for the filter dropdown; falls back to the raw id when a group has no
 *  title saved (never show an empty option — an unnamed group is still a real one). */
function groupLabel(g: { chat_id: number; title: string | null; cities?: string[] }): string {
   const name = g.title || `Guruh ${g.chat_id}`
   const cities = (g.cities || []).map(cityLabel).filter(Boolean)
   return cities.length ? `${name} · ${cities.join(', ')}` : name
}

/** "Makka · 3 guruh" — where a worker's needs came from this period. */
function whereLabel(w: Worker): string {
   const cities = (w.cities || []).map(cityLabel).filter(Boolean).join(', ')
   const groups = w.group_count ? `${w.group_count} guruh` : ''
   return [cities, groups].filter(Boolean).join(' · ') || '—'
}

/** Human duration between two timestamps; if `toIso` is null, measures up to NOW (still open). */
function durBetween(fromIso: string | null, toIso: string | null): string {
   if (!fromIso) return '—'
   const to = toIso ? new Date(toIso).getTime() : Date.now()
   return dur(Math.max(0, Math.round((to - new Date(fromIso).getTime()) / 1000)))
}

/** One request turned into a plain Uzbek sentence an ordinary reader understands, plus
 *  the colour of its outcome (used for the text AND the entry's left rail). Accept is
 *  terminal (no solve step): once a worker takes a need it counts as done (Bajarildi)
 *  UNTIL the pilgrim asks again, which turns it Bajarilmagan. Covers every state:
 *  not-delivered, Xatolik, taken-by-another, Javobsiz, and the three accepted ones. */
function entrySummary(e: any): { text: string; rail: string; ink: string } {
   const sent = fmtTime(e.dm_sent_at)
   // "Xodim" / "Ellikboshi" — the same sentence, addressed to whoever this account
   // actually watches, so a leaders' controller never reads about "xodimlar".
   const who = personWord.value
   // TWO colours per outcome, never one: `rail` is the MARK (the 2px bar, which only
   // has to be seen) and `ink` is the TEXT (which has to be READ). The bucket amber is
   // 2.15:1 on this surface — legible as a bar, not as a sentence — so text uses a
   // darker step of the same hue, or plain ink where the rail already carries it.
   const MUTED = '#9ca3af'
   const INK = '#4b5563'
   if (!e.delivered)
      return { text: `${who}ga yetib bormadi.`, rail: MUTED, ink: MUTED }
   if (e.flagged_at)
      return {
         text: `${sent} da yuborildi. ${who} «Xatolik» deb belgiladi`
            + (e.it_verdict ? ` (IT: ${e.it_verdict}).` : " (IT hali ko'rmagan)."),
         rail: '#6366f1', ink: '#4338ca',
      }
   if (e.released_at) {
      const c = e.claimed_by
      const verb = c && c.flagged ? '«Xatolik» deb belgiladi' : 'qabul qildi'
      return {
         text: `${sent} da yuborildi. Boshqa ${personWordLower.value} ${verb}${c ? ` (${c.name})` : ''}.`,
         rail: MUTED, ink: MUTED,
      }
   }
   if (!e.accepted_at)   // delivered but never taken
      return {
         text: `${sent} da yuborildi. ${who} hali qabul qilmadi (javobsiz: ${durBetween(e.dm_sent_at, null)}).`,
         rail: BUCKETS[3].color, ink: '#1d4ed8',
      }
   const acc = fmtTime(e.accepted_at)
   const wait = durBetween(e.dm_sent_at, e.accepted_at)
   if (e.reopened_count > 0)   // accepted, but the pilgrim came back -> false completion
      return {
         text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}), LEKIN ziyoratchi qayta so'radi — bajarilmagan.`,
         rail: BUCKETS[2].color, ink: '#b91c1c',
      }
   if (e.parent_request_id && !e.reopen_dismissed)   // accepted follow-up (already a repeat)
      return {
         text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}) — takroriy so'rov, bajarildi.`,
         rail: BUCKETS[1].color, ink: INK,
      }
   return {   // clean single-pass completion
      text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}) — bajarildi.`,
      rail: BUCKETS[0].color, ink: INK,
   }
}

/** Per-STAFF activity log: every request each worker was DM'd about, newest first, each
 *  turned into a plain sentence. Honours the lavozim + name filters; busiest worker first. */
const staffLogs = computed(() => {
   const nameById = new Map(workers.value.map((w) => [w.telegram_id, w.name]))
   const map = new Map<number, any>()
   for (const r of requests.value) {
      for (const rec of r.recipients) {
         let s = map.get(rec.telegram_id)
         if (!s) {
            s = {
               telegram_id: rec.telegram_id, username: rec.username,
               name: nameById.get(rec.telegram_id) ?? null, role: rec.role, entries: [] as any[],
            }
            map.set(rec.telegram_id, s)
         }
         // For a released row, name the colleague who actually took (or flagged) the need.
         const sib = r.recipients.find((o: any) =>
            o.telegram_id !== rec.telegram_id && (o.accepted_at || o.flagged_at))
         s.entries.push({
            id: r.id, text: r.text, parent_request_id: r.parent_request_id,
            reopen_dismissed: r.reopen_dismissed, message_link: r.message_link,
            // Context the reader needs to make sense of the text at all.
            group_label: r.group_title || `Guruh ${r.chat_id}`,
            city: r.location, room_no: r.room_no, pilgrim_username: r.pilgrim_username,
            created_at: r.created_at, delivered: rec.delivered, it_verdict: rec.it_verdict,
            dm_sent_at: rec.dm_sent_at, accepted_at: rec.accepted_at,
            flagged_at: rec.flagged_at, released_at: rec.released_at, reopened_count: rec.reopened_count,
            claimed_by: sib
               ? { name: nameById.get(sib.telegram_id) || sib.username || ('ID ' + sib.telegram_id),
                   flagged: !sib.accepted_at && !!sib.flagged_at }
               : null,
         })
      }
   }
   return [...map.values()]
      .map((s) => {
         s.entries.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         s.entries = s.entries.map((e: any) => ({ ...e, sum: entrySummary(e) }))
         return s
      })
      .filter((s) => !filterRole.value || s.role === filterRole.value)
      .filter((s) => !filterName.value || personLabel(s) === filterName.value)
      .sort((a, b) => b.entries.length - a.entries.length)
})

/** Accordion: which staff rows are expanded to show their log. */
const expandedStaff = ref<Set<number>>(new Set())
function toggleStaff(id: number) {
   const s = new Set(expandedStaff.value)
   s.has(id) ? s.delete(id) : s.add(id)
   expandedStaff.value = s
}

function setPeriod(p: string) {
   period.value = p
   load()
}

/** The chosen slice as a query string — appended to every read so the whole page always
 *  describes the same group / city. */
const sliceQuery = computed(() => {
   const parts = [`period=${period.value}`]
   if (filterGroup.value) parts.push(`chat_id=${encodeURIComponent(filterGroup.value)}`)
   if (filterCity.value) parts.push(`city=${encodeURIComponent(filterCity.value)}`)
   return parts.join('&')
})

function clearSlice() {
   filterGroup.value = ''
   filterCity.value = ''
   load()
}

async function load() {
   loading.value = true
   loadError.value = false
   try {
      const q = sliceQuery.value
      const [rep, wrk, ts, reqs, sr, st, sc, grp] = await Promise.all([
         api.get(`/control/report?${q}`),
         api.get(`/control/workers?${q}`),
         api.get(`/control/timeseries?${q}`),
         api.get(`/control/requests?${q}&limit=${reqLimit.value}`),
         api.get('/control/staff-readiness'),
         api.get('/control/settings'),
         api.get('/control/scope'),
         // Deliberately NOT sliced: the group list must keep offering the other groups,
         // otherwise picking one would leave you unable to pick a different one.
         api.get(`/control/groups?period=${period.value}`),
      ])
      report.value = rep.data
      workers.value = wrk.data
      timeseries.value = ts.data
      requests.value = reqs.data
      staffReadiness.value = sr.data
      scope.value = sc.data?.scope || 'all'
      groupOptions.value = grp.data
      form.value = {
         staff_repeat_window_hours: st.data.staff_repeat_window_hours,
         ellikboshi_repeat_window_hours: st.data.ellikboshi_repeat_window_hours,
         it_group_id: st.data.it_group_id,
         it_topic_id: st.data.it_topic_id,
         is_enabled: st.data.is_enabled,
      }
   } catch {
      // Surfaced, not swallowed: an empty page that means "the request failed" reads
      // exactly like one that means "nothing happened this period" — and on an evidence
      // panel those two are opposites.
      loadError.value = true
      report.value = null
      workers.value = []
      timeseries.value = []
      requests.value = []
      staffReadiness.value = []
      groupOptions.value = []
   } finally {
      loading.value = false
   }
}

/** The drill-down is capped; pull the next page when the office needs more of it. */
function loadMoreRequests() {
   reqLimit.value = Math.min(MAX_REQ_LIMIT, reqLimit.value + REQ_PAGE)
   load()
}

/** The confirmed-mistake breakdown as [{label, count}], biggest first. */
const errorKinds = computed(() => {
   const e = report.value?.error_kinds
   if (!e) return [] as { label: string; count: number }[]
   return Object.entries(e)
      .map(([code, count]) => ({ label: KIND_LABELS[code] || code, count }))
      .sort((a, b) => b.count - a.count)
})

/** Dismiss a falsely auto-detected repeat, then refresh the evidence. */
async function dismissReopen(id: number) {
   try {
      await api.post(`/control/requests/${id}/dismiss-reopen`)
      await load()
   } catch { /* ignore — the row just stays as-is */ }
}

async function save() {
   saving.value = true
   savedMsg.value = ''
   try {
      await api.put('/control/settings', form.value)
      savedMsg.value = 'Saqlandi'
      setTimeout(() => (savedMsg.value = ''), 2500)
   } catch {
      savedMsg.value = 'Saqlashda xatolik'
   } finally {
      saving.value = false
   }
}

onMounted(load)
</script>

<style scoped>
/* One surface definition instead of repeating the same six utilities on every box —
   softer than the old hard 1px gray border: a hairline ring plus a barely-there
   shadow, which is what stops a page of white rectangles reading as a 2010 table. */
.card {
   background: #fff;
   border-radius: 1rem;
   box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
   outline: 1px solid #e9eaec;
   outline-offset: -1px;
}

.filter-select {
   font-size: 13px;
   color: #374151;
   background: #fff;
   border: 1px solid #e5e7eb;
   border-radius: 0.625rem;
   padding: 0.375rem 0.625rem;
   transition: border-color 0.15s;
}
.filter-select:hover { border-color: #d1d5db; }
.filter-select:focus { outline: none; border-color: #9ca3af; }

.badge {
   font-size: 11px;
   line-height: 1.2;
   padding: 0.125rem 0.4rem;
   border-radius: 0.375rem;
   font-weight: 500;
}
.badge-amber { background: #fef3c7; color: #92400e; }
.badge-indigo { background: #e0e7ff; color: #3730a3; }

.chip {
   font-size: 12px;
   padding: 0.125rem 0.5rem;
   border-radius: 0.5rem;
   background: #f3f4f6;
   color: #374151;
}

.btn-primary {
   padding: 0.5rem 1.125rem;
   border-radius: 0.75rem;
   background: #111827;
   color: #fff;
   font-size: 14px;
   font-weight: 500;
   transition: background 0.15s;
}
.btn-primary:hover { background: #374151; }
.btn-primary:disabled { opacity: 0.5; }

.btn-ghost {
   padding: 0.25rem 0.75rem;
   border: 1px solid #e5e7eb;
   border-radius: 0.5rem;
   font-weight: 500;
   color: #374151;
}
.btn-ghost:hover { background: #f9fafb; }

.lbl {
   display: block;
   font-size: 12px;
   font-weight: 500;
   color: #6b7280;
   margin-bottom: 0.375rem;
}
.inp {
   width: 100%;
   background: #f9fafb;
   border: 1px solid #e5e7eb;
   border-radius: 0.75rem;
   padding: 0.625rem 0.875rem;
   font-size: 14px;
}
.inp:focus { outline: none; border-color: #9ca3af; background: #fff; }
</style>

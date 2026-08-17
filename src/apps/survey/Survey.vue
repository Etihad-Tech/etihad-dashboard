<template>
   <div class="sn-app">
      <!-- ETIHAD green/gold — deliberately NOT the dashboard chrome: the owner wants
           this to read as its own tool, for its own login. -->
      <header class="sn-top">
         <div class="sn-brand">ETIHAD · <span>Sifat nazorati</span></div>
         <div class="sn-sub">Qaytgan ziyoratchilar so'rovnomasi</div>
         <div class="sn-topright">
            <span v-if="doneToday">{{ doneToday }} ta saqlangan</span>
            <button class="sn-btn sn-ghost" @click="fileEl?.click()">CSV import</button>
            <input ref="fileEl" type="file" accept=".csv,.txt" class="hidden" @change="importCsv" />
            <button class="sn-btn sn-ghost" @click="logout">Chiqish</button>
         </div>
      </header>

      <div class="sn-wrap">
         <!-- ─────────── QUEUE ─────────── -->
         <aside class="sn-panel sn-sticky">
            <div class="sn-lbl">Navbat · Bitrix24 (ism + telefon)</div>
            <input v-model="search" class="sn-input" placeholder="Qidirish: ism yoki telefon" />
            <select v-model="statusFilter" class="sn-input">
               <option value="">Barcha holatlar</option>
               <option v-for="(l, k) in CALL_LABELS" :key="k" :value="k">{{ l }}</option>
            </select>
            <div class="sn-queue">
               <button v-for="p in filteredQueue" :key="p.id" class="sn-qitem"
                  :class="{ on: current && current.id === p.id }" @click="open(p)">
                  <span class="sn-dot" :class="p.survey_status === 'saved' ? 'done' : ''"></span>
                  <span class="sn-qmain">
                     <b>{{ p.full_name }}</b>
                     <small>{{ p.group_title || 'guruh tanlanmagan' }}</small>
                  </span>
                  <small class="sn-qst">{{ CALL_LABELS[p.call_status] || p.call_status }}</small>
               </button>
               <p v-if="!filteredQueue.length" class="sn-note">Navbat bo'sh — CSV import qiling.</p>
            </div>
            <p class="sn-note">Bitrixdan faqat ism va telefon olinadi. Guruh — dashboarddagi
               ro'yxatdan, sanalar va ellikboshi guruhdan keladi.</p>
         </aside>

         <!-- ─────────── FORM ─────────── -->
         <main v-if="current" class="sn-main">
            <div class="sn-panel sn-subject">
               <h1>{{ current.full_name }}</h1>
               <div class="sn-facts">
                  <span class="sn-fact"><b>Guruh:</b>
                     <!-- The one pick everything cascades from. Dashboard groups only,
                          recently returned first; Bitrix is never asked about trips. -->
                     <select v-model="pickedGroup" class="sn-inline" :disabled="isSaved"
                        @change="assignGroup">
                        <option :value="null">— tanlang —</option>
                        <!-- The full trip range in the label: two groups can share a
                             name, but never a name AND its dates — the specialist
                             picks the TRIP, not just the title. -->
                        <option v-for="g in pickableGroups" :key="g.chat_id" :value="g.chat_id">
                           {{ g.title }}{{ g.trip_start_date
                              ? ` · ${g.trip_start_date} — ${g.trip_end_date || '?'}` : '' }}
                        </option>
                     </select>
                     <!-- Narrowed to the day Bitrix says they left: three hundred
                          groups is not a picker, it is a haystack. The hint only
                          FILTERS — every date on screen still comes from the group
                          itself — and it can always be switched off, because a wrong
                          hint must never make the right group unreachable. -->
                     <button v-if="current.depart_hint && !showAllGroups" type="button"
                        class="sn-linkbtn" @click="showAllGroups = true">
                        ({{ dmy(current.depart_hint) }} — {{ pickableGroups.length }} ta;
                        hammasini ko'rsatish)
                     </button>
                     <button v-else-if="current.depart_hint" type="button"
                        class="sn-linkbtn" @click="showAllGroups = false">
                        (hammasi — {{ dmy(current.depart_hint) }} kunini ko'rsatish)
                     </button>
                  </span>
                  <!-- The §6 call belongs 1–3 days AFTER the flight home. The August
                       export carried 59 people who had not left yet, and calling one
                       of them asks about a trip that has not happened. -->
                  <span v-if="notReturnedYet" class="sn-fact sn-warn">
                     <b>Diqqat:</b> bu safar hali tugamagan ({{ groupInfo?.trip_end_date }}) —
                     so'rovnoma qaytgandan keyin o'tkaziladi.
                  </span>
                  <!-- Both names when the group was led by different people in the two
                       cities: the pilgrim answers about the whole trip, and the
                       specialist has to know who they are actually asking about. The
                       ball is keyed to the Makka leader (server-side, save_survey), so
                       that one is marked — a screen that showed two names without
                       saying which is scored would be worse than showing one. -->
                  <span v-if="groupInfo && !splitGroup" class="sn-fact"><b>Ellikboshi:</b> {{ groupInfo.ellikboshi_username }}</span>
                  <span v-else-if="groupInfo" class="sn-fact">
                     <b>Ellikboshi:</b> {{ groupInfo.ellikboshi_username }} (Makka · ball shunga)
                     · {{ groupInfo.ellikboshi_madina || '—' }} (Madina)
                  </span>
                  <span v-if="groupInfo && groupInfo.trip_start_date" class="sn-fact">
                     <b>Safar:</b> {{ groupInfo.trip_start_date }} — {{ groupInfo.trip_end_date || '?' }}</span>
                  <span class="sn-fact"><b>Telefon:</b>
                     <a :href="'tel:+' + current.phone">+{{ current.phone }}</a></span>
               </div>
               <div class="sn-callbar">
                  <button v-for="(l, k) in CALL_LABELS" :key="k" class="sn-btn"
                     :class="{ pri: current.call_status === k }" :disabled="isSaved && k !== 'boldi'"
                     @click="setStatus(k)">{{ l }}</button>
               </div>
               <p v-if="isSaved" class="sn-savedband">
                  So'rovnoma saqlangan — {{ savedScore === null ? 'ellikboshi bahosiz (Q1 o\'tkazilgan)' : savedScore + ' ball' }}.
                  O'zgartirish faqat izoh bilan, alohida tartibda (§6.4).
               </p>
            </div>

            <div class="sn-panel">
               <!-- Blocks with 1–5 + «—» (javob bermadi): a skipped answer is excluded
                    from every mean — an operator must never invent a middle score for
                    a pilgrim who didn't answer. Keys 1–5 score the highlighted row,
                    0 skips, Enter/↓ move on. -->
               <div v-for="(b, bi) in BLOCKS" :key="b.key" class="sn-qblock">
                  <div class="sn-qhead">
                     <span class="sn-qnum">{{ bi + 1 }}</span>
                     <span class="sn-qtitle">{{ b.title }}</span>
                     <span class="sn-qwho">{{ b.who }}</span>
                  </div>
                  <p v-if="b.hint" class="sn-qhint">{{ b.hint }}</p>

                  <div v-for="r in b.rows" :key="r.k" class="sn-rowline"
                     :class="{ focus: focusKey === r.k }" @click="focusKey = r.k">
                     <span class="sn-rowlabel">{{ r.label }}</span>
                     <span v-if="r.type === 'scale'" class="sn-scale">
                        <button v-for="v in 5" :key="v" :class="{ sel: answers[r.k] === v,
                           low: answers[r.k] === v && v <= 2, mid: answers[r.k] === v && v === 3 }"
                           :disabled="isSaved" @click="setAns(r.k, v)">{{ v }}</button>
                        <button class="sn-skip" :class="{ sel: answers[r.k] === null && touched.has(r.k) }"
                           :disabled="isSaved" title="Javob bermadi" @click="setAns(r.k, null)">—</button>
                     </span>
                     <span v-else class="sn-choice">
                        <button v-for="c in r.choices" :key="String(c.v)"
                           :class="{ sel: answers[r.k] === c.v }" :disabled="isSaved"
                           @click="setAns(r.k, c.v)">{{ c.l }}</button>
                        <button class="sn-skip" :class="{ sel: answers[r.k] === null && touched.has(r.k) }"
                           :disabled="isSaved" title="Javob bermadi" @click="setAns(r.k, null)">—</button>
                     </span>
                  </div>
               </div>

               <!-- Muammolar — §6: each problem pinned to a place, a responsible party
                    and a severity; only ellikboshi-attributed ones touch their ball. -->
               <div class="sn-qblock">
                  <div class="sn-qhead">
                     <span class="sn-qnum">{{ BLOCKS.length + 1 }}</span>
                     <span class="sn-qtitle">Safar davomida qanday muammolar bo'ldi?</span>
                     <span class="sn-qwho">mas'ulga biriktiriladi</span>
                  </div>
                  <div v-for="(pr, i) in problems" :key="i" class="sn-prob">
                     <div class="sn-probgrid">
                        <label>Joy
                           <select v-model="pr.joy" :disabled="isSaved">
                              <option>Makka</option><option>Madina</option>
                              <option>Jidda</option><option>Toshkent</option>
                           </select></label>
                        <label>Mas'ul
                           <select v-model="pr.masul" :disabled="isSaved">
                              <option value="ellikboshi">Ellikboshi{{ groupInfo ? ' — ' + groupInfo.ellikboshi_username : '' }}</option>
                              <option value="ishchi_guruh">Ishchi guruh</option>
                              <option value="shifokor">Shifokor</option>
                              <option value="otinoyi">Otinoyi</option>
                              <option value="hotel">Mehmonxona</option>
                              <option value="avia">Aviakompaniya</option>
                              <option value="tashkent">Toshkent jamoasi</option>
                              <option value="admin">Guruh admini</option>
                              <option value="none">Hech kim (tashqi sabab)</option>
                           </select></label>
                        <label>Jiddiylik
                           <select v-model="pr.jiddiylik" :disabled="isSaved">
                              <option value="kichik">Kichik (−5)</option>
                              <option value="orta">O'rta (−10)</option>
                              <option value="jiddiy">Jiddiy (−15)</option>
                           </select></label>
                     </div>
                     <input v-model="pr.text" :disabled="isSaved" placeholder="Muammo mohiyati"
                        class="sn-input" />
                     <button v-if="!isSaved" class="sn-btn sn-ghost" @click="problems.splice(i, 1)">O'chirish</button>
                  </div>
                  <button v-if="!isSaved" class="sn-btn" @click="problems.push({ joy: 'Makka', masul: 'ellikboshi', jiddiylik: 'kichik', text: '' })">+ Muammo qo'shish</button>
               </div>

               <div class="sn-qblock">
                  <div class="sn-qhead"><span class="sn-qnum">{{ BLOCKS.length + 2 }}</span>
                     <span class="sn-qtitle">Yanada yaxshi bo'lishimiz uchun nima kerak?</span></div>
                  <textarea v-model="suggestion" :disabled="isSaved" class="sn-input"
                     placeholder="Ziyoratchining taklifini o'z so'zlari bilan yozing."></textarea>
               </div>
               <div class="sn-qblock">
                  <div class="sn-qhead"><span class="sn-qnum">{{ BLOCKS.length + 3 }}</span>
                     <span class="sn-qtitle">Bizni tanlashingizga nima sabab bo'ldi?</span>
                     <span class="sn-qwho">marketing · baholanmaydi</span></div>
                  <textarea v-model="choiceReason" :disabled="isSaved" class="sn-input"
                     placeholder="Tavsiya, reklama, narx, oldingi safar ..."></textarea>
               </div>

               <div class="sn-qblock sn-savebar">
                  <span class="sn-progress">{{ answeredCount }}/{{ totalKeys }} savol</span>
                  <span v-if="draftState" class="sn-draft">{{ draftState }}</span>
                  <button class="sn-btn pri" :disabled="isSaved || saving" @click="save">
                     {{ isSaved ? 'Saqlangan' : 'Saqlash va yopish' }}
                  </button>
               </div>
            </div>
         </main>
         <main v-else class="sn-panel sn-empty">
            Chapdan ziyoratchini tanlang — yoki CSV import qiling.
         </main>

         <!-- ─────────── LIVE IMPACT (preview; the SAVED score is the server's) ── -->
         <aside class="sn-panel sn-sticky" v-if="current">
            <div class="sn-lbl">Ellikboshi bahosi · jonli hisob</div>
            <div class="sn-bignum">{{ preview.ell === null ? '—' : preview.ell }}<small> / 100</small></div>
            <div class="sn-bar"><i :style="{ width: (preview.ell || 0) + '%' }"></i></div>
            <div class="sn-brk"><span>Muomala va e'tibor</span><span>{{ preview.muomala ?? '—' }} / 40</span></div>
            <div class="sn-brk"><span>Bilim darajasi</span><span>{{ preview.bilim ?? '—' }} / 30</span></div>
            <div class="sn-brk"><span>Qayta tanlash</span><span>{{ preview.qayta ?? '—' }} / 30</span></div>
            <div class="sn-brk neg"><span>Muammolar jarimasi</span><span>−{{ preview.jarima }}</span></div>
            <div class="sn-lbl" style="margin-top:14px">Boshqa kimga ta'sir qiladi</div>
            <div v-if="affected.length">
               <div v-for="a in affected" :key="a" class="sn-aff">{{ a }}</div>
            </div>
            <div v-else class="sn-note">Hozircha yo'q.</div>
            <p class="sn-note">Bu — mo'ljal. Rasmiy ball SAQLASHDA serverda hisoblanadi va
               o'zgartirilmas jurnalga tushadi. Oylik KPI = operatsion ball × 0,5 +
               ziyoratchi bahosi × 0,5.</p>
         </aside>
      </div>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const CALL_LABELS: Record<string, string> = {
   kutmoqda: 'Kutmoqda', boldi: "Bo'ldi", javob_bermadi: 'Javob bermadi',
   qayta: "Qayta qo'ng'iroq", bosh_tortdi: 'Bosh tortdi',
}

/** The merged questionnaire (owner, 2026-08-15) — §6.1 plus the seven added blocks.
 *  Only Q1 feeds the ellikboshi's ball; the rest accumulate for other parties. */
const BLOCKS = [
   { key: 'q1', title: 'Ellikboshi xizmati va bilimi', who: 'KPI ga kiradi', hint: "Baho to'g'ridan-to'g'ri ellikboshi KPI siga tushadi.", rows: [
      { k: 'q1_service', label: "Muomala va e'tibor", type: 'scale' },
      { k: 'q1_knowledge', label: 'Diniy va marshrut bilimi', type: 'scale' },
      { k: 'q1_again', label: 'Yana shu ellikboshi bilan borasizmi?', type: 'choice',
        choices: [{ v: 30, l: 'Ha' }, { v: 15, l: 'Bilmayman' }, { v: 0, l: "Yo'q" }] },
   ] },
   { key: 'q2', title: 'Otinoyi xizmatlari', who: 'otinoyi', rows: [
      { k: 'q2_otinoyi', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q3', title: 'Toshkentdagi kuzatuv jamoasi', who: "bo'lim bahosi", rows: [
      { k: 'q3_tashkent', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q4', title: "Guruh adminining Telegram'dagi ishi", who: 'guruh admini', rows: [
      { k: 'q4_admin', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q5', title: 'Ishchi guruh (Makka / Madina)', who: 'ishchi guruh', rows: [
      { k: 'q5_workgroup', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q6', title: 'Shifokor xizmati', who: 'shifokorlar', rows: [
      { k: 'q6_doctor_md', label: 'Madinadagi shifokor', type: 'scale' },
      { k: 'q6_doctor_mk', label: 'Makkadagi shifokor', type: 'scale' }] },
   { key: 'q7', title: 'Mehmonxonalar', who: 'yetkazib beruvchi', rows: [
      { k: 'q7_hotel_md', label: 'Madina', type: 'scale' },
      { k: 'q7_hotel_mk', label: 'Makka', type: 'scale' },
      { k: 'q7_hotel_jd', label: 'Jidda', type: 'scale' }] },
   { key: 'q8', title: 'Taomlar sifati', who: 'oshxona', rows: [
      { k: 'q8_food_mk', label: 'Makka', type: 'scale' },
      { k: 'q8_food_md', label: 'Madina', type: 'scale' }] },
   { key: 'q9', title: 'Aviakompaniya va parvoz', who: 'charter', rows: [
      { k: 'q9_avia', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q10', title: "Umra safarini boshqalarga tavsiya qilasizmi?", who: 'kompaniya (NPS)', rows: [
      { k: 'q10_recommend', label: 'Tavsiya', type: 'choice',
        choices: [{ v: 'ha', l: 'Ha' }, { v: 'bilmayman', l: 'Bilmayman' }, { v: 'yoq', l: "Yo'q" }] }] },
] as any[]

const ALL_KEYS: string[] = BLOCKS.flatMap((b: any) => b.rows.map((r: any) => r.k))
const totalKeys = ALL_KEYS.length

const queue = ref<any[]>([])
const groups = ref<any[]>([])
const search = ref('')
const statusFilter = ref('')
const current = ref<any>(null)
const pickedGroup = ref<number | null>(null)
const answers = reactive<Record<string, any>>({})
const problems = ref<any[]>([])
const suggestion = ref('')
const choiceReason = ref('')
const touched = reactive(new Set<string>())
const isSaved = ref(false)
const savedScore = ref<number | null>(null)
const saving = ref(false)
const draftState = ref('')
const focusKey = ref<string | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)

const filteredQueue = computed(() => {
   const n = search.value.trim().toLowerCase()
   return queue.value.filter((p) =>
      (!statusFilter.value || p.call_status === statusFilter.value)
      && (!n || p.full_name.toLowerCase().includes(n) || p.phone.includes(n)))
})
const doneToday = computed(() => queue.value.filter((p) => p.survey_status === 'saved').length)
const groupInfo = computed(() => groups.value.find((g) => g.chat_id === pickedGroup.value) || null)

// Reset per pilgrim: a filter left on from the previous call is a filter nobody chose.
const showAllGroups = ref(false)
watch(() => current.value?.id, () => { showAllGroups.value = false })

/** The picker's options. Narrowed to the groups that departed on the day Bitrix
 *  recorded — but only while that actually leaves something to pick: a hint matching
 *  no group must not empty the list, or the specialist cannot assign anybody. */
const pickableGroups = computed(() => {
   const hint = current.value?.depart_hint
   if (!hint || showAllGroups.value) return groups.value
   const sameDay = groups.value.filter((g) => g.trip_start_date === hint)
   return sameDay.length ? sameDay : groups.value
})

/** 2026-08-15 -> 15.08.2026, the way the office writes a date. */
function dmy(iso: string) {
   const [y, m, d] = (iso || '').split('-')
   return d ? `${d}.${m}.${y}` : iso
}

/** The chosen group's trip has not ended yet — §6 puts the call 1–3 days after the
 *  flight home, so this is a survey about a trip still in progress. */
const notReturnedYet = computed(() => {
   const end = groupInfo.value?.trip_end_date
   return !!end && end > new Date().toISOString().slice(0, 10)
})
/** Led by two different people across the cities — the server sends both names. */
const splitGroup = computed(() => {
   const g = groupInfo.value
   if (!g) return false
   const md = (g.ellikboshi_madina || '').trim().toLowerCase()
   return !!md && md !== (g.ellikboshi_username || '').trim().toLowerCase()
})
const answeredCount = computed(() => ALL_KEYS.filter((k) => touched.has(k)).length)

/** Client-side PREVIEW of the §6.2 arithmetic — the saved score is the server's. */
const preview = computed(() => {
   const p5 = (v: any) => (v == null ? null : Math.round(((v - 1) / 4) * 100) / 100)
   const s = p5(answers.q1_service), kn = p5(answers.q1_knowledge)
   const again = answers.q1_again
   const jarima = Math.min(20, problems.value
      .filter((p) => p.masul === 'ellikboshi')
      .reduce((sum, p) => sum + ({ kichik: 5, orta: 10, jiddiy: 15 } as any)[p.jiddiylik] || 0, 0))
   if (s === null || kn === null || again == null || again === null)
      return { muomala: s === null ? null : Math.round(s * 40), bilim: kn === null ? null : Math.round(kn * 30), qayta: again ?? null, jarima, ell: null }
   const m = Math.round(s * 40), b = Math.round(kn * 30)
   return { muomala: m, bilim: b, qayta: again, jarima, ell: Math.max(0, m + b + again - jarima) }
})

const AFF_LABELS: Record<string, string> = {
   q2_otinoyi: 'Otinoyi', q3_tashkent: 'Toshkent jamoasi', q4_admin: 'Guruh admini',
   q5_workgroup: 'Ishchi guruh', q6_doctor_md: 'Shifokor (Madina)', q6_doctor_mk: 'Shifokor (Makka)',
   q7_hotel_md: 'Mehmonxona (Madina)', q7_hotel_mk: 'Mehmonxona (Makka)', q7_hotel_jd: 'Mehmonxona (Jidda)',
   q8_food_mk: 'Taomlar (Makka)', q8_food_md: 'Taomlar (Madina)', q9_avia: 'Aviakompaniya',
}
const affected = computed(() => {
   const out: string[] = []
   for (const [k, l] of Object.entries(AFF_LABELS))
      if (answers[k] != null) out.push(`${l} — ${answers[k]} / 5`)
   for (const p of problems.value)
      if (p.masul && p.masul !== 'ellikboshi' && p.masul !== 'none')
         out.push(`Muammo → ${p.masul} (${p.jiddiylik})`)
   if (answers.q10_recommend != null) out.push(`Tavsiya (NPS) — ${answers.q10_recommend}`)
   return out
})

async function loadQueue() {
   queue.value = (await api.get('/survey/queue')).data
}
async function loadGroups() {
   groups.value = (await api.get('/survey/groups')).data
}

function open(p: any) {
   current.value = p
   pickedGroup.value = p.chat_id
   isSaved.value = p.survey_status === 'saved'
   savedScore.value = p.ell_score ?? null
   for (const k of ALL_KEYS) delete answers[k]
   touched.clear()
   problems.value = []
   suggestion.value = ''
   choiceReason.value = ''
   focusKey.value = ALL_KEYS[0]
   // Draft resume comes with the queue row's survey; simplest correct source is a
   // fresh queue fetch on save — drafts live server-side via autosave below.
   void resumeDraft(p.id)
}

async function resumeDraft(pid: number) {
   try {
      const { data } = await api.get(`/survey/${pid}/draft`)
      if (current.value?.id !== pid || !data) return
      Object.assign(answers, data.answers || {})
      for (const k of Object.keys(data.answers || {})) touched.add(k)
      problems.value = data.problems || []
      suggestion.value = data.suggestion || ''
      choiceReason.value = data.choice_reason || ''
   } catch { /* no draft yet — a clean form is the right state */ }
}

function setAns(k: string, v: any) {
   answers[k] = v
   touched.add(k)
   const i = ALL_KEYS.indexOf(k)
   focusKey.value = ALL_KEYS[Math.min(i + 1, ALL_KEYS.length - 1)]
}

/** Keys 1–5 answer the highlighted row, 0/− skip it, ↓/Enter and ↑ move — the
 *  operator is on a live call and must never need the mouse. */
function onKey(e: KeyboardEvent) {
   if (!current.value || isSaved.value) return
   const tag = (e.target as HTMLElement)?.tagName
   if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
   const k = focusKey.value
   if (!k) return
   const row: any = BLOCKS.flatMap((b: any) => b.rows).find((r: any) => r.k === k)
   if (e.key >= '1' && e.key <= '5') {
      if (row.type === 'scale') setAns(k, Number(e.key))
      else if (Number(e.key) <= row.choices.length) setAns(k, row.choices[Number(e.key) - 1].v)
      e.preventDefault()
   } else if (e.key === '0' || e.key === '-') {
      setAns(k, null); e.preventDefault()
   } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      focusKey.value = ALL_KEYS[Math.min(ALL_KEYS.indexOf(k) + 1, ALL_KEYS.length - 1)]; e.preventDefault()
   } else if (e.key === 'ArrowUp') {
      focusKey.value = ALL_KEYS[Math.max(ALL_KEYS.indexOf(k) - 1, 0)]; e.preventDefault()
   }
}

// ── autosave: a dropped call must not lose ten answered questions ────────────
let draftTimer: any = null
watch([answers, problems, suggestion, choiceReason], () => {
   if (!current.value || isSaved.value) return
   draftState.value = '…'
   clearTimeout(draftTimer)
   draftTimer = setTimeout(async () => {
      try {
         await api.put(`/survey/${current.value.id}/draft`, {
            answers: { ...answers }, problems: problems.value,
            suggestion: suggestion.value || null, choice_reason: choiceReason.value || null,
         })
         draftState.value = 'qoralama saqlandi'
      } catch { draftState.value = 'qoralama saqlanmadi!' }
   }, 800)
}, { deep: true })

async function assignGroup() {
   if (!current.value) return
   await api.put(`/survey/pilgrims/${current.value.id}`, { chat_id: pickedGroup.value })
   current.value.chat_id = pickedGroup.value
   await loadQueue()
}

async function setStatus(k: string) {
   if (!current.value) return
   await api.put(`/survey/pilgrims/${current.value.id}`, { call_status: k })
   current.value.call_status = k
   await loadQueue()
}

async function save() {
   if (!current.value) return
   saving.value = true
   try {
      const { data } = await api.post(`/survey/${current.value.id}/save`)
      isSaved.value = true
      savedScore.value = data.ell_score
      toast.success(data.ell_score === null
         ? "Saqlandi — Q1 o'tkazilgani uchun ellikboshi o'rtachasiga kirmaydi"
         : `Saqlandi — ${data.ell_score} ball → ${data.ellikboshi_username}`)
      await loadQueue()
   } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Saqlanmadi')
   } finally { saving.value = false }
}

async function importCsv(ev: Event) {
   const file = (ev.target as HTMLInputElement).files?.[0]
   if (!file) return
   const text = await file.text()
   const sep = text.includes(';') ? ';' : text.includes('\t') ? '\t' : ','
   const rows = text.split(/\r?\n/).map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')))
      .filter((r) => r.length >= 2 && (r[0] || r[1]))
   // A header row names its columns instead of a person — drop it. Cyrillic included:
   // the real Bitrix export heads its columns «Контакт: Имя» / «Контакт: Рабочий
   // телефон», which a Latin-only test walks straight past.
   if (rows.length && /ism|name|telefon|phone|имя|телефон|контакт/i.test(rows[0].join(' '))) rows.shift()
   try {
      const { data } = await api.post('/survey/import', { rows })
      const parts = [`${data.added} qo'shildi`]
      if (data.duplicates) parts.push(`${data.duplicates} takroriy`)
      if (data.unnamed) parts.push(`${data.unnamed} ismsiz qo'ng'iroq`)
      if (data.bad.length) parts.push(`${data.bad.length} o'qilmadi`)
      // When most of the file was call-log rows, the file itself was the wrong export
      // — a green "12 added" on a 119-row upload reads as success and is how a
      // half-empty call list gets worked through without anybody asking why.
      if (data.unnamed > data.added) {
         toast.error(`Import: ${parts.join(', ')}. Bu fayl qo'ng'iroqlar tarixiga `
            + `o'xshaydi — Bitrixdan aniq bir reys ziyoratchilarini yuklang.`)
      } else {
         toast.success(`Import: ${parts.join(', ')}`)
      }
      await loadQueue()
   } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Import xatosi')
   }
   ;(ev.target as HTMLInputElement).value = ''
}

function logout() {
   auth.logout()
   router.push('/login')
}

onMounted(() => {
   void loadQueue(); void loadGroups()
   window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.sn-app { min-height: 100vh; background: #f4f1ea; color: #1c2b24; font-size: 14.5px; }
.sn-top { position: sticky; top: 0; z-index: 10; background: #0f3d2e; color: #fff;
   padding: 12px 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.sn-brand { font-size: 19px; font-weight: 700; letter-spacing: .02em; }
.sn-brand span { color: #d8b45a; }
.sn-sub { font-size: 13px; opacity: .85; }
.sn-topright { margin-left: auto; display: flex; gap: 8px; align-items: center; font-size: 13px; }
.sn-wrap { display: grid; grid-template-columns: 270px minmax(0, 1fr) 300px; gap: 14px;
   padding: 14px 20px; align-items: start; }
@media (max-width: 1180px) { .sn-wrap { grid-template-columns: 1fr; } .sn-sticky { position: static; } }
.sn-panel { background: #fff; border: 1px solid #e2ddd0; border-radius: 14px; padding: 14px; }
.sn-sticky { position: sticky; top: 64px; }
.sn-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.sn-lbl { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #8a8474;
   font-weight: 700; margin-bottom: 8px; }
.sn-input { width: 100%; font: inherit; padding: 7px 9px; border: 1px solid #d9d3c4;
   border-radius: 9px; background: #fbfaf7; margin-bottom: 8px; }
.sn-inline { font: inherit; padding: 3px 6px; border: 1px solid #d9d3c4; border-radius: 7px; }
.sn-queue { max-height: 55vh; overflow-y: auto; }
.sn-qitem { width: 100%; display: flex; gap: 8px; align-items: center; padding: 8px 6px;
   border: 0; border-top: 1px solid #eee9dd; background: none; cursor: pointer; text-align: left;
   font: inherit; border-radius: 8px; }
.sn-qitem.on { background: #eef4ef; }
.sn-qmain { flex: 1; min-width: 0; } .sn-qmain b { display: block; }
.sn-qmain small, .sn-qst { color: #8a8474; font-size: 12px; }
.sn-dot { width: 8px; height: 8px; border-radius: 50%; background: #d8b45a; flex-shrink: 0; }
.sn-dot.done { background: #2e7d5b; }
.sn-subject h1 { font-size: 24px; margin: 0 0 8px; }
.sn-facts { display: flex; flex-wrap: wrap; gap: 8px; }
.sn-fact { font-size: 12.5px; background: #fbfaf7; border: 1px solid #e2ddd0; border-radius: 999px;
   padding: 4px 10px; }
/* Amber, not red: the trip being unfinished is a "not yet", not a fault — red on this
   panel is reserved for something actually wrong. */
.sn-warn { background: #fdf6e3; border-color: #e0c98a; color: #7a5a10; }
/* The picker's own filter toggle — a link inside a fact chip, not another button
   competing with the call bar below it. */
.sn-linkbtn { font: inherit; font-size: 11.5px; background: none; border: 0; padding: 0 0 0 6px;
   color: #6b6455; text-decoration: underline; cursor: pointer; }
.sn-linkbtn:hover { color: #0f3d2e; }
.sn-callbar { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.sn-btn { font: inherit; font-weight: 600; border-radius: 10px; border: 1px solid #d9d3c4;
   background: #fff; padding: 7px 12px; cursor: pointer; }
.sn-btn.pri { background: #0f3d2e; color: #fff; border-color: #0f3d2e; }
.sn-btn:disabled { opacity: .55; cursor: default; }
.sn-ghost { background: transparent; color: inherit; }
.sn-top .sn-ghost { color: #fff; border-color: rgba(255,255,255,.35); }
.sn-savedband { margin: 10px 0 0; font-size: 13px; color: #2e7d5b; font-weight: 600; }
.sn-qblock { border-top: 1px solid #eee9dd; padding: 12px 0; }
.sn-qblock:first-child { border-top: 0; }
.sn-qhead { display: flex; align-items: baseline; gap: 10px; }
.sn-qnum { color: #d8b45a; font-weight: 700; min-width: 18px; }
.sn-qtitle { font-weight: 600; }
.sn-qwho { margin-left: auto; font-size: 12px; color: #8a8474; }
.sn-qhint { font-size: 12.5px; color: #8a8474; margin: 2px 0 0 28px; }
.sn-rowline { display: flex; align-items: center; gap: 12px; margin: 8px 0 0 28px;
   flex-wrap: wrap; border-radius: 8px; padding: 3px 6px; }
.sn-rowline.focus { background: #f6f2e7; outline: 1px dashed #d8b45a; }
.sn-rowlabel { min-width: 210px; font-size: 13.5px; }
.sn-scale, .sn-choice { display: flex; gap: 6px; }
.sn-scale button, .sn-choice button, .sn-skip { font: inherit; font-weight: 600;
   border: 1px solid #d9d3c4; background: #fff; border-radius: 9px; min-width: 34px;
   height: 32px; cursor: pointer; padding: 0 10px; }
.sn-scale button.sel, .sn-choice button.sel { background: #0f3d2e; color: #fff; border-color: #0f3d2e; }
.sn-scale button.sel.low { background: #a13c2f; border-color: #a13c2f; }
.sn-scale button.sel.mid { background: #b8860b; border-color: #b8860b; }
.sn-skip.sel { background: #8a8474; color: #fff; border-color: #8a8474; }
.sn-prob { border: 1px solid #e2ddd0; border-left: 3px solid #d8b45a; border-radius: 10px;
   padding: 10px; margin: 10px 0 0 28px; }
.sn-probgrid { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 8px;
   margin-bottom: 8px; }
.sn-probgrid label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
   color: #8a8474; font-weight: 700; display: flex; flex-direction: column; gap: 4px; }
.sn-probgrid select { font: 14.5px 'Segoe UI', sans-serif; padding: 6px; border-radius: 8px;
   border: 1px solid #d9d3c4; }
.sn-savebar { display: flex; align-items: center; gap: 12px; }
.sn-progress { font-weight: 700; }
.sn-draft { font-size: 12.5px; color: #8a8474; }
.sn-savebar .sn-btn.pri { margin-left: auto; }
.sn-bignum { font-size: 44px; font-weight: 700; color: #0f3d2e; line-height: 1; }
.sn-bignum small { font-size: 15px; color: #8a8474; font-weight: 600; }
.sn-bar { height: 6px; background: #eee9dd; border-radius: 4px; overflow: hidden; margin: 8px 0 12px; }
.sn-bar i { display: block; height: 100%; background: linear-gradient(90deg, #0f3d2e, #d8b45a);
   transition: width .3s; }
.sn-brk { display: flex; justify-content: space-between; font-size: 13.5px; padding: 5px 0;
   border-top: 1px solid #eee9dd; }
.sn-brk span:last-child { font-weight: 600; font-variant-numeric: tabular-nums; }
.sn-brk.neg span:last-child { color: #a13c2f; }
.sn-aff { font-size: 13px; padding: 4px 0; border-bottom: 1px solid #eee9dd; }
.sn-note { font-size: 12.5px; color: #8a8474; margin-top: 10px; }
.sn-empty { text-align: center; color: #8a8474; padding: 60px 20px; }
.hidden { display: none; }
</style>

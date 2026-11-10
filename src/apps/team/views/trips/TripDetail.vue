<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <router-link to="/team/trips" class="icon-btn" title="Safarlar">
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
          <span class="sr-only">Safarlar</span>
        </router-link>
        <div class="min-w-0 mr-auto">
          <h1 class="text-xl font-semibold tracking-tight text-gray-900 truncate">{{ trip?.name || 'Safar' }}</h1>
          <p v-if="trip" class="text-sm text-gray-500 truncate">
            <span class="font-mono">{{ trip.trip_id }}</span>
            · {{ fmtDate(parseDate(trip.start_date)) }}<template v-if="trip.end_date"> → {{ fmtDate(parseDate(trip.end_date)) }}</template>
            · <span :class="{ 'text-emerald-600 font-medium': tripPhase(trip) === 'ontrip' }">{{ phaseNote(trip) }}</span>
            <template v-if="!trip.group_chat_id"> · <span class="text-rose-600">guruh ulanmagan</span></template>
          </p>
        </div>
        <template v-if="trip">
          <label class="flex items-center gap-2 text-sm text-gray-700 mr-1">
            <ToggleSwitch :model-value="trip.registration_open" @update:model-value="setRegistration" />Ro'yxat
          </label>
          <button class="btn btn-secondary" @click="setActive(!trip.is_active)">
            <font-awesome-icon :icon="trip.is_active ? 'box-archive' : 'rotate-left'" class="w-3.5 h-3.5" />
            {{ trip.is_active ? 'Arxivga' : 'Aktivga qaytarish' }}
          </button>
          <button class="icon-btn" title="Tahrirlash" @click="formOpen = true">
            <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
            <span class="sr-only">Tahrirlash</span>
          </button>
        </template>
      </div>

      <p v-if="loadError" class="card empty text-rose-600">{{ loadError }}</p>

      <template v-else>
        <div class="seg scroll-x">
          <button v-for="t in TABS" :key="t.value" type="button" class="seg-btn" :class="{ 'seg-btn-on': tab === t.value }" @click="tab = t.value">
            {{ t.label }} <span class="ml-1 text-xs tabular-nums text-gray-400">{{ tabCount[t.value] }}</span>
          </button>
        </div>

        <PostList v-show="tab === 'posts'" kind="trip" :posts="postRows" :trip="trip" :loading="loading" @open="openPost" @changed="loadPosts">
          <template #actions>
            <button v-if="hasNowPosts" class="btn btn-secondary" :disabled="startingBots" @click="startBots">
              <font-awesome-icon icon="bolt" class="w-3.5 h-3.5" />{{ startingBots ? 'Yuborilmoqda…' : 'Hoziroq postlarni yuborish' }}
            </button>
            <button class="btn btn-secondary" @click="importOpen = true">
              <font-awesome-icon icon="clone" class="w-3.5 h-3.5" />Shablondan
            </button>
            <button class="btn btn-primary" @click="openPost(null)">
              <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />Post
            </button>
          </template>
          <template #empty>
            <p class="mb-3">Bu safarda hali post yo'q</p>
            <button class="btn btn-primary" @click="importOpen = true">
              <font-awesome-icon icon="clone" class="w-3.5 h-3.5" />Shablondan qo'shish
            </button>
          </template>
        </PostList>

        <div v-if="tab === 'people'" class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <div class="relative w-full sm:w-72">
              <font-awesome-icon icon="magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input v-model="peopleSearch" type="search" class="input pl-9" placeholder="Ism, telefon yoki username" />
            </div>
            <button class="btn btn-secondary ml-auto" :disabled="exporting === 'users'" @click="exportTo('users')">
              <font-awesome-icon icon="file-export" class="w-3.5 h-3.5" />{{ exporting === 'users' ? 'Eksport…' : "Sheets'ga" }}
            </button>
          </div>
          <div v-if="shownPeople.length === 0" class="card empty">{{ peopleSearch ? 'Topilmadi' : "Ro'yxatdan o'tganlar yo'q" }}</div>
          <div v-else class="card overflow-x-auto">
            <table class="table min-w-[520px]">
              <thead><tr><th>Ism</th><th>Telefon</th><th>Username</th><th class="text-right">Sana</th></tr></thead>
              <tbody>
                <tr v-for="u in shownPeople" :key="u.id">
                  <td class="text-gray-900">{{ personName(u) }}</td>
                  <td class="text-gray-600 tabular-nums whitespace-nowrap">{{ u.phone_number || '—' }}</td>
                  <td class="text-gray-500">{{ u.username ? '@' + u.username : '—' }}</td>
                  <td class="text-right text-xs text-gray-400 tabular-nums whitespace-nowrap">{{ fmtDate(parseDate(u.registered_at)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="tab === 'answers'" class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <select v-model="questionFilter" class="input sm:w-80">
              <option :value="null">Barcha savollar</option>
              <option v-for="q in answerQuestions" :key="q.id" :value="q.id">{{ q.text }}</option>
            </select>
            <span v-if="averageRating" class="chip chip-amber"><font-awesome-icon icon="star" class="w-2.5 h-2.5" />{{ averageRating }}</span>
            <button class="btn btn-secondary ml-auto" :disabled="exporting === 'responses'" @click="exportTo('responses')">
              <font-awesome-icon icon="file-export" class="w-3.5 h-3.5" />{{ exporting === 'responses' ? 'Eksport…' : "Sheets'ga" }}
            </button>
          </div>
          <div v-if="shownAnswers.length === 0" class="card empty">Javoblar yo'q</div>
          <div v-else class="card overflow-x-auto">
            <table class="table min-w-[600px]">
              <thead><tr><th>Kim</th><th v-if="questionFilter === null">Savol</th><th>Javob</th><th class="text-right">Sana</th></tr></thead>
              <tbody>
                <tr v-for="r in shownAnswers" :key="r.id">
                  <td class="text-gray-900 whitespace-nowrap">{{ personName(r) }}</td>
                  <td v-if="questionFilter === null" class="text-gray-500 max-w-64 truncate">{{ r.question_text }}</td>
                  <td class="text-gray-800">
                    <span v-if="r.response_rating" class="tabular-nums font-medium">{{ r.response_rating }}/5</span>
                    <span v-if="r.response_text" :class="{ 'ml-2': r.response_rating }">{{ r.response_text }}</span>
                  </td>
                  <td class="text-right text-xs text-gray-400 tabular-nums whitespace-nowrap">{{ fmtDate(parseDate(r.submitted_at)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <PostForm :open="postOpen" kind="trip" :owner-id="tripId" :post="editing" :trip="trip" :default-day="null"
      @close="postOpen = false" @saved="loadPosts" />
    <TripForm :open="formOpen" :trip="trip" @close="formOpen = false" @saved="t => (trip = t)" @removed="router.push('/team/trips')" />
    <ImportDialog :open="importOpen" mode="template" :trip-ids="[tripId]" @close="importOpen = false" @done="loadPosts" />
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import ToggleSwitch from '../../../../components/ToggleSwitch.vue'
import { useConfirm } from '../../../../composables/useConfirm'
import { useToast } from '../../../../composables/useToast'
import { teamApi } from '../../../../api'
import { errorText, exportSheet, posts as postsApi, trips as tripsApi, type Participant, type Post, type PollResponse, type Trip } from '../../api'
import ImportDialog from '../../components/ImportDialog.vue'
import PostForm from '../../components/PostForm.vue'
import PostList from '../../components/PostList.vue'
import TripForm from '../../components/TripForm.vue'
import { fmtDate, parseDate, personName, phaseNote, tripPhase } from '../../format'

// One trip on one screen: its posts first (what the office works on), the pilgrims who
// registered, and their answers to the questionnaire.
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { confirm } = useConfirm()
const tripId = route.params.id as string

type Tab = 'posts' | 'people' | 'answers'
const TABS: { value: Tab; label: string }[] = [
  { value: 'posts', label: 'Postlar' },
  { value: 'people', label: 'Ishtirokchilar' },
  { value: 'answers', label: 'Javoblar' },
]
const tab = ref<Tab>('posts')

const trip = ref<Trip | null>(null)
const postRows = ref<Post[]>([])
const people = ref<Participant[]>([])
const answers = ref<PollResponse[]>([])
const loading = ref(true)
const loadError = ref('')
const postOpen = ref(false)
const editing = ref<Post | null>(null)
const formOpen = ref(false)
const importOpen = ref(false)
const startingBots = ref(false)
const exporting = ref<'' | 'users' | 'responses'>('')
const peopleSearch = ref('')
const questionFilter = ref<number | null>(null)

async function loadPosts() {
  try {
    postRows.value = await postsApi.list('trip', tripId)
  } catch (e) {
    toast.error(errorText(e, "Postlarni yuklab bo'lmadi"))
  }
}

onMounted(async () => {
  try {
    trip.value = await tripsApi.get(tripId)
  } catch (e) {
    loadError.value = errorText(e, 'Safar topilmadi')
    loading.value = false
    return
  }
  await Promise.all([
    loadPosts(),
    tripsApi.participants(tripId).then(v => (people.value = v)).catch(() => {}),
    tripsApi.responses(tripId).then(v => (answers.value = v)).catch(() => {}),
  ])
  loading.value = false
})

const tabCount = computed(() => ({ posts: postRows.value.length, people: people.value.length, answers: answers.value.length }))

function openPost(p: Post | null) {
  editing.value = p
  postOpen.value = true
}

async function setRegistration(open: boolean) {
  if (!trip.value) return
  try {
    trip.value = await tripsApi.setRegistration(tripId, open)
  } catch (e) {
    toast.error(errorText(e))
  }
}

async function setActive(active: boolean) {
  if (!trip.value) return
  if (!active && !(await confirm({ title: "Safarni arxivga o'tkazish", message: 'Arxivdagi safarning postlari yuborilmaydi', confirmText: 'Arxivga' }))) return
  try {
    trip.value = await tripsApi.setActive(tripId, active)
    toast.success(active ? 'Aktivga qaytdi' : "Arxivga o'tdi")
  } catch (e) {
    toast.error(errorText(e))
  }
}

const hasNowPosts = computed(() => postRows.value.some(p => p.send_mode === 'now' && !p.is_sent && p.is_active))

async function startBots() {
  if (!(await confirm({ title: 'Hoziroq postlarni yuborish', message: "«Hoziroq» belgilangan postlar guruhga hozir yuboriladi", confirmText: 'Yuborish' }))) return
  startingBots.value = true
  try {
    const { data } = await teamApi.post(`/api/trips/${tripId}/send-now-posts`)
    toast.success(data?.detail || 'Yuborildi')
    await loadPosts()
  } catch (e) {
    toast.error(errorText(e))
  } finally {
    startingBots.value = false
  }
}

async function exportTo(what: 'users' | 'responses') {
  exporting.value = what
  try {
    await exportSheet(`${what}/${tripId}`)
    toast.success("Google Sheets'ga yozildi")
  } catch (e) {
    toast.error(errorText(e, "Eksport qilib bo'lmadi"))
  } finally {
    exporting.value = ''
  }
}

const shownPeople = computed(() => {
  const q = peopleSearch.value.trim().toLowerCase().replace(/\s+/g, '')
  if (!q) return people.value
  return people.value.filter(u =>
    [personName(u), u.phone_number, u.username].some(v => (v || '').toLowerCase().replace(/\s+/g, '').includes(q)))
})

const answerQuestions = computed(() => {
  const seen = new Map<number, string>()
  for (const r of answers.value) if (!seen.has(r.question_id)) seen.set(r.question_id, r.question_text || `#${r.question_id}`)
  return [...seen.entries()].map(([id, text]) => ({ id, text }))
})
const shownAnswers = computed(() => (questionFilter.value === null ? answers.value : answers.value.filter(r => r.question_id === questionFilter.value)))
const averageRating = computed(() => {
  const rated = shownAnswers.value.filter(r => r.response_rating)
  if (!rated.length) return ''
  return (rated.reduce((s, r) => s + (r.response_rating || 0), 0) / rated.length).toFixed(1)
})
</script>

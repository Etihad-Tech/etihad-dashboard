<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Ellikboshilar</h1>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <template v-else>
        <!-- Pool management -->
        <div class="card p-4 space-y-3">
          <div class="flex items-center gap-2">
            <span class="section-title">Ro'yxat</span>
            <span class="chip chip-gray">{{ pool.length }}</span>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <span v-for="e in pool" :key="e.id" class="inline-flex items-center gap-1.5 h-7 bg-amber-50 border border-amber-100 rounded-full pl-3 pr-1 text-xs">
              <span class="font-medium text-gray-800">{{ e.name || e.username }}</span>
              <span v-if="e.name" class="text-gray-400">{{ e.username }}</span>
              <button :disabled="poolBusy" title="O'chirish"
                class="w-5 h-5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                @click="removeFromPool(e)">
                <font-awesome-icon icon="xmark" class="w-2.5 h-2.5" />
              </button>
            </span>
            <span v-if="!pool.length" class="text-sm text-gray-400">Ro'yxat bo'sh</span>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            <input v-model="newUsername" type="text" placeholder="@username" class="input w-44" @keyup.enter="addToPool" />
            <input v-model="newName" type="text" placeholder="Ism" class="input w-48" @keyup.enter="addToPool" />
            <button class="btn btn-primary" :disabled="poolBusy || !newUsername.trim()" @click="addToPool">
              <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
              Qo'shish
            </button>
          </div>
          <p v-if="poolError" class="error-text">{{ poolError }}</p>
        </div>

        <!-- «Ellikboshi to'g'risida ma'lumot» (owner, 27.11.2026): text + photo per leader.
             The bot posts it ONCE to a group he is assigned to, and the pilgrim cabinet
             shows it under «Ellikboshim». -->
        <div v-if="pool.length" class="card divide-y divide-gray-100">
          <div class="flex items-center gap-2 px-4 py-3">
            <span class="section-title">Ma'lumot</span>
            <span class="chip chip-gray">{{ filledCount }} / {{ pool.length }}</span>
          </div>
          <!-- The timer (owner, 27.11.2026): how long after the assignment the bot posts
               the card to the group. -->
          <div class="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 text-sm text-gray-700">
            <span>Guruhga yuborish: tayinlangandan</span>
            <span class="inline-flex items-center gap-2">
              <input v-model.number="delay.h" type="number" min="0" :max="DELAY_MAX_H" aria-label="Soat"
                class="input input-sm w-16 tabular-nums" :disabled="!delay.loaded" />
              <span>soat</span>
              <input v-model.number="delay.m" type="number" min="0" max="59" aria-label="Daqiqa"
                class="input input-sm w-16 tabular-nums" :disabled="!delay.loaded" />
              <span>daqiqa keyin</span>
            </span>
            <button type="button" class="btn btn-primary btn-sm" :disabled="!delayDirty || !delayValid || delay.saving" @click="saveDelay">
              {{ delay.saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
            <p v-if="delayInvalidText" class="error-text w-full">{{ delayInvalidText }}</p>
          </div>
          <div v-for="e in pool" :key="e.id" class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                <img v-if="thumbs[e.id]" :src="thumbs[e.id]" alt="" class="w-full h-full object-cover" />
                <font-awesome-icon v-else icon="user" class="w-4 h-4 text-gray-300" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ e.name || e.username }}<span v-if="e.name" class="ml-1.5 font-normal text-gray-400">{{ e.username }}</span>
                </p>
                <p v-if="e.info_text" class="text-xs text-gray-500 truncate">{{ e.info_text }}</p>
              </div>
            </div>
            <button type="button" class="btn btn-sm shrink-0 self-start sm:self-auto"
              :class="hasInfo(e) ? 'btn-secondary' : 'btn-primary'" @click="openInfo(e)">
              <font-awesome-icon :icon="hasInfo(e) ? 'pen' : 'plus'" class="w-3 h-3" />
              {{ hasInfo(e) ? "Ma'lumotni tahrirlash" : "Ellikboshi to'g'risida ma'lumot qo'shish" }}
            </button>
          </div>
        </div>

        <!-- Per-group assignment -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="section-title">Guruhlar</span>
          <span class="chip chip-gray">{{ filteredGroups.length }}</span>
          <div class="relative ml-auto w-full sm:w-60">
            <font-awesome-icon icon="magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input v-model="search" type="text" placeholder="Qidirish" class="input pl-9" />
          </div>
        </div>

        <div v-if="!filteredGroups.length" class="card empty">Guruh topilmadi</div>
        <div v-else class="card divide-y divide-gray-100">
          <!-- One row per group. The DEFAULT shape is the old one — a single select —
               because one leader for the whole trip is still the normal case and making
               every group ask two questions to answer one would be a worse screen than
               the one it replaced. The split is opened per group, by the person who
               actually needs it, and a group that already IS split opens itself. -->
          <div v-for="g in filteredGroups" :key="g.id" class="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 px-4 py-3">
            <div class="min-w-0 md:w-72 md:shrink-0 md:pt-2">
              <div class="flex items-center gap-2 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ g.title || g.id }}</p>
                <font-awesome-icon v-if="savedId === g.id" icon="circle-check" class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
              <!-- «Not assigned» means NOBODY leads this group in EITHER city. It used to
                   test `leaderOf`, which is empty by definition on a SPLIT group (two people,
                   no single leader to name) — so every group split between cities was
                   flagged as unassigned with both leaders sitting right under the line. -->
              <span v-if="!cityLeader(g, 'makka') && !cityLeader(g, 'madina')" class="chip chip-amber mt-1">Tayinlanmagan</span>
              <span v-else-if="isSplit(g) && (!g.ellikboshi_makka || !g.ellikboshi_madina)" class="chip chip-amber mt-1">
                {{ g.ellikboshi_makka ? 'Madina' : 'Makka' }} tanlanmagan
              </span>
            </div>

            <!-- SINGLE leader: one select, one save, both cities written together. -->
            <div v-if="!expanded(g)" class="flex flex-1 flex-wrap items-center gap-2">
              <select :value="leaderOf(g)" :disabled="savingId === g.id" class="input flex-1 min-w-[12rem]"
                @change="onAssign(g, 'both', $event)">
                <option value="">— tanlanmagan —</option>
                <option v-for="o in optionsFor(g)" :key="o" :value="o">{{ poolLabel(o) }}</option>
              </select>
              <button type="button" class="btn btn-sm btn-ghost" @click="openSplit(g)">Shahar bo'yicha</button>
            </div>

            <!-- SPLIT: one select per city. Makka first — it is the heavier half. -->
            <div v-else class="flex-1 space-y-2">
              <div v-for="c in CITIES" :key="c.key" class="flex items-center gap-2">
                <span class="w-14 shrink-0 text-xs font-medium text-gray-500">{{ c.label }}</span>
                <select :value="cityLeader(g, c.key)" :disabled="savingId === g.id" class="input flex-1 min-w-0"
                  @change="onAssign(g, c.key, $event)">
                  <option value="">— tanlanmagan —</option>
                  <option v-for="o in optionsFor(g)" :key="o" :value="o">{{ poolLabel(o) }}</option>
                </select>
              </div>
              <div v-if="!isSplit(g)" class="flex justify-end">
                <button type="button" class="btn btn-sm btn-ghost" @click="closeSplit(g)">Bekor qilish</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <BaseModal :open="!!editing" :title="editing ? (editing.name || editing.username) : ''" @close="closeInfo">
      <div class="flex items-center gap-4">
        <div class="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
          <img v-if="form.previewUrl" :src="form.previewUrl" alt="" class="w-full h-full object-cover" />
          <font-awesome-icon v-else icon="user" class="w-8 h-8 text-gray-300" />
        </div>
        <div class="flex flex-col items-start gap-2">
          <button type="button" class="btn btn-secondary btn-sm" :disabled="form.reading" @click="fileEl?.click()">
            <font-awesome-icon icon="image" class="w-3 h-3" />
            {{ form.previewUrl ? 'Rasmni almashtirish' : "Rasm qo'shish" }}
          </button>
          <button v-if="form.previewUrl" type="button" class="btn btn-ghost btn-sm" @click="dropPhoto">
            <font-awesome-icon icon="trash" class="w-3 h-3" />
            Rasmni o'chirish
          </button>
        </div>
        <input ref="fileEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPhoto" />
      </div>
      <div>
        <label class="label">Ma'lumot</label>
        <textarea v-model="form.text" rows="9" class="input resize-y"></textarea>
        <p class="mt-1 text-xs text-right tabular-nums" :class="textOver ? 'text-rose-600' : 'text-gray-400'">
          {{ textLen }} / {{ INFO_LIMIT }}
        </p>
      </div>
      <p v-if="form.error" class="error-text">{{ form.error }}</p>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="closeInfo">Bekor qilish</button>
        <button type="button" class="btn btn-primary" :disabled="form.saving || form.reading || textOver" @click="saveInfo">
          Saqlash
        </button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import BaseModal from '../../../components/BaseModal.vue'
import api from '../../../api'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

interface Ellik {
  id: number; username: string; name: string | null; is_active: boolean
  info_text: string; has_photo: boolean; info_updated_at: string | null
}
// ellikboshi_username is the LEGACY single-leader field, kept as the fallback for a
// group nobody has re-assigned; the two city columns are the assignment (owner,
// 2026-08-16). Migration 041 backfilled both from the legacy one, so on the morning
// after the deploy every group here reads as "one leader, both cities".
interface Grp {
  id: number; title: string | null
  ellikboshi_username: string | null
  ellikboshi_makka: string | null
  ellikboshi_madina: string | null
}

type City = 'makka' | 'madina'
const CITIES: { key: City; label: string }[] = [
  // Makka first: it is the heavier half (0.6), and the reading order should say so.
  { key: 'makka', label: 'Makka' },
  { key: 'madina', label: 'Madina' },
]

const loading = ref(false)
const pool = ref<Ellik[]>([])
const groups = ref<Grp[]>([])

const newUsername = ref('')
const newName = ref('')
const poolBusy = ref(false)
const poolError = ref('')

const search = ref('')
const savingId = ref<number | null>(null)
const savedId = ref<number | null>(null)

/** WHO leads this group in a city — the client-side mirror of the server's
 *  group_leader_for_city: the city column, falling back to the legacy one. */
function cityLeader(g: Grp, c: City) {
  return (c === 'makka' ? g.ellikboshi_makka : g.ellikboshi_madina) || g.ellikboshi_username || ''
}
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
/** Two different people across the two cities — the state the split UI exists for. */
function isSplit(g: Grp) {
  return !same(cityLeader(g, 'makka'), cityLeader(g, 'madina'))
}
/** The one leader, when there is one. Empty on a split group (the card shows both
 *  selects then, so there is nothing for this to be). */
function leaderOf(g: Grp) {
  return isSplit(g) ? '' : cityLeader(g, 'makka')
}

// Groups the user has manually opened for splitting. A group that is ALREADY split is
// always open — that is a fact about the data, not a UI preference, and collapsing it
// would hide one of its two leaders behind a single select that cannot show both.
const opened = ref<Set<number>>(new Set())
function expanded(g: Grp) { return isSplit(g) || opened.value.has(g.id) }
function openSplit(g: Grp) { opened.value = new Set(opened.value).add(g.id) }
function closeSplit(g: Grp) {
  const n = new Set(opened.value); n.delete(g.id); opened.value = n
}

// Unassigned groups first (so the mingboshi sees what still needs a leader).
const filteredGroups = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = q ? groups.value.filter(g => (g.title || '').toLowerCase().includes(q)) : groups.value
  return [...list].sort((a, b) => Number(!!cityLeader(a, 'makka') || !!cityLeader(a, 'madina'))
    - Number(!!cityLeader(b, 'makka') || !!cityLeader(b, 'madina')))
})

function poolLabel(username: string) {
  const e = pool.value.find(x => x.username.toLowerCase() === username.toLowerCase())
  return e?.name ? `${e.name} (${e.username})` : username
}
// Pool usernames + any value this group already carries that isn't in the pool, so a
// leader removed from the list is never silently dropped off the group they still run.
function optionsFor(g: Grp) {
  const opts = pool.value.map(e => e.username)
  for (const u of [g.ellikboshi_makka, g.ellikboshi_madina, g.ellikboshi_username]) {
    if (u && !opts.some(o => same(o, u))) opts.push(u)
  }
  return opts
}

async function loadAll() {
  loading.value = true
  try {
    const [p, gr] = await Promise.all([api.get('/ellikboshilar'), api.get('/groups')])
    pool.value = p.data
    groups.value = gr.data
  } catch {
    pool.value = []
    groups.value = []
  } finally {
    loading.value = false
  }
  loadDelay()
}

// The timer above the cards (owner, 27.11.2026: «в самом верху добавь поле таймера там
// введется время и после этого инфа отправляется»): hours and minutes after the
// assignment; the API keeps it in whole minutes, 1 minute to 7 days.
const DELAY_MAX_H = 7 * 24
const delay = reactive({ h: 0 as number | '', m: 5 as number | '', saved: 5, loaded: false, saving: false })
const delayMinutes = computed(() => {
  const h = delay.h === '' ? 0 : delay.h
  const m = delay.m === '' ? 0 : delay.m
  return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && m >= 0 && m <= 59 ? h * 60 + m : NaN
})
const delayValid = computed(() => delayMinutes.value >= 1 && delayMinutes.value <= DELAY_MAX_H * 60)
const delayDirty = computed(() => delay.loaded && delayMinutes.value !== delay.saved)
const delayInvalidText = computed(() =>
  delay.loaded && delayDirty.value && !delayValid.value ? "Vaqt 1 daqiqadan 7 kungacha bo'lsin" : '')

function showDelay(minutes: number) {
  delay.saved = minutes
  delay.h = Math.floor(minutes / 60)
  delay.m = minutes % 60
}

async function loadDelay() {
  try {
    const { data } = await api.get('/ellikboshilar/intro-delay')
    showDelay(data.delay_minutes)
    delay.loaded = true
  } catch {
    delay.loaded = false
  }
}

async function saveDelay() {
  if (!delayValid.value) return
  delay.saving = true
  try {
    const { data } = await api.put('/ellikboshilar/intro-delay', { delay_minutes: delayMinutes.value })
    showDelay(data.delay_minutes)
    toast.success('Saqlandi')
  } catch (e: any) {
    toast.error(e?.response?.data?.detail || 'Saqlanmadi')
  } finally {
    delay.saving = false
  }
}

async function addToPool() {
  const u = newUsername.value.trim()
  if (!u) return
  poolBusy.value = true
  poolError.value = ''
  try {
    const { data } = await api.post('/ellikboshilar', { username: u, name: newName.value.trim() || null })
    const idx = pool.value.findIndex(x => x.id === data.id)
    if (idx !== -1) pool.value[idx] = data
    else pool.value.push(data)
    newUsername.value = ''
    newName.value = ''
  } catch (e: any) {
    poolError.value = e?.response?.data?.detail || "Qo'shishda xatolik"
  } finally {
    poolBusy.value = false
  }
}

const { confirm } = useConfirm()
const toast = useToast()

async function removeFromPool(e: Ellik) {
  if (!(await confirm({ title: `${e.name || e.username} — o'chirish` }))) return
  poolBusy.value = true
  try {
    await api.delete(`/ellikboshilar/${e.id}`)
    pool.value = pool.value.filter(x => x.id !== e.id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  } finally {
    poolBusy.value = false
  }
}

/** Assign a leader to ONE city, or to both at once from the single-select shape.
 *
 *  All three fields are always sent. The legacy column is kept in step with the Makka
 *  leader (or the Madina one when only that half is filled) so the screens that still
 *  read it — Home, Guruhlar — name somebody who is really on this group rather than
 *  whoever was on it before the split; the bot itself never reads it while a city
 *  column is set. Sending the city fields explicitly also switches OFF the server's
 *  old-dashboard mirror, so assigning one city can never overwrite the other. */
// The §4.2 «reason» picker (Natija bo'yicha / Majburiy / Tashkiliy) that used to sit
// beside the leader select is gone: every group beyond the limit carries the
// coefficient now (owner, 18.09.2026: «эти категории не нужны, убери их»).
async function onAssign(g: Grp, city: City | 'both', event: Event) {
  const username = (event.target as HTMLSelectElement).value
  const makka = city === 'madina' ? cityLeader(g, 'makka') : username
  const madina = city === 'makka' ? cityLeader(g, 'madina') : username
  savingId.value = g.id
  savedId.value = null
  try {
    await api.put(`/groups/${g.id}/location/public`, {
      ellikboshi_makka: makka,
      ellikboshi_madina: madina,
      ellikboshi_username: makka || madina,
    })
    const idx = groups.value.findIndex(x => x.id === g.id)
    if (idx !== -1) {
      groups.value[idx].ellikboshi_makka = makka || null
      groups.value[idx].ellikboshi_madina = madina || null
      groups.value[idx].ellikboshi_username = makka || madina || null
    }
    savedId.value = g.id
    setTimeout(() => { if (savedId.value === g.id) savedId.value = null }, 2000)
  } catch {
    toast.error('Saqlanmadi')
  } finally {
    savingId.value = null
  }
}

// ── «Ellikboshi to'g'risida ma'lumot» ──────────────────────────────────────────────
// Telegram's caption limit, counted the way Telegram counts (an emoji is two): the text
// goes UNDER the photo in one message, so it has to fit there.
const INFO_LIMIT = 1024
// The photo is shrunk here before it is sent — a phone picture is several MB, and
// Telegram shows a group photo at 1280 px anyway.
const MAX_SIDE = 1280

const utf16Len = (s: string) => s.length
const hasInfo = (e: Ellik) => !!(e.info_text || e.has_photo)
const filledCount = computed(() => pool.value.filter(hasInfo).length)

// Photos are behind the login, so an <img src> cannot fetch them: each is read once as
// a blob and shown from an object URL.
const thumbs = ref<Record<number, string>>({})
function setThumb(id: number, url: string | null) {
  const old = thumbs.value[id]
  if (old) URL.revokeObjectURL(old)
  const next = { ...thumbs.value }
  if (url) next[id] = url
  else delete next[id]
  thumbs.value = next
}
async function loadThumbs() {
  await Promise.all(pool.value.filter(e => e.has_photo && !thumbs.value[e.id]).map(async (e) => {
    try {
      const { data } = await api.get(`/ellikboshilar/${e.id}/photo`, { responseType: 'blob' })
      setThumb(e.id, URL.createObjectURL(data))
    } catch { /* no picture shown — the row still works */ }
  }))
}
onBeforeUnmount(() => Object.values(thumbs.value).forEach(u => URL.revokeObjectURL(u)))

const editing = ref<Ellik | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)
const form = reactive({
  text: '',
  previewUrl: '' as string,
  newPhoto: null as { b64: string; blob: Blob } | null,
  removePhoto: false,
  reading: false,
  saving: false,
  error: '',
})
const textLen = computed(() => utf16Len(form.text.trim()))
const textOver = computed(() => textLen.value > INFO_LIMIT)

function openInfo(e: Ellik) {
  editing.value = e
  form.text = e.info_text || ''
  form.previewUrl = thumbs.value[e.id] || ''
  form.newPhoto = null
  form.removePhoto = false
  form.error = ''
}
function dropPreview() {
  // Only a URL made for THIS dialog is ours to revoke; the row thumbnail stays.
  if (form.newPhoto && form.previewUrl) URL.revokeObjectURL(form.previewUrl)
}
function closeInfo() {
  if (form.saving) return
  dropPreview()
  editing.value = null
}

function blobToB64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'                     // a transparent PNG must not turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.88))
}
async function onPhoto(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  form.reading = true
  form.error = ''
  try {
    const blob = await shrink(file)
    const b64 = await blobToB64(blob)
    dropPreview()
    form.newPhoto = { b64, blob }
    form.previewUrl = URL.createObjectURL(blob)
    form.removePhoto = false
  } catch {
    form.error = "Rasm o'qilmadi — JPG yoki PNG tanlang"
  } finally {
    form.reading = false
  }
}
function dropPhoto() {
  dropPreview()
  form.newPhoto = null
  form.previewUrl = ''
  form.removePhoto = true
}

async function saveInfo() {
  const e = editing.value
  if (!e || textOver.value) return
  form.saving = true
  form.error = ''
  try {
    const { data } = await api.put(`/ellikboshilar/${e.id}/info`, {
      info_text: form.text.trim(),
      photo_b64: form.newPhoto?.b64 ?? null,
      photo_mime: form.newPhoto ? 'image/jpeg' : null,
      remove_photo: form.removePhoto,
    })
    const idx = pool.value.findIndex(x => x.id === e.id)
    if (idx !== -1) pool.value[idx] = data
    if (form.newPhoto) setThumb(e.id, URL.createObjectURL(form.newPhoto.blob))
    else if (!data.has_photo) setThumb(e.id, null)
    dropPreview()
    editing.value = null
    toast.success('Saqlandi')
  } catch (err: any) {
    form.error = err?.response?.data?.detail || 'Saqlanmadi'
  } finally {
    form.saving = false
  }
}

onMounted(async () => {
  await loadAll()
  loadThumbs()
})
</script>

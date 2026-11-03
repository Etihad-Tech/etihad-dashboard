<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Bilimlar bazasi</h1>
        <button class="btn btn-primary" @click="openAdd">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Qo'shish
        </button>
      </div>

      <!-- Scope filters mirror the BOT's own rule: picking a city / hotel shows the
           entries a group THERE can receive (umumiy qatorlar + shu scope'ga
           biriktirilganlari) — i.e. exactly the bot's candidate pool. -->
      <div v-if="!loading && entries.length" class="flex flex-wrap items-center gap-2">
        <div class="seg">
          <button
            v-for="c in [{ v: '', label: 'Barchasi' }, { v: 'makka', label: 'Makka' }, { v: 'madina', label: 'Madina' }]"
            :key="c.v"
            class="seg-btn"
            :class="{ 'seg-btn-on': cityFilter === c.v }"
            @click="cityFilter = c.v"
          >{{ c.label }}</button>
        </div>
        <select v-model="hotelFilter" class="input w-auto max-w-[14rem]">
          <option value="">Barcha mehmonxonalar</option>
          <option v-for="h in hotelOptions()" :key="h" :value="h">{{ h }}</option>
        </select>
        <div class="ml-auto flex items-center gap-1">
          <button class="btn btn-sm btn-ghost" @click="setAllOpen(true)">Yoyish</button>
          <button class="btn btn-sm btn-ghost" @click="setAllOpen(false)">Yig'ish</button>
        </div>
      </div>

      <div v-if="!loading && entries.length" class="flex flex-wrap items-center gap-1.5">
        <button
          class="chip"
          :class="categoryFilter === '' ? 'chip-amber' : 'chip-gray hover:bg-gray-200'"
          @click="categoryFilter = ''"
        >Barchasi · {{ scoped.length }}</button>
        <button
          v-for="c in categories"
          :key="c.name"
          class="chip"
          :class="categoryFilter === c.name ? 'chip-amber' : 'chip-gray hover:bg-gray-200'"
          @click="categoryFilter = c.name"
        >{{ c.name }} · {{ c.count }}</button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="entries.length === 0" class="card empty">Savollar yo'q</div>

      <div v-else class="space-y-3">
        <div v-for="group in grouped" :key="group.category" class="card overflow-hidden">
          <!-- category header (tap to open/close) -->
          <button
            class="w-full flex items-center gap-2.5 px-4 h-12 text-left hover:bg-gray-50 transition-colors"
            @click="toggleCat(group.category)"
          >
            <font-awesome-icon :icon="isCatOpen(group.category) ? 'chevron-down' : 'chevron-right'" class="w-3 h-3 text-gray-400 shrink-0" />
            <span class="section-title">{{ group.category }}</span>
            <span class="chip chip-gray">{{ group.count }}</span>
          </button>

          <div v-if="isCatOpen(group.category)" class="border-t border-gray-100 divide-y divide-gray-100">
            <template v-for="sub in group.subs" :key="sub.name || '__loose__'">
              <!-- entries sitting directly under the category (no sub-group) -->
              <template v-if="!sub.name">
                <QaEntryCard v-for="q in sub.items" :key="q.id" :q="q" @toggle="toggleActive" @edit="openEdit" @delete="askDelete" />
              </template>
              <!-- a sub-category (tap to open/close) -->
              <div v-else>
                <button
                  class="w-full flex items-center gap-2.5 pl-8 pr-4 h-10 text-left bg-gray-50/70 hover:bg-gray-100 transition-colors"
                  @click="toggleSub(group.category, sub.name)"
                >
                  <font-awesome-icon :icon="isSubOpen(group.category, sub.name) ? 'chevron-down' : 'chevron-right'" class="w-2.5 h-2.5 text-gray-400 shrink-0" />
                  <span class="text-sm font-medium text-gray-700">{{ sub.name }}</span>
                  <span class="text-xs text-gray-400">{{ sub.items.length }}</span>
                </button>
                <div v-if="isSubOpen(group.category, sub.name)" class="divide-y divide-gray-100 border-t border-gray-100 pl-4">
                  <QaEntryCard v-for="q in sub.items" :key="q.id" :q="q" @toggle="toggleActive" @edit="openEdit" @delete="askDelete" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="modalEditId ? 'Tahrirlash' : 'Yangi savol'" @close="closeModal">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="label">Kategoriya</label>
          <input v-model="form.category" type="text" list="qa-cat-list" placeholder="Aviatsiya" class="input" />
          <datalist id="qa-cat-list"><option v-for="c in allCategories" :key="c" :value="c" /></datalist>
        </div>
        <div>
          <label class="label">Kichik bo'lim</label>
          <input v-model="form.subcategory" type="text" list="qa-sub-list" placeholder="Bilet, Bagaj" class="input" />
          <datalist id="qa-sub-list"><option v-for="s in allSubcategories" :key="s" :value="s" /></datalist>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="label">Mehmonxona turi</label>
          <select v-model="form.tier" class="input">
            <option value="">Barchasi</option>
            <option value="comfort">Komfort</option>
            <option value="premium">Premium / Lux</option>
          </select>
        </div>
        <div>
          <label class="label">Mehmonxona</label>
          <select v-model="form.hotel" class="input">
            <option value="">Barchasi</option>
            <option v-for="h in hotelOptions(form.hotel)" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
        <div>
          <label class="label">Shahar</label>
          <select v-model="form.city" class="input">
            <option value="">Barchasi</option>
            <option value="makka">Makka</option>
            <option value="madina">Madina</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label">Savol</label>
        <textarea v-model="form.question" rows="2" class="input"></textarea>
      </div>
      <div>
        <label class="label">Javob</label>
        <textarea v-model="form.answer" rows="4" class="input"></textarea>
      </div>
      <div>
        <label class="label">Kalit so'zlar</label>
        <input v-model="form.keywords" type="text" placeholder="viza, visa, виза" class="input" />
      </div>
      <div>
        <label class="label">Mas'ul xodim</label>
        <input v-model="form.staff_username" type="text" placeholder="@username" class="input" />
      </div>
      <p v-if="formError" class="error-text">{{ formError }}</p>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="!form.question.trim() || !form.answer.trim() || saving" @click="saveModal">
          {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import BaseModal from '../../../components/BaseModal.vue'
import QaEntryCard from '../components/QaEntryCard.vue'
import api from '../../../api'
import { useHotelsStore } from '../../../stores/hotels'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

const { confirm } = useConfirm()
const toast = useToast()

interface Qa {
  id: number
  category: string | null
  subcategory: string | null
  question: string
  answer: string
  keywords: string | null
  tier: string | null
  staff_username: string | null
  hotel: string | null
  city: string | null
  is_active: boolean
}

// Dashboard-managed hotel list (Mehmonxonalar page). hotelOptions(current) keeps
// the entry's already-saved hotel selectable even if it was later removed.
const hotelsStore = useHotelsStore()
const hotelOptions = (current?: string | null) => hotelsStore.optionsFor(current)

const entries = ref<Qa[]>([])
const loading = ref(false)
const saving = ref(false)
const categoryFilter = ref('')
const cityFilter = ref('')
const hotelFilter = ref('')

// The entries a group in the picked city / hotel CAN receive — generic (NULL-scope)
// rows plus the rows scoped to that city/hotel. Same rule the bot's find_qa applies,
// so this view answers "what does a Saja group actually see".
const scoped = computed(() => entries.value.filter(q =>
  (!cityFilter.value || !q.city || q.city === cityFilter.value)
  && (!hotelFilter.value || !q.hotel || q.hotel === hotelFilter.value)
))

// Distinct categories with counts, for the filter chips ('Boshqa' = no category).
const categories = computed(() => {
  const map: Record<string, number> = {}
  for (const q of scoped.value) {
    const key = q.category || 'Boshqa'
    map[key] = (map[key] || 0) + 1
  }
  return Object.keys(map).sort().map(name => ({ name, count: map[name] ?? 0 }))
})

// Two-level tree: category -> [ {name:null = loose entries}, {name:sub, items}, ... ].
const grouped = computed(() => {
  const cats: Record<string, { subs: Record<string, Qa[]>; loose: Qa[] }> = {}
  for (const q of scoped.value) {
    const cat = q.category || 'Boshqa'
    if (categoryFilter.value && cat !== categoryFilter.value) continue
    const c = (cats[cat] ||= { subs: {}, loose: [] })
    const sub = (q.subcategory || '').trim()
    if (sub) (c.subs[sub] ||= []).push(q)
    else c.loose.push(q)
  }
  return Object.keys(cats).sort().map(category => {
    const c = cats[category]
    const subs = Object.keys(c.subs).sort().map(name => ({ name: name as string | null, items: c.subs[name] }))
    // loose (no-subcategory) entries lead, as a nameless group; then the sub-categories
    const groups = c.loose.length ? [{ name: null as string | null, items: c.loose }, ...subs] : subs
    const count = c.loose.length + subs.reduce((n, s) => n + s.items.length, 0)
    return { category, subs: groups, count }
  })
})

// Distinct existing names, for the form datalists (reuse instead of retyping -> tidy).
const allCategories = computed(() => [...new Set(entries.value.map(q => q.category).filter(Boolean) as string[])].sort())
const allSubcategories = computed(() => [...new Set(entries.value.map(q => q.subcategory).filter(Boolean) as string[])].sort())

// Collapse state — everything starts collapsed (compact); counts stay visible so
// nothing is hidden without a trace.
const openCat = reactive<Record<string, boolean>>({})
const openSub = reactive<Record<string, boolean>>({})
const subKey = (cat: string, sub: string) => `${cat}:::${sub}`
const isCatOpen = (c: string) => !!openCat[c]
const isSubOpen = (c: string, s: string) => !!openSub[subKey(c, s)]
const toggleCat = (c: string) => { openCat[c] = !openCat[c] }
const toggleSub = (c: string, s: string) => { openSub[subKey(c, s)] = !openSub[subKey(c, s)] }
function setAllOpen(v: boolean) {
  for (const g of grouped.value) {
    openCat[g.category] = v
    for (const s of g.subs) if (s.name) openSub[subKey(g.category, s.name)] = v
  }
}
// Picking a category chip opens that category so its content is visible.
watch(categoryFilter, v => { if (v) openCat[v] = true })

const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')
const form = ref({ category: '', subcategory: '', question: '', answer: '', keywords: '', tier: '', staff_username: '', hotel: '', city: '' })

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { category: '', subcategory: '', question: '', answer: '', keywords: '', tier: '', staff_username: '', hotel: '', city: '' }
  modalOpen.value = true
}

function openEdit(q: Qa) {
  modalEditId.value = q.id
  formError.value = ''
  form.value = { category: q.category || '', subcategory: q.subcategory || '', question: q.question, answer: q.answer, keywords: q.keywords || '', tier: q.tier || '', staff_username: q.staff_username || '', hotel: q.hotel || '', city: q.city || '' }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalEditId.value = null
}

async function saveModal() {
  if (!form.value.question.trim() || !form.value.answer.trim()) return
  saving.value = true
  formError.value = ''
  // Optional fields go as "" (not null): on PUT the server reads null as "field
  // not sent — don't touch", so `|| null` made CLEARING a scope (hotel/tier/...)
  // silently not save. The server maps "" -> NULL itself.
  const payload = {
    category: form.value.category.trim(),
    subcategory: form.value.subcategory.trim(),
    question: form.value.question.trim(),
    answer: form.value.answer.trim(),
    keywords: form.value.keywords.trim(),
    tier: form.value.tier,
    staff_username: form.value.staff_username.trim(),
    hotel: form.value.hotel,
    city: form.value.city,
  }
  try {
    if (modalEditId.value) {
      const { data } = await api.put(`/qa/${modalEditId.value}`, payload)
      const idx = entries.value.findIndex(q => q.id === modalEditId.value)
      if (idx !== -1) entries.value[idx] = data
    } else {
      const { data } = await api.post('/qa', payload)
      entries.value.push(data)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch {
    formError.value = 'Saqlanmadi'
  } finally {
    saving.value = false
  }
}

async function toggleActive(q: Qa) {
  try {
    const { data } = await api.put(`/qa/${q.id}`, { is_active: !q.is_active })
    const idx = entries.value.findIndex(x => x.id === q.id)
    if (idx !== -1) entries.value[idx] = data
  } catch { /* ignore */ }
}

async function askDelete(id: number) {
  if (!(await confirm({ title: "Savolni o'chirish" }))) return
  try {
    await api.delete(`/qa/${id}`)
    entries.value = entries.value.filter(q => q.id !== id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  }
}

async function loadQa() {
  loading.value = true
  try {
    const { data } = await api.get('/qa')
    entries.value = data
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => { hotelsStore.fetch(); loadQa() })
</script>


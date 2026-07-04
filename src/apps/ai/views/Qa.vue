<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Bilimlar bazasi (QA)</h2>
          <p class="text-sm text-gray-500 mt-1">Bot tez-tez so'raladigan savollarga shu javoblardan foydalanadi</p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi savol
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Foydalanuvchi savol berganda bot mos keladigan yozuvni topadi va undan <b>faqat ma'lumot</b>
          sifatida foydalanadi. Javob doimo foydalanuvchining <b>o'z tilida</b> (lotin / kirill / rus)
          yoziladi — yo'l xaritasi (roadmap) esa asosiy manba bo'lib qoladi. "Kalit so'zlar" qidiruvni
          yaxshilash uchun (turli yozuvlarda yozsangiz, mosligi oshadi).
        </p>
      </div>

      <div v-if="!loading && entries.length" class="flex flex-wrap items-center gap-2 animate-fade-up">
        <span class="text-xs font-medium text-gray-400 mr-1">Kategoriya:</span>
        <button
          @click="categoryFilter = ''"
          class="px-3 py-1.5 rounded-2xl text-xs font-medium border transition-colors"
          :class="categoryFilter === '' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
        >Barchasi ({{ entries.length }})</button>
        <button
          v-for="c in categories"
          :key="c.name"
          @click="categoryFilter = c.name"
          class="px-3 py-1.5 rounded-2xl text-xs font-medium border transition-colors"
          :class="categoryFilter === c.name ? 'bg-amber-50 text-amber-700 border-amber-300' : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
        >{{ c.name }} ({{ c.count }})</button>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="entries.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 30ms">
        <font-awesome-icon icon="circle-question" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Hozircha savollar yo'q</p>
      </div>

      <div v-else class="space-y-3">
        <div class="flex items-center justify-end gap-1">
          <button @click="setAllOpen(true)" class="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">Barchasini yoyish</button>
          <button @click="setAllOpen(false)" class="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">Barchasini yig'ish</button>
        </div>

        <div
          v-for="(group, gi) in grouped"
          :key="group.category"
          class="bg-white rounded-3xl border border-gray-200 overflow-hidden animate-fade-up"
          :style="{ animationDelay: `${(gi + 1) * 30}ms` }"
        >
          <!-- category header (tap +/- to open/close) -->
          <button
            @click="toggleCat(group.category)"
            class="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span
              class="w-6 h-6 flex items-center justify-center rounded-lg border text-base font-semibold leading-none shrink-0 transition-colors"
              :class="isCatOpen(group.category) ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-gray-200 text-gray-400'"
            >{{ isCatOpen(group.category) ? '−' : '+' }}</span>
            <font-awesome-icon icon="circle-question" class="w-4 h-4 text-amber-600 shrink-0" />
            <h3 class="text-base font-semibold text-gray-900">{{ group.category }}</h3>
            <span class="text-xs text-gray-400">({{ group.count }})</span>
          </button>

          <div v-if="isCatOpen(group.category)" class="px-3 pb-3 space-y-2">
            <template v-for="sub in group.subs" :key="sub.name || '__loose__'">
              <!-- entries sitting directly under the category (no sub-group) -->
              <div v-if="!sub.name" class="space-y-2">
                <QaEntryCard v-for="q in sub.items" :key="q.id" :q="q" @toggle="toggleActive" @edit="openEdit" @delete="askDelete" />
              </div>
              <!-- a sub-category (tap +/- to open/close) -->
              <div v-else class="rounded-2xl border border-gray-100 bg-gray-50/60 overflow-hidden">
                <button
                  @click="toggleSub(group.category, sub.name)"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-100 transition-colors"
                >
                  <span
                    class="w-5 h-5 flex items-center justify-center rounded-md border text-sm font-semibold leading-none shrink-0 transition-colors"
                    :class="isSubOpen(group.category, sub.name) ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-gray-200 bg-white text-gray-400'"
                  >{{ isSubOpen(group.category, sub.name) ? '−' : '+' }}</span>
                  <span class="text-sm font-medium text-gray-700">{{ sub.name }}</span>
                  <span class="text-xs text-gray-400">({{ sub.items.length }})</span>
                </button>
                <div v-if="isSubOpen(group.category, sub.name)" class="px-2 pb-2 space-y-2">
                  <QaEntryCard v-for="q in sub.items" :key="q.id" :q="q" @toggle="toggleActive" @edit="openEdit" @delete="askDelete" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="confirmDeleteId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="cancelDelete">
        <div class="bg-white rounded-3xl w-full max-w-xs border border-gray-200 shadow-xl mx-4 p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <font-awesome-icon icon="trash" class="w-5 h-5 text-red-500" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">Savolni o'chirish</h3>
          <p class="text-sm text-gray-500 mb-5">Bu amalni ortga qaytarib bo'lmaydi</p>
          <div class="flex justify-center gap-3">
            <button @click="cancelDelete" class="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
            <button @click="confirmDelete" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-2xl transition-colors">O'chirish</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Savolni tahrirlash' : 'Yangi savol' }}</h3>
          </div>
          <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Kategoriya (ixtiyoriy)</label>
                <input v-model="form.category" type="text" list="qa-cat-list" placeholder="Masalan: Aviatsiya"
                  class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
                <datalist id="qa-cat-list"><option v-for="c in allCategories" :key="c" :value="c" /></datalist>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Kichik bo'lim (ixtiyoriy)</label>
                <input v-model="form.subcategory" type="text" list="qa-sub-list" placeholder="Masalan: Bilet, Bagaj"
                  class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
                <datalist id="qa-sub-list"><option v-for="s in allSubcategories" :key="s" :value="s" /></datalist>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Mehmonxona turi (tier)</label>
              <select v-model="form.tier"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                <option value="">Barcha mehmonxonalar</option>
                <option value="comfort">Komfort</option>
                <option value="premium">Premium / Lux</option>
              </select>
              <p class="text-[11px] text-gray-400 mt-1">Faqat shu turdagi mehmonxonadagi guruhlarga ko'rsatiladi (suv, tozalash kabi farqli javoblar uchun).</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Mehmonxona (ixtiyoriy)</label>
              <select v-model="form.hotel"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                <option value="">Barcha mehmonxonalar</option>
                <option v-for="h in hotelOptions(form.hotel)" :key="h" :value="h">{{ h }}</option>
              </select>
              <p class="text-[11px] text-gray-400 mt-1">Faqat shu mehmonxonadagi guruhlarga ko'rsatiladi (WiFi, qavatlar, ovqat vaqtlari kabi mehmonxonaga xos javoblar uchun). Bo'sh = barcha mehmonxonalar.</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Savol</label>
              <textarea v-model="form.question" rows="2" placeholder="Masalan: Viza qancha vaqtda chiqadi?"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Javob (ma'lumot)</label>
              <textarea v-model="form.answer" rows="4" placeholder="Bot shu ma'lumotdan foydalanib, foydalanuvchi tilida javob beradi"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Kalit so'zlar (vergul bilan)</label>
              <input v-model="form.keywords" type="text" placeholder="viza, visa, виза, viza chiqadi"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Mas'ul xodim (@username)</label>
              <input v-model="form.staff_username" type="text" placeholder="Masalan: @Sabir_S7"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
              <p class="text-[11px] text-gray-400 mt-1">Shu mavzu uchun mas'ul xodim. Bot bu savolga javob berganda aynan shu xodimni @belgilab, unga va guruh ellikboshisiga shaxsiy xabar (DM) yuboradi. Bo'sh qoldirilsa — umumiy ishchi guruh tanlanadi.</p>
            </div>
            <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
          </div>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
            <button @click="saveModal" :disabled="!form.question.trim() || !form.answer.trim() || saving"
              class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import QaEntryCard from '../components/QaEntryCard.vue'
import api from '../../../api'
import { useHotelsStore } from '../../../stores/hotels'

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

// Distinct categories with counts, for the filter chips ('Boshqa' = no category).
const categories = computed(() => {
  const map: Record<string, number> = {}
  for (const q of entries.value) {
    const key = q.category || 'Boshqa'
    map[key] = (map[key] || 0) + 1
  }
  return Object.keys(map).sort().map(name => ({ name, count: map[name] ?? 0 }))
})

// Two-level tree: category -> [ {name:null = loose entries}, {name:sub, items}, ... ].
const grouped = computed(() => {
  const cats: Record<string, { subs: Record<string, Qa[]>; loose: Qa[] }> = {}
  for (const q of entries.value) {
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
const form = ref({ category: '', subcategory: '', question: '', answer: '', keywords: '', tier: '', staff_username: '', hotel: '' })

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { category: '', subcategory: '', question: '', answer: '', keywords: '', tier: '', staff_username: '', hotel: '' }
  modalOpen.value = true
}

function openEdit(q: Qa) {
  modalEditId.value = q.id
  formError.value = ''
  form.value = { category: q.category || '', subcategory: q.subcategory || '', question: q.question, answer: q.answer, keywords: q.keywords || '', tier: q.tier || '', staff_username: q.staff_username || '', hotel: q.hotel || '' }
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
  const payload = {
    category: form.value.category.trim() || null,
    subcategory: form.value.subcategory.trim() || null,
    question: form.value.question.trim(),
    answer: form.value.answer.trim(),
    keywords: form.value.keywords.trim() || null,
    tier: form.value.tier || null,
    staff_username: form.value.staff_username.trim() || null,
    hotel: form.value.hotel || null,
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
    closeModal()
  } catch {
    formError.value = 'Saqlashda xatolik yuz berdi'
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

const confirmDeleteId = ref<number | null>(null)
function askDelete(id: number) { confirmDeleteId.value = id }
function cancelDelete() { confirmDeleteId.value = null }

async function confirmDelete() {
  if (!confirmDeleteId.value) return
  try {
    await api.delete(`/qa/${confirmDeleteId.value}`)
    entries.value = entries.value.filter(q => q.id !== confirmDeleteId.value)
  } catch { /* ignore */ }
  finally { confirmDeleteId.value = null }
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

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>

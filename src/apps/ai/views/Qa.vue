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

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="entries.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 30ms">
        <font-awesome-icon icon="circle-question" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Hozircha savollar yo'q</p>
      </div>

      <div v-else class="space-y-8">
        <div v-for="(group, gi) in grouped" :key="group.category" class="animate-fade-up" :style="{ animationDelay: `${(gi + 1) * 30}ms` }">
          <div class="flex items-center gap-2 mb-3">
            <font-awesome-icon icon="circle-question" class="w-4 h-4 text-amber-600" />
            <h3 class="text-base font-semibold text-gray-900">{{ group.category || 'Boshqa' }}</h3>
            <span class="text-xs text-gray-400">({{ group.items.length }})</span>
          </div>

          <div class="space-y-3">
            <div
              v-for="q in group.items"
              :key="q.id"
              class="bg-white rounded-3xl border p-5 flex items-start justify-between gap-4 transition-all"
              :class="q.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900">
                  {{ q.question }}
                  <span v-if="q.tier"
                    class="ml-1.5 align-middle inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    :class="q.tier === 'comfort' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'">
                    {{ q.tier === 'comfort' ? 'Komfort (Taj)' : 'Premium/Lux' }}
                  </span>
                </p>
                <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ q.answer }}</p>
                <p v-if="q.keywords" class="text-[11px] text-gray-400 mt-1.5 truncate">
                  <font-awesome-icon icon="tag" class="w-3 h-3 mr-1" />{{ q.keywords }}
                </p>
                <p v-if="q.staff_username" class="text-[11px] text-emerald-600 mt-1 font-medium">
                  👤 {{ q.staff_username }}
                </p>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  @click="toggleActive(q)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                  :class="q.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
                >
                  <font-awesome-icon :icon="q.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
                  {{ q.is_active ? 'Faol' : 'Nofaol' }}
                </button>
                <button
                  @click="openEdit(q)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <font-awesome-icon icon="pen" class="w-3 h-3" />
                  Tahrirlash
                </button>
                <button
                  @click="askDelete(q.id)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <font-awesome-icon icon="trash" class="w-3 h-3" />
                  O'chirish
                </button>
              </div>
            </div>
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
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Kategoriya (ixtiyoriy)</label>
              <input v-model="form.category" type="text" placeholder="Masalan: Viza, Ehrom, Ayollar"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Mehmonxona turi (tier)</label>
              <select v-model="form.tier"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                <option value="">Barcha mehmonxonalar</option>
                <option value="comfort">Komfort (Taj Park)</option>
                <option value="premium">Premium / Lux</option>
              </select>
              <p class="text-[11px] text-gray-400 mt-1">Faqat shu turdagi mehmonxonadagi guruhlarga ko'rsatiladi (suv, tozalash kabi farqli javoblar uchun).</p>
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
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'

interface Qa {
  id: number
  category: string | null
  question: string
  answer: string
  keywords: string | null
  tier: string | null
  staff_username: string | null
  is_active: boolean
}

const entries = ref<Qa[]>([])
const loading = ref(false)
const saving = ref(false)

const grouped = computed(() => {
  const map: Record<string, Qa[]> = {}
  for (const q of entries.value) {
    const key = q.category || 'Boshqa'
    ;(map[key] ||= []).push(q)
  }
  return Object.keys(map).sort().map(category => ({ category, items: map[category] ?? [] }))
})

const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')
const form = ref({ category: '', question: '', answer: '', keywords: '', tier: '', staff_username: '' })

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = { category: '', question: '', answer: '', keywords: '', tier: '', staff_username: '' }
  modalOpen.value = true
}

function openEdit(q: Qa) {
  modalEditId.value = q.id
  formError.value = ''
  form.value = { category: q.category || '', question: q.question, answer: q.answer, keywords: q.keywords || '', tier: q.tier || '', staff_username: q.staff_username || '' }
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
    question: form.value.question.trim(),
    answer: form.value.answer.trim(),
    keywords: form.value.keywords.trim() || null,
    tier: form.value.tier || null,
    staff_username: form.value.staff_username.trim() || null,
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

onMounted(loadQa)
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

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4 animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Maqtov shablonlari</h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Ziyoratchi rahmat aytganda bot shu shablonlardan javob beradi — safarning oxirgi 2 kuni
            (oxirgi to'liq kun va uchib ketish kuni) hamda safar tugagandan keyingi kunlarda.
            Safar davomida esa qisqa umumiy javob yuboradi.
          </p>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            <b>Har bir shablon o'z tilida ishlaydi.</b> Bot ziyoratchiga faqat <u>u yozgan tildagi</u>
            shablon bilan javob beradi — shablon tayyor matn, uni tarjima qilib bo'lmaydi.
            Til shablon matnining o'zidan aniqlanadi. Ziyoratchi tilida shablon bo'lmasa,
            unga o'sha tildagi qisqa javob boradi (rahmat javobsiz qolmaydi).
          </p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi shablon
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="templates.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 30ms">
        <font-awesome-icon icon="file-lines" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Hozircha maqtov shablonlari yo'q</p>
      </div>

      <div v-else-if="missingScripts.length" class="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 animate-fade-up">
        <p class="text-sm text-amber-800">
          <font-awesome-icon icon="triangle-exclamation" class="w-3.5 h-3.5 mr-1" />
          Bu tillarda faol shablon yo'q:
          <b>{{ missingScripts.map(scriptLabel).join(', ') }}</b>.
          Shu tilda yozgan ziyoratchiga safar oxirida uzun shablon emas, qisqa javob boradi.
        </p>
      </div>

      <div v-if="templates.length" class="space-y-3">
        <div
          v-for="(tpl, i) in templates"
          :key="tpl.id"
          class="bg-white rounded-3xl border p-5 transition-all animate-fade-up"
          :class="tpl.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <span class="inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded-lg text-[11px] font-medium"
            :class="scriptClass(tpl.script)">
            <font-awesome-icon icon="language" class="w-3 h-3" />
            {{ scriptLabel(tpl.script) }}
          </span>
          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ tpl.text }}</p>
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <div class="flex items-center gap-1">
              <button
                @click="toggleActive(tpl)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
                :class="tpl.is_active
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-gray-400 hover:bg-gray-50'"
              >
                <font-awesome-icon :icon="tpl.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
                {{ tpl.is_active ? 'Faol' : 'Nofaol' }}
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="openEdit(tpl)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <font-awesome-icon icon="pen" class="w-3 h-3" />
                Tahrirlash
              </button>
              <button
                @click="askDelete(tpl.id)"
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

    <Transition name="modal">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Shablonni tahrirlash' : 'Yangi shablon' }}</h3>
          </div>
          <div class="p-6">
            <textarea
              v-model="modalText"
              rows="4"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
              placeholder="Shablon matnini yozing..."
            ></textarea>
            <p class="text-[11px] text-gray-400 mt-2 leading-snug">
              Til matnning o'zidan aniqlanadi — alohida tanlash shart emas. Rus tilidagi
              ziyoratchilar uchun alohida shablonni rus tilida yozib qo'shing.
            </p>
          </div>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              @click="saveModal"
              :disabled="!modalText.trim() || saving"
              class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors"
            >
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
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

interface Template {
  id: number
  text: string
  is_active: boolean
  // Which language the text is WRITTEN in, as the bot reads it: it only answers a
  // pilgrim with a shablon in the language that pilgrim wrote in.
  script: 'latin' | 'uzbek_cyrillic' | 'russian'
  created_at: string | null
}

const SCRIPTS = ['latin', 'uzbek_cyrillic', 'russian'] as const

const SCRIPT_LABELS: Record<string, string> = {
  latin: "O'zbekcha (lotin)",
  uzbek_cyrillic: 'Ўзбекча (кирилл)',
  russian: 'Русский',
}

const SCRIPT_CLASSES: Record<string, string> = {
  latin: 'bg-sky-50 text-sky-700',
  uzbek_cyrillic: 'bg-emerald-50 text-emerald-700',
  russian: 'bg-violet-50 text-violet-700',
}

const scriptLabel = (s: string) => SCRIPT_LABELS[s] || s
const scriptClass = (s: string) => SCRIPT_CLASSES[s] || 'bg-gray-100 text-gray-500'

const templates = ref<Template[]>([])
const loading = ref(false)
const saving = ref(false)

/** Languages with no ACTIVE shablon. A pilgrim writing in one of these gets the short
 *  generic reply at the end of the trip instead of the company's closing message — which
 *  is the right outcome, but it is a gap the office should be able to see and close. */
const missingScripts = computed(() =>
  SCRIPTS.filter(s => !templates.value.some(t => t.is_active && t.script === s)),
)

const modalOpen = ref(false)
const modalText = ref('')
const modalEditId = ref<number | null>(null)

function openAdd() {
  modalEditId.value = null
  modalText.value = ''
  modalOpen.value = true
}

function openEdit(tpl: Template) {
  modalEditId.value = tpl.id
  modalText.value = tpl.text
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalText.value = ''
  modalEditId.value = null
}

async function saveModal() {
  if (!modalText.value.trim()) return
  saving.value = true
  try {
    if (modalEditId.value) {
      const { data } = await api.put(`/templates/${modalEditId.value}`, { text: modalText.value.trim() })
      const idx = templates.value.findIndex(t => t.id === modalEditId.value)
      if (idx !== -1) templates.value[idx] = data
    } else {
      const { data } = await api.post('/templates', { text: modalText.value.trim() })
      templates.value.unshift(data)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch {
    toast.error('Saqlashda xatolik yuz berdi')
  }
  finally { saving.value = false }
}

async function loadTemplates() {
  loading.value = true
  try {
    const { data } = await api.get('/templates')
    templates.value = data
  } catch {
    templates.value = []
  } finally {
    loading.value = false
  }
}

async function toggleActive(tpl: Template) {
  try {
    const { data } = await api.put(`/templates/${tpl.id}`, { is_active: !tpl.is_active })
    const idx = templates.value.findIndex(t => t.id === tpl.id)
    if (idx !== -1) templates.value[idx] = data
  } catch { /* ignore */ }
}

const { confirm } = useConfirm()
const toast = useToast()

async function askDelete(id: number) {
  if (!(await confirm({ title: "Shablonni o'chirish" }))) return
  try {
    await api.delete(`/templates/${id}`)
    templates.value = templates.value.filter(t => t.id !== id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirishda xatolik yuz berdi")
  }
}

onMounted(loadTemplates)
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

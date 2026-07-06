<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Mehmonxonalar</h2>
          <p class="text-sm text-gray-500 mt-1">Guruhlar va Bilimlar bazasidagi mehmonxona ro'yxati shu yerdan boshqariladi</p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Yangi mehmonxona
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday ishlaydi</p>
        <p class="text-amber-700">
          Bu yerga qo'shilgan mehmonxonalar <b>Guruhlar</b> sahifasidagi (Makka / Madina / Jidda) va
          <b>Bilimlar bazasi</b> dagi mehmonxona ro'yxatlarida tanlash uchun chiqadi. Nomini aniq yozing —
          guruhga biriktirilgan nom va shu mehmonxonaga oid savol-javoblar ayni shu nom bo'yicha bog'lanadi.
        </p>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="store.items.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up">
        <font-awesome-icon icon="hotel" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Ro'yxat bo'sh — birinchi mehmonxonani qo'shing</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(h, i) in store.items"
          :key="h.id"
          class="bg-white rounded-3xl border p-4 flex items-center justify-between gap-4 transition-all animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
          :class="h.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
              <font-awesome-icon icon="hotel" class="w-4 h-4 text-amber-600" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ h.name }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[11px] px-1.5 py-0.5 rounded-lg bg-sky-50 text-sky-600">{{ cityLabel(h.city) }}</span>
                <span v-if="h.default_tier" class="text-[11px] px-1.5 py-0.5 rounded-lg bg-violet-50 text-violet-600">{{ h.default_tier }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="toggleActive(h)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
              :class="h.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
            >
              <font-awesome-icon :icon="h.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
              {{ h.is_active ? 'Faol' : 'Nofaol' }}
            </button>
            <button
              @click="openEdit(h)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <font-awesome-icon icon="pen" class="w-3 h-3" />
              Tahrirlash
            </button>
            <button
              @click="askDelete(h.id)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <font-awesome-icon icon="trash" class="w-3 h-3" />
              O'chirish
            </button>
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-xl mx-4">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900">{{ modalEditId ? 'Mehmonxonani tahrirlash' : 'Yangi mehmonxona' }}</h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Mehmonxona nomi</label>
              <input v-model="form.name" type="text" placeholder="Masalan: Fairmont" @keyup.enter="saveModal"
                class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Shahar</label>
                <select v-model="form.city"
                  class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option value="">—</option>
                  <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
                <p class="text-[11px] text-gray-400 mt-1">Guruh roʻyxatida shu shahar uchun chiqadi.</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Tarif (ixtiyoriy)</label>
                <select v-model="form.default_tier"
                  class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  <option value="">—</option>
                  <option value="premium">premium</option>
                  <option value="comfort">comfort</option>
                </select>
              </div>
            </div>

            <!-- Structured facts the bot answers automatically (verbatim). Blank = the
                 bot stays silent on that item rather than guessing. -->
            <div class="pt-3 border-t border-gray-100">
              <p class="text-xs font-semibold text-gray-600 mb-2">Qavatlar</p>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label :class="labelCls">Masjid qavati</label>
                  <input v-model="form.mosque_floor" type="text" placeholder="2" :class="inputCls" />
                </div>
                <div>
                  <label :class="labelCls">Oshxona qavati</label>
                  <input v-model="form.dining_floor" type="text" placeholder="1" :class="inputCls" />
                </div>
                <div>
                  <label :class="labelCls">Loby (ishchi guruh)</label>
                  <input v-model="form.lobby_floor" type="text" placeholder="0" :class="inputCls" />
                </div>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-gray-600 mb-2">Ovqat vaqtlari</p>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label :class="labelCls">Nonushta</label>
                  <input v-model="form.breakfast_time" type="text" placeholder="07:00-09:00" :class="inputCls" />
                </div>
                <div>
                  <label :class="labelCls">Tushlik</label>
                  <input v-model="form.lunch_time" type="text" placeholder="13:00-14:30" :class="inputCls" />
                </div>
                <div>
                  <label :class="labelCls">Kechki ovqat</label>
                  <input v-model="form.dinner_time" type="text" placeholder="19:00-21:00" :class="inputCls" />
                </div>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-gray-600 mb-2">Wi-Fi</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label :class="labelCls">Wi-Fi nomi</label>
                  <input v-model="form.wifi_name" type="text" placeholder="EtihadHotel" :class="inputCls" />
                </div>
                <div>
                  <label :class="labelCls">Wi-Fi paroli</label>
                  <input v-model="form.wifi_code" type="text" placeholder="********" :class="inputCls" />
                </div>
              </div>
            </div>

            <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>
          </div>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
            <button @click="saveModal" :disabled="!canSave || saving"
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
import { useHotelsStore, type Hotel } from '../../../stores/hotels'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

const store = useHotelsStore()

const saving = ref(false)
const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')
// Shared styling for the added hotel-detail inputs.
const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500'
const labelCls = 'block text-xs font-medium text-gray-500 mb-1.5'

type HotelForm = {
  name: string; city: string; default_tier: string
  mosque_floor: string; dining_floor: string; lobby_floor: string
  breakfast_time: string; lunch_time: string; dinner_time: string
  wifi_name: string; wifi_code: string
}
function blankForm(): HotelForm {
  return {
    name: '', city: '', default_tier: '',
    mosque_floor: '', dining_floor: '', lobby_floor: '',
    breakfast_time: '', lunch_time: '', dinner_time: '',
    wifi_name: '', wifi_code: '',
  }
}
const form = ref<HotelForm>(blankForm())

const CITIES = [
  { value: 'makka', label: 'Makka' },
  { value: 'madina', label: 'Madina' },
  { value: 'jidda', label: 'Jidda' },
  { value: 'flexible', label: 'Moslashuvchan (har shahar)' },
]
const cityLabel = (c: string | null) => CITIES.find(x => x.value === c)?.label || '—'

const canSave = computed(() => !!form.value.name.trim())

function openAdd() {
  modalEditId.value = null
  formError.value = ''
  form.value = blankForm()
  modalOpen.value = true
}

function openEdit(h: Hotel) {
  modalEditId.value = h.id
  formError.value = ''
  form.value = {
    name: h.name, city: h.city || '', default_tier: h.default_tier || '',
    mosque_floor: h.mosque_floor || '', dining_floor: h.dining_floor || '', lobby_floor: h.lobby_floor || '',
    breakfast_time: h.breakfast_time || '', lunch_time: h.lunch_time || '', dinner_time: h.dinner_time || '',
    wifi_name: h.wifi_name || '', wifi_code: h.wifi_code || '',
  }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalEditId.value = null
}

async function saveModal() {
  if (!canSave.value) return
  saving.value = true
  formError.value = ''
  const payload = {
    name: form.value.name.trim(),
    city: form.value.city || null,
    default_tier: form.value.default_tier || null,
    mosque_floor: form.value.mosque_floor.trim() || null,
    dining_floor: form.value.dining_floor.trim() || null,
    lobby_floor: form.value.lobby_floor.trim() || null,
    breakfast_time: form.value.breakfast_time.trim() || null,
    lunch_time: form.value.lunch_time.trim() || null,
    dinner_time: form.value.dinner_time.trim() || null,
    wifi_name: form.value.wifi_name.trim() || null,
    wifi_code: form.value.wifi_code.trim() || null,
  }
  try {
    if (modalEditId.value) {
      await store.update(modalEditId.value, payload)
    } else {
      await store.add(payload)
    }
    toast.success(modalEditId.value ? 'Yangilandi' : "Qo'shildi")
    closeModal()
  } catch (e: any) {
    formError.value = e?.response?.data?.detail || 'Saqlashda xatolik yuz berdi'
  } finally {
    saving.value = false
  }
}

async function toggleActive(h: Hotel) {
  try {
    await store.update(h.id, { is_active: !h.is_active })
  } catch { /* ignore */ }
}

const { confirm } = useConfirm()
const toast = useToast()

async function askDelete(id: number) {
  if (!(await confirm({
    title: "Mehmonxonani o'chirish",
    message: "Bu amalni ortga qaytarib bo'lmaydi. Guruhga biriktirilgan eski qiymat o'zgarmaydi.",
  }))) return
  try {
    await store.remove(id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirishda xatolik yuz berdi")
  }
}

onMounted(() => store.fetch(true))
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

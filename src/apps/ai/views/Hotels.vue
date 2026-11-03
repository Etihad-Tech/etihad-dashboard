<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Mehmonxonalar</h1>
        <button class="btn btn-primary" @click="openAdd">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />
          Qo'shish
        </button>
      </div>

      <div v-if="store.loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="!store.items.length" class="card empty">Ro'yxat bo'sh</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="h in store.items" :key="h.id" class="flex items-center gap-3 px-4 py-3">
          <div class="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"
            :class="{ 'opacity-50': !h.is_active }">
            <font-awesome-icon icon="hotel" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1" :class="{ 'opacity-50': !h.is_active }">
            <span class="text-sm font-medium text-gray-900 truncate">{{ h.name }}</span>
            <span class="chip chip-blue">{{ cityLabel(h.city) }}</span>
            <span v-if="h.default_tier" class="chip chip-violet">{{ h.default_tier }}</span>
          </div>
          <ToggleSwitch :model-value="h.is_active" :title="h.is_active ? 'Faol' : 'Nofaol'" @update:model-value="toggleActive(h)" />
          <button class="icon-btn" title="Tahrirlash" @click="openEdit(h)">
            <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
          </button>
          <button class="icon-btn icon-btn-danger" title="O'chirish" @click="askDelete(h.id)">
            <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <BaseModal :open="modalOpen" :title="modalEditId ? 'Tahrirlash' : 'Yangi mehmonxona'" width="sm:max-w-2xl" @close="closeModal">
      <div>
        <label class="label">Nomi</label>
        <input v-model="form.name" type="text" placeholder="Fairmont" class="input" @keyup.enter="saveModal" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Shahar</label>
          <select v-model="form.city" class="input">
            <option value="">—</option>
            <option v-for="c in CITIES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label class="label">Tarif</label>
          <select v-model="form.default_tier" class="input">
            <option value="">—</option>
            <option value="premium">premium</option>
            <option value="comfort">comfort</option>
          </select>
        </div>
      </div>

      <!-- Structured facts the bot answers automatically (verbatim). A BLANK field
           means that place DOES NOT EXIST — the bot says so. Floors are free-text,
           so "L (Tower 2)" or "M (Tower 3)" work, not just a bare number. -->
      <div class="pt-4 border-t border-gray-100">
        <p class="section-title mb-2">Qavatlar</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label class="label">Erkaklar masjidi</label>
            <input v-model="form.mosque_floor_male" type="text" placeholder="2" class="input" />
          </div>
          <div>
            <label class="label">Ayollar masjidi</label>
            <input v-model="form.mosque_floor_female" type="text" placeholder="M (Tower 2)" class="input" />
          </div>
          <div>
            <label class="label">Haramga chiqish</label>
            <input v-model="form.haram_floor" type="text" placeholder="L" class="input" />
          </div>
          <div>
            <label class="label">Sartaroshxona</label>
            <input v-model="form.sartaroshxona_floor" type="text" placeholder="1" class="input" />
          </div>
          <div>
            <label class="label">Resepshn</label>
            <input v-model="form.reception_floor" type="text" placeholder="0" class="input" />
          </div>
          <div>
            <label class="label">Tashkiliy guruh</label>
            <input v-model="form.staff_floor" type="text" placeholder="1" class="input" />
          </div>
        </div>
      </div>

      <div>
        <p class="section-title mb-2">Ovqatlanish</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Nonushta vaqti</label>
            <input v-model="form.breakfast_time" type="text" placeholder="07:00-09:00" class="input" />
          </div>
          <div>
            <label class="label">Nonushta joyi</label>
            <input v-model="form.breakfast_floor" type="text" placeholder="2-qavat (Tower 1)" class="input" />
          </div>
          <div>
            <label class="label">Tushlik vaqti</label>
            <input v-model="form.lunch_time" type="text" placeholder="13:00-14:30" class="input" />
          </div>
          <div>
            <label class="label">Tushlik joyi</label>
            <input v-model="form.lunch_floor" type="text" placeholder="1-qavat" class="input" />
          </div>
          <div>
            <label class="label">Kechki ovqat vaqti</label>
            <input v-model="form.dinner_time" type="text" placeholder="19:00-21:00" class="input" />
          </div>
          <div>
            <label class="label">Kechki ovqat joyi</label>
            <input v-model="form.dinner_floor" type="text" placeholder="2-qavat" class="input" />
          </div>
        </div>
      </div>

      <div>
        <p class="section-title mb-2">Wi-Fi</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Nomi</label>
            <input v-model="form.wifi_name" type="text" placeholder="EtihadHotel" class="input" />
          </div>
          <div>
            <label class="label">Paroli</label>
            <input v-model="form.wifi_code" type="text" placeholder="********" class="input" />
          </div>
        </div>
      </div>

      <p v-if="formError" class="error-text">{{ formError }}</p>
      <template #footer>
        <button class="btn btn-ghost" @click="closeModal">Bekor qilish</button>
        <button class="btn btn-primary" :disabled="!canSave || saving" @click="saveModal">
          {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import BaseModal from '../../../components/BaseModal.vue'
import ToggleSwitch from '../../../components/ToggleSwitch.vue'
import { useHotelsStore, type Hotel } from '../../../stores/hotels'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

const store = useHotelsStore()

const saving = ref(false)
const modalOpen = ref(false)
const modalEditId = ref<number | null>(null)
const formError = ref('')

type HotelForm = {
  name: string; city: string; default_tier: string
  mosque_floor_male: string; mosque_floor_female: string; haram_floor: string
  sartaroshxona_floor: string; reception_floor: string; staff_floor: string
  breakfast_time: string; breakfast_floor: string
  lunch_time: string; lunch_floor: string
  dinner_time: string; dinner_floor: string
  wifi_name: string; wifi_code: string
}
function blankForm(): HotelForm {
  return {
    name: '', city: '', default_tier: '',
    mosque_floor_male: '', mosque_floor_female: '', haram_floor: '',
    sartaroshxona_floor: '', reception_floor: '', staff_floor: '',
    breakfast_time: '', breakfast_floor: '',
    lunch_time: '', lunch_floor: '',
    dinner_time: '', dinner_floor: '',
    wifi_name: '', wifi_code: '',
  }
}
const form = ref<HotelForm>(blankForm())

const CITIES = [
  { value: 'makka', label: 'Makka' },
  { value: 'madina', label: 'Madina' },
  { value: 'jidda', label: 'Jidda' },
  { value: 'flexible', label: 'Har shahar' },
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
    mosque_floor_male: h.mosque_floor_male || '', mosque_floor_female: h.mosque_floor_female || '',
    haram_floor: h.haram_floor || '', sartaroshxona_floor: h.sartaroshxona_floor || '',
    reception_floor: h.reception_floor || '', staff_floor: h.staff_floor || '',
    breakfast_time: h.breakfast_time || '', breakfast_floor: h.breakfast_floor || '',
    lunch_time: h.lunch_time || '', lunch_floor: h.lunch_floor || '',
    dinner_time: h.dinner_time || '', dinner_floor: h.dinner_floor || '',
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
    mosque_floor_male: form.value.mosque_floor_male.trim() || null,
    mosque_floor_female: form.value.mosque_floor_female.trim() || null,
    haram_floor: form.value.haram_floor.trim() || null,
    sartaroshxona_floor: form.value.sartaroshxona_floor.trim() || null,
    reception_floor: form.value.reception_floor.trim() || null,
    staff_floor: form.value.staff_floor.trim() || null,
    breakfast_time: form.value.breakfast_time.trim() || null,
    breakfast_floor: form.value.breakfast_floor.trim() || null,
    lunch_time: form.value.lunch_time.trim() || null,
    lunch_floor: form.value.lunch_floor.trim() || null,
    dinner_time: form.value.dinner_time.trim() || null,
    dinner_floor: form.value.dinner_floor.trim() || null,
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
    formError.value = e?.response?.data?.detail || 'Saqlanmadi'
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
    message: "Guruhlardagi qiymat o'zgarmaydi.",
  }))) return
  try {
    await store.remove(id)
    toast.success("O'chirildi")
  } catch {
    toast.error("O'chirilmadi")
  }
}

onMounted(() => store.fetch(true))
</script>


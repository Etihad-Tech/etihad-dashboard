<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Video yo'riqnomalar</h2>
        <p class="text-sm text-gray-500 mt-1">Nosozliklar bo'yicha bot yuboradigan yo'riqnoma videolarning file_id'lari</p>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
        <p class="font-medium mb-1">Qanday qo'shiladi</p>
        <p class="text-amber-700">
          Videoni <b>botning o'ziga</b> (shaxsiy chatda) yuboring — bot javobida <code>file_id</code> ni qaytaradi.
          O'sha qiymatni mos kategoriyaga qo'ying va Saqlang. <b>Diqqat:</b> <code>file_id</code> har bir bot uchun
          alohida — test botining id'si asosiy (prod) botda ishlamaydi, qaytadan olish kerak. Bo'sh qoldirilsa, bot
          o'sha kategoriyada video yubormaydi (oddiy javob beradi).
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(v, i) in videos"
          :key="v.category"
          class="bg-white rounded-3xl border border-gray-200 p-4 animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center shrink-0">
                <font-awesome-icon icon="video" class="w-4 h-4 text-sky-600" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ v.label }}</p>
                <p class="text-xs" :class="(v.file_id && v.is_active) ? 'text-emerald-600' : 'text-gray-400'">
                  {{ (v.file_id && v.is_active) ? 'Faol — video yuboriladi' : 'O\'chiq — video yo\'q' }}
                </p>
              </div>
            </div>
            <button
              @click="v.is_active = !v.is_active"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors shrink-0"
              :class="v.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
            >
              <font-awesome-icon :icon="v.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
              {{ v.is_active ? 'Faol' : 'Nofaol' }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="v.file_id"
              type="text"
              placeholder="Telegram file_id (bo'sh = video yo'q)"
              class="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <button
              @click="save(v)"
              :disabled="savingCat === v.category"
              class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors shrink-0"
            >
              {{ savingCat === v.category ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
          <p v-if="savedCat === v.category" class="text-xs text-emerald-600 mt-2">✓ Saqlandi</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'

interface Video {
  category: string
  label: string
  file_id: string
  is_active: boolean
}

const videos = ref<Video[]>([])
const loading = ref(false)
const savingCat = ref<string | null>(null)
const savedCat = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/trouble-videos')
    videos.value = data
  } catch {
    videos.value = []
  } finally {
    loading.value = false
  }
}

async function save(v: Video) {
  savingCat.value = v.category
  savedCat.value = null
  try {
    const { data } = await api.put(`/trouble-videos/${v.category}`, {
      file_id: v.file_id.trim(),
      is_active: v.is_active,
    })
    const idx = videos.value.findIndex(x => x.category === v.category)
    if (idx !== -1) videos.value[idx] = data
    savedCat.value = v.category
    setTimeout(() => { if (savedCat.value === v.category) savedCat.value = null }, 2500)
  } catch { /* ignore */ }
  finally { savingCat.value = null }
}

onMounted(load)
</script>

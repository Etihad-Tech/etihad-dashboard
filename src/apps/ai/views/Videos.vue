<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Videolar</h1>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="!videos.length" class="card empty">Kategoriya yo'q</div>

      <div v-else class="card divide-y divide-gray-100">
        <div v-for="v in videos" :key="v.category" class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <div class="flex items-center gap-3 min-w-0 w-full sm:w-64 sm:shrink-0">
            <div class="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <font-awesome-icon icon="video" class="w-3.5 h-3.5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ v.label }}</p>
              <span class="chip mt-0.5" :class="(v.file_id && v.is_active) ? 'chip-green' : 'chip-gray'">
                {{ (v.file_id && v.is_active) ? 'Faol' : "Video yo'q" }}
              </span>
            </div>
          </div>
          <input v-model="v.file_id" type="text" placeholder="file_id" class="input font-mono flex-1 min-w-[12rem]" />
          <ToggleSwitch v-model="v.is_active" :title="v.is_active ? 'Faol' : 'Nofaol'" />
          <button class="btn btn-primary" :disabled="savingCat === v.category" @click="save(v)">
            <font-awesome-icon v-if="savedCat === v.category" icon="check" class="w-3.5 h-3.5" />
            {{ savingCat === v.category ? 'Saqlanmoqda...' : savedCat === v.category ? 'Saqlandi' : 'Saqlash' }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from '../../../components/AppShell.vue'
import ToggleSwitch from '../../../components/ToggleSwitch.vue'
import api from '../../../api'
import { useToast } from '../../../composables/useToast'

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

const toast = useToast()

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
  } catch {
    toast.error('Saqlanmadi')
  }
  finally { savingCat.value = null }
}

onMounted(load)
</script>

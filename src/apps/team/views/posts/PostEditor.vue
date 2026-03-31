<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex items-center gap-4 animate-fade-up">
        <button
          @click="$router.back()"
          class="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors"
        >
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </button>
        <h2 class="text-2xl font-bold text-gray-900">{{ isEdit ? 'Postni tahrirlash' : 'Yangi post' }}</h2>
      </div>

      <form @submit.prevent="savePost" class="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 animate-fade-up" style="animation-delay: 30ms">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kun raqami</label>
            <input v-model.number="form.day_number" type="number" min="1" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vaqt</label>
            <input v-model="form.scheduled_time" type="time" required class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jo'natish rejimi</label>
            <select v-model="form.send_mode" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm">
              <option value="scheduled">Vaqtida</option>
              <option value="now">Hoziroq</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Xabar matni</label>
          <textarea
            v-model="form.message_text"
            rows="6"
            required
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Post matnini yozing..."
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Media path</label>
            <input v-model="form.media_path" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm" placeholder="Ixtiyoriy" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Media turi</label>
            <select v-model="form.media_type" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm">
              <option value="">Yo'q</option>
              <option value="photo">Rasm</option>
              <option value="video">Video</option>
              <option value="document">Hujjat</option>
            </select>
          </div>
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" @click="$router.back()" class="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">Bekor qilish</button>
          <button type="submit" :disabled="saving" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
            {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/AppLayout.vue'
import { usePostsStore } from '../../stores/posts'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const tripId = route.params.tripId as string
const postId = route.params.postId ? Number(route.params.postId) : null
const isEdit = !!postId
const saving = ref(false)
const error = ref('')

const form = reactive({
  day_number: 1,
  scheduled_time: '09:00',
  message_text: '',
  media_path: '',
  media_type: '',
  send_mode: 'scheduled' as 'scheduled' | 'now',
})

async function loadPost() {
  if (!postId) return
  const post = await postsStore.fetchPost(postId)
  Object.assign(form, {
    day_number: post.day_number,
    scheduled_time: post.scheduled_time,
    message_text: post.message_text,
    media_path: post.media_path || '',
    media_type: post.media_type || '',
    send_mode: post.send_mode || 'scheduled',
  })
}

async function savePost() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...form,
      media_path: form.media_path || null,
      media_type: form.media_type || null,
    }
    if (isEdit && postId) {
      await postsStore.updatePost(postId, payload)
    } else {
      await postsStore.createPost(tripId, payload)
    }
    router.back()
  } catch {
    error.value = 'Xatolik yuz berdi'
  } finally {
    saving.value = false
  }
}

onMounted(loadPost)
</script>

<template>
  <AppShell>
    <div class="page max-w-3xl">
      <div class="page-head">
        <button class="icon-btn" title="Orqaga" @click="$router.back()">
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
        </button>
        <h1 class="page-title">{{ isEdit ? 'Postni tahrirlash' : 'Yangi post' }}</h1>
      </div>

      <form class="card p-5 space-y-4" @submit.prevent="savePost">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label class="label">Kun</label>
            <input v-model.number="form.day_number" type="number" min="1" required class="input" placeholder="1" />
          </div>
          <div>
            <label class="label">Vaqt</label>
            <input v-model="form.scheduled_time" type="time" required class="input" />
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="label">Jo'natish</label>
            <div class="seg w-full">
              <button type="button" class="seg-btn flex-1" :class="{ 'seg-btn-on': form.send_mode === 'scheduled' }"
                @click="form.send_mode = 'scheduled'">Vaqtida</button>
              <button type="button" class="seg-btn flex-1" :class="{ 'seg-btn-on': form.send_mode === 'now' }"
                @click="form.send_mode = 'now'">Hoziroq</button>
            </div>
          </div>
        </div>

        <div>
          <label class="label">Matn</label>
          <textarea v-model="form.message_text" rows="8" required class="input resize-y"></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="label">Media path</label>
            <input v-model="form.media_path" class="input" />
          </div>
          <div>
            <label class="label">Media turi</label>
            <select v-model="form.media_type" class="input">
              <option value="">Yo'q</option>
              <option value="photo">Rasm</option>
              <option value="video">Video</option>
              <option value="document">Hujjat</option>
            </select>
          </div>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="btn btn-ghost" @click="$router.back()">Bekor qilish</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
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

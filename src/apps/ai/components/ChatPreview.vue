<template>
  <Transition name="modal">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-200 shadow-xl mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 class="font-semibold text-gray-900">Suhbat ko'rish</h3>
            <p class="text-xs text-gray-400" v-if="preview">
              {{ preview.user.first_name || preview.user.username }} &mdash;
              {{ preview.group?.title || 'Shaxsiy chat' }}
            </p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
            <font-awesome-icon icon="xmark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" v-if="preview">
          <div
            v-for="(ctx, i) in preview.context"
            :key="i"
            class="flex"
            :class="ctx.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
              :class="ctx.role === 'user'
                ? 'bg-amber-600 text-white rounded-br-md'
                : 'bg-white text-gray-700 border border-gray-200 rounded-bl-md shadow-sm'"
            >
              {{ ctx.content }}
            </div>
          </div>
        </div>

        <div v-else class="flex-1 flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Footer info -->
        <div v-if="preview" class="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
          <span>{{ categoryLabel(preview.category) }}</span>
          <span>{{ formatDate(preview.created_at) }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMessagesStore, type MessagePreview } from '../stores/messages'

const props = defineProps<{
  visible: boolean
  messageId: number | null
}>()

defineEmits<{ close: [] }>()

const messagesStore = useMessagesStore()
const preview = ref<MessagePreview | null>(null)

watch(
  () => props.messageId,
  async (id) => {
    if (id) {
      preview.value = null
      preview.value = await messagesStore.fetchPreview(id)
    }
  },
)

function categoryLabel(cat: string | null): string {
  const labels: Record<string, string> = {
    sorov: "So'rov",
    muammo: 'Muammo',
    etiroz: "E'tiroz",
  }
  return cat ? labels[cat] || cat : ''
}

function formatDate(ts: string | null): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString('uz')
}
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

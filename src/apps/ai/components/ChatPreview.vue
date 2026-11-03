<template>
  <BaseModal :open="visible" title="Suhbat" @close="$emit('close')">
    <template v-if="preview">
      <p class="text-xs text-gray-500 -mt-1">
        {{ preview.user.first_name || preview.user.username }} · {{ preview.group?.title || 'Shaxsiy chat' }}
      </p>
      <div class="space-y-2">
        <div
          v-for="(ctx, i) in preview.context"
          :key="i"
          class="flex"
          :class="ctx.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-line"
            :class="ctx.role === 'user'
              ? 'bg-amber-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-800 rounded-bl-md'"
          >
            {{ ctx.content }}
          </div>
        </div>
      </div>
    </template>
    <div v-else class="flex justify-center py-12"><div class="spinner"></div></div>

    <template v-if="preview" #footer>
      <span class="chip chip-gray mr-auto">{{ categoryLabel(preview.category) || '—' }}</span>
      <span class="text-xs text-gray-400">{{ formatDate(preview.created_at) }}</span>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '../../../components/BaseModal.vue'
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

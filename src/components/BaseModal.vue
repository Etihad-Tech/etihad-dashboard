<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/30 backdrop-blur-[2px] sm:p-4"
        @mousedown.self="emit('close')">
        <div class="modal-panel w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col" :class="width">
          <div class="flex items-center gap-3 pl-5 pr-3 h-14 border-b border-gray-100 shrink-0">
            <h3 class="font-semibold text-gray-900 truncate mr-auto">{{ title }}</h3>
            <slot name="head" />
            <button type="button" class="icon-btn" @click="emit('close')">
              <font-awesome-icon icon="xmark" class="w-4 h-4" />
              <span class="sr-only">Yopish</span>
            </button>
          </div>
          <div class="p-5 space-y-4 overflow-y-auto">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 shrink-0">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

// One dialog for every add/edit form in the dashboard: a title bar with a close button,
// a scrolling body and an optional footer for the actions. Escape and a click on the
// backdrop close it. On a phone it rises from the bottom as a sheet.
const props = withDefaults(defineProps<{ open: boolean; title: string; width?: string }>(), {
  width: 'sm:max-w-lg',
})
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
watch(() => props.open, (v) => {
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
}, { immediate: true })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>


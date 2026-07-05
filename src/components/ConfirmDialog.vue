<template>
  <Transition name="modal">
    <div
      v-if="s.visible"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      @click.self="cancel"
    >
      <div class="bg-white rounded-3xl w-full max-w-xs border border-gray-200 shadow-xl mx-4 p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <font-awesome-icon icon="trash" class="w-5 h-5 text-red-500" />
        </div>
        <h3 class="font-semibold text-gray-900 mb-1">{{ s.title }}</h3>
        <p class="text-sm text-gray-500 mb-5">{{ s.message }}</p>
        <div class="flex justify-center gap-3">
          <!-- Cancel is focused by default, so a reflexive Enter never confirms a delete. -->
          <button
            ref="cancelBtn"
            @click="cancel"
            class="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
          >
            {{ s.cancelText }}
          </button>
          <button
            @click="ok"
            class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-2xl transition-colors"
          >
            {{ s.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { confirmState, _settleConfirm } from '../composables/useConfirm'

const s = confirmState
const cancelBtn = ref<HTMLButtonElement | null>(null)

function ok() { _settleConfirm(true) }
function cancel() { _settleConfirm(false) }

// Focus Cancel when the dialog opens (safe default + keyboard reachable).
watch(() => s.visible, v => { if (v) nextTick(() => cancelBtn.value?.focus()) })

// Escape cancels; Enter is intentionally NOT bound to confirm.
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && s.visible) cancel()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
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

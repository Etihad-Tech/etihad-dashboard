<template>
  <Transition name="modal">
    <div
      v-if="s.visible"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/30 backdrop-blur-[2px] px-4"
      @click.self="cancel"
    >
      <div class="modal-panel bg-white rounded-2xl w-full max-w-sm shadow-xl p-5">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
            <font-awesome-icon icon="trash" class="w-4 h-4 text-rose-600" />
          </div>
          <div class="min-w-0 pt-0.5">
            <h3 class="font-semibold text-gray-900">{{ s.title }}</h3>
            <p v-if="s.message" class="text-sm text-gray-500 mt-1">{{ s.message }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <!-- Cancel is focused by default, so a reflexive Enter never confirms a delete. -->
          <button ref="cancelBtn" @click="cancel" class="btn btn-secondary">{{ s.cancelText }}</button>
          <button @click="ok" class="btn btn-danger">{{ s.confirmText }}</button>
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


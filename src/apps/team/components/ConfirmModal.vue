<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/30 backdrop-blur-[2px] p-4"
        @mousedown.self="$emit('cancel')"
      >
        <div class="modal-panel bg-white rounded-2xl w-full max-w-xs shadow-xl p-6 text-center">
          <div class="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-3">
            <font-awesome-icon icon="trash" class="w-4 h-4 text-rose-600" />
          </div>
          <h3 class="font-semibold text-gray-900">{{ title }}</h3>
          <p v-if="message" class="text-sm text-gray-500 mt-1">{{ message }}</p>
          <div class="grid grid-cols-2 gap-2 mt-5">
            <button class="btn btn-secondary" @click="$emit('cancel')">Bekor qilish</button>
            <button class="btn btn-danger" @click="$emit('confirm')">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible: boolean
  title?: string
  message?: string
  confirmText?: string
}>(), {
  title: "O'chirish",
  message: "Ortga qaytarib bo'lmaydi",
  confirmText: "O'chirish",
})

defineEmits<{ confirm: []; cancel: [] }>()
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(12px) scale(0.98);
}
</style>

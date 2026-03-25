<template>
  <Transition name="modal">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      @click.self="$emit('cancel')"
    >
      <div class="bg-white rounded-3xl w-full max-w-xs border border-gray-200 shadow-xl mx-4 p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <font-awesome-icon icon="trash" class="w-5 h-5 text-red-500" />
        </div>
        <h3 class="font-semibold text-gray-900 mb-1">{{ title }}</h3>
        <p class="text-sm text-gray-500 mb-5">{{ message }}</p>
        <div class="flex justify-center gap-3">
          <button
            @click="$emit('cancel')"
            class="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Bekor qilish
          </button>
          <button
            @click="$emit('confirm')"
            class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible: boolean
  title?: string
  message?: string
  confirmText?: string
}>(), {
  title: "O'chirish",
  message: "Bu amalni ortga qaytarib bo'lmaydi",
  confirmText: "O'chirish",
})

defineEmits<{ confirm: []; cancel: [] }>()
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

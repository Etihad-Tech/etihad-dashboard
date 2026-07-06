<template>
  <div class="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 min-w-[240px] max-w-sm px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium"
        :class="styles[t.type]"
      >
        <font-awesome-icon :icon="icons[t.type]" class="w-4 h-4 shrink-0" />
        <span class="flex-1">{{ t.text }}</span>
        <button @click="dismissToast(t.id)" class="opacity-50 hover:opacity-100 transition-opacity">
          <font-awesome-icon icon="xmark" class="w-3.5 h-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { toastList, dismissToast, type ToastType } from '../composables/useToast'

const toasts = toastList

const styles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-gray-50 border-gray-200 text-gray-700',
}
const icons: Record<ToastType, string> = {
  success: 'circle-check',
  error: 'circle-exclamation',
  info: 'circle-info',
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.toast-move {
  transition: transform 0.25s ease;
}
</style>

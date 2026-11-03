<template>
  <div class="fixed top-4 right-4 left-4 sm:left-auto z-[70] flex flex-col items-end gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 w-full sm:w-auto sm:min-w-[260px] max-w-sm px-4 py-3 rounded-xl bg-white shadow-lg ring-1 ring-gray-200/80 text-sm font-medium text-gray-800"
      >
        <font-awesome-icon :icon="icons[t.type]" class="w-4 h-4 shrink-0" :class="styles[t.type]" />
        <span class="flex-1">{{ t.text }}</span>
        <button @click="dismissToast(t.id)" class="text-gray-400 hover:text-gray-700 transition-colors">
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
  success: 'text-emerald-600',
  error: 'text-rose-600',
  info: 'text-gray-400',
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

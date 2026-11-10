<template>
  <div ref="root" class="relative">
    <button type="button" :class="buttonClass" :aria-expanded="open" @click="open = !open">
      <slot name="button" />
      <font-awesome-icon icon="chevron-down" class="w-2.5 h-2.5 opacity-60 transition-transform" :class="{ 'rotate-180': open }" />
    </button>
    <Transition
      enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-100 ease-in" leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        class="absolute z-40 min-w-56 bg-white rounded-xl border border-gray-200 shadow-[0_8px_24px_rgba(16,24,40,0.12)] p-1.5"
        :class="[up ? 'bottom-full mb-2' : 'top-full mt-2', alignRight ? 'right-0' : 'left-0']"
        @click="onPanelClick"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

// A button with a small panel of choices. A click outside or Escape closes it; a click
// on an element marked data-close inside it closes it too. `up` opens it above the
// button — the selection bar sits at the bottom of the screen.
withDefaults(defineProps<{ buttonClass?: string; up?: boolean; alignRight?: boolean }>(), {
  buttonClass: 'btn btn-sm btn-secondary',
})
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const close = () => { open.value = false }

function onDoc(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) close()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
function onPanelClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('[data-close]')) close()
}
watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
  } else {
    document.removeEventListener('mousedown', onDoc)
    window.removeEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDoc)
  window.removeEventListener('keydown', onKey)
})
</script>

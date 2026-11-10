<template>
  <Transition
    enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-3"
    leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0 translate-y-3"
  >
    <div v-if="count > 0" class="sticky bottom-4 z-30 flex justify-center pointer-events-none">
      <div class="pointer-events-auto flex flex-wrap items-center gap-0.5 sm:gap-1.5 max-w-full bg-gray-900 text-white rounded-2xl pl-4 pr-1.5 py-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.28)]">
        <span class="text-sm font-medium tabular-nums mr-1 sm:mr-2 whitespace-nowrap">{{ count }}<span class="hidden sm:inline"> ta tanlandi</span></span>
        <slot />
        <button type="button" class="icon-btn text-gray-400 hover:text-white hover:bg-white/10" title="Tanlovni bekor qilish" @click="emit('clear')">
          <font-awesome-icon icon="xmark" class="w-4 h-4" />
          <span class="sr-only">Tanlovni bekor qilish</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// The actions for the ticked rows. It sits at the bottom of the page column while
// anything is ticked, so the actions stay in reach however far down the ticks are.
defineProps<{ count: number }>()
const emit = defineEmits<{ clear: [] }>()
</script>

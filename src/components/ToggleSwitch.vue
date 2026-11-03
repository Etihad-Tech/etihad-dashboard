<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
    :class="modelValue ? 'bg-emerald-500' : 'bg-gray-300'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
      :class="modelValue ? 'translate-x-[18px]' : 'translate-x-0.5'"
    ></span>
  </button>
</template>

<script setup lang="ts">
// The on/off switch used for every «faol / nofaol» flag in the dashboard.
defineProps<{ modelValue: boolean; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

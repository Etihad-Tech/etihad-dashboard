<template>
  <input
    ref="box"
    type="checkbox"
    class="checkbox shrink-0"
    :checked="state === 'all'"
    :aria-label="label"
    @click.stop="emit('tick', $event)"
  />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

// A row's or a group's tick. «some» shows the dash of a partly ticked group. The click
// carries its event, so the list can read Shift for a range.
const props = defineProps<{ state: 'all' | 'some' | 'none'; label: string }>()
const emit = defineEmits<{ tick: [ev: MouseEvent] }>()
const box = ref<HTMLInputElement | null>(null)

function sync() {
  if (!box.value) return
  box.value.indeterminate = props.state === 'some'
  box.value.checked = props.state === 'all'
}
onMounted(sync)
watch(() => props.state, sync)
</script>

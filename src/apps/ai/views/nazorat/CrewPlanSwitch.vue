<template>
   <!-- «Reja 100%» (owner, 14.10.2026): the month as if the plan were met. View only. -->
   <div class="seg seg-sm" role="group">
      <button type="button" :class="!planFull ? 'is-on' : ''" @click="set(false)">
         {{ tr('plan_real', { pct: pct(v) }) }}
      </button>
      <button type="button" :class="planFull ? 'is-on' : ''" @click="set(true)">
         {{ tr('plan_full') }}
      </button>
   </div>
</template>

<script setup lang="ts">
import { pct, planFull, tr } from './crew'

defineProps<{ v: number | null }>()

function set(full: boolean) {
   planFull.value = full
}
</script>

<template>
  <div class="flex items-start gap-3 px-4 py-3">
    <div class="min-w-0 flex-1" :class="{ 'opacity-50': !q.is_active }">
      <p class="text-sm font-medium text-gray-900">{{ q.question }}</p>
      <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ q.answer }}</p>
      <div v-if="q.tier || q.hotel || q.city || q.staff_username || q.keywords" class="flex flex-wrap items-center gap-1.5 mt-2">
        <span v-if="q.tier" class="chip" :class="q.tier === 'comfort' ? 'chip-blue' : 'chip-violet'">
          {{ q.tier === 'comfort' ? 'Komfort' : 'Premium/Lux' }}
        </span>
        <span v-if="q.hotel" class="chip chip-amber">
          <font-awesome-icon icon="hotel" class="w-3 h-3" />{{ q.hotel }}
        </span>
        <span v-if="q.city" class="chip chip-green">
          <font-awesome-icon icon="location-dot" class="w-3 h-3" />{{ q.city === 'makka' ? 'Makka' : q.city === 'madina' ? 'Madina' : q.city }}
        </span>
        <span v-if="q.staff_username" class="chip chip-gray">
          <font-awesome-icon icon="user" class="w-3 h-3" />{{ q.staff_username }}
        </span>
        <span v-if="q.keywords" class="min-w-0 max-w-full truncate text-xs text-gray-400">
          <font-awesome-icon icon="tag" class="w-3 h-3 mr-1" />{{ q.keywords }}
        </span>
      </div>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <ToggleSwitch class="mr-1" :model-value="q.is_active" :title="q.is_active ? 'Faol' : 'Nofaol'"
        @update:model-value="$emit('toggle', q)" />
      <button class="icon-btn" title="Tahrirlash" @click="$emit('edit', q)">
        <font-awesome-icon icon="pen" class="w-3.5 h-3.5" />
      </button>
      <button class="icon-btn icon-btn-danger" title="O'chirish" @click="$emit('delete', q.id)">
        <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import ToggleSwitch from '../../../components/ToggleSwitch.vue'

interface Qa {
  id: number
  category: string | null
  subcategory: string | null
  question: string
  answer: string
  keywords: string | null
  tier: string | null
  staff_username: string | null
  hotel: string | null
  city: string | null
  is_active: boolean
}
defineProps<{ q: Qa }>()
defineEmits<{ (e: 'toggle', q: Qa): void; (e: 'edit', q: Qa): void; (e: 'delete', id: number): void }>()
</script>

<template>
  <div
    class="bg-white rounded-2xl border p-4 flex items-start justify-between gap-4 transition-all"
    :class="q.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'"
  >
    <div class="min-w-0">
      <p class="text-sm font-medium text-gray-900">
        {{ q.question }}
        <span v-if="q.tier"
          class="ml-1.5 align-middle inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
          :class="q.tier === 'comfort' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'">
          {{ q.tier === 'comfort' ? 'Komfort' : 'Premium/Lux' }}
        </span>
        <span v-if="q.hotel"
          class="ml-1.5 align-middle inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
          🏨 {{ q.hotel }}
        </span>
      </p>
      <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ q.answer }}</p>
      <p v-if="q.keywords" class="text-[11px] text-gray-400 mt-1.5 truncate">
        <font-awesome-icon icon="tag" class="w-3 h-3 mr-1" />{{ q.keywords }}
      </p>
      <p v-if="q.staff_username" class="text-[11px] text-emerald-600 mt-1 font-medium">
        👤 {{ q.staff_username }}
      </p>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <button
        @click="$emit('toggle', q)"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors"
        :class="q.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'"
      >
        <font-awesome-icon :icon="q.is_active ? 'toggle-on' : 'toggle-off'" class="w-4 h-4" />
        {{ q.is_active ? 'Faol' : 'Nofaol' }}
      </button>
      <button
        @click="$emit('edit', q)"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <font-awesome-icon icon="pen" class="w-3 h-3" />
        Tahrirlash
      </button>
      <button
        @click="$emit('delete', q.id)"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
      >
        <font-awesome-icon icon="trash" class="w-3 h-3" />
        O'chirish
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  is_active: boolean
}
defineProps<{ q: Qa }>()
defineEmits<{ (e: 'toggle', q: Qa): void; (e: 'edit', q: Qa): void; (e: 'delete', id: number): void }>()
</script>

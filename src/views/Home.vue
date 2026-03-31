<template>
  <MainLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between animate-fade-up">
        <h2 class="text-2xl font-bold text-gray-900">Guruhlar</h2>
        <button
          @click="groupsStore.fetchGroups()"
          class="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-2xl transition-colors"
        >
          <font-awesome-icon icon="arrows-rotate" class="w-3.5 h-3.5" />
          Yangilash
        </button>
      </div>

      <div v-if="groupsStore.loading" class="flex justify-center py-12">
        <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="groupsStore.items.length === 0" class="bg-white rounded-3xl border border-gray-200 py-20 text-center animate-fade-up" style="animation-delay: 30ms">
        <font-awesome-icon icon="users" class="w-10 h-10 text-gray-300 mb-4" />
        <p class="text-gray-400">Guruhlar topilmadi</p>
        <p class="text-xs text-gray-300 mt-1">Botlarni guruhlarga qo'shing</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="(group, i) in groupsStore.items"
          :key="group.chat_id"
          class="bg-white rounded-3xl border border-gray-200 p-5 animate-fade-up"
          :style="{ animationDelay: `${(i + 1) * 30}ms` }"
        >
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <font-awesome-icon icon="users" class="w-4 h-4 text-amber-600" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-gray-900 truncate">{{ group.title }}</h3>
              <p class="text-xs text-gray-400 font-mono">{{ group.chat_id }}</p>
            </div>
          </div>

          <div class="space-y-2 mb-4">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">AI Support Bot</span>
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                :class="group.ai_bot ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="group.ai_bot ? 'bg-emerald-500' : 'bg-gray-300'"></span>
                {{ group.ai_bot ? 'Aktiv' : 'Yo\'q' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Turon Tour Bot</span>
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                :class="group.turon_bot ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="group.turon_bot ? 'bg-emerald-500' : 'bg-gray-300'"></span>
                {{ group.turon_bot ? 'Aktiv' : 'Yo\'q' }}
              </span>
            </div>
          </div>

          <div v-if="group.trip_name" class="mb-4 px-3 py-2 bg-blue-50 rounded-2xl">
            <p class="text-xs text-blue-600 font-medium">
              <font-awesome-icon icon="plane" class="w-3 h-3 mr-1" />
              {{ group.trip_name }}
            </p>
          </div>
          <div v-else class="mb-4 px-3 py-2 bg-gray-50 rounded-2xl">
            <p class="text-xs text-gray-400">Safar biriktirilmagan</p>
          </div>

          <button
            v-if="group.is_activated"
            disabled
            class="w-full py-2.5 text-sm font-medium rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5"></span>
            Aktiv
          </button>
          <button
            v-else
            @click="handleSendNow(group)"
            :disabled="!canSend(group) || groupsStore.sending === group.chat_id"
            class="w-full py-2.5 text-sm font-medium rounded-2xl transition-colors"
            :class="canSend(group)
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
          >
            <template v-if="groupsStore.sending === group.chat_id">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
              Jo'natilmoqda...
            </template>
            <template v-else-if="canSend(group)">
              <font-awesome-icon icon="paper-plane" class="w-3.5 h-3.5 mr-1.5" />
              Botlarni ishga tushirish
            </template>
            <template v-else>
              <font-awesome-icon icon="lock" class="w-3 h-3 mr-1.5" />
              {{ !group.ai_bot || !group.turon_bot ? 'Ikkala bot kerak' : 'Safar biriktirilmagan' }}
            </template>
          </button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import { useGroupsStore, type GroupInfo } from '../stores/groups'

const groupsStore = useGroupsStore()

function canSend(group: GroupInfo): boolean {
  return group.ai_bot && group.turon_bot && !!group.trip_id
}

async function handleSendNow(group: GroupInfo) {
  if (!group.trip_id || !canSend(group)) return
  await groupsStore.sendNowPosts(group.trip_id, group.chat_id)
}

onMounted(() => groupsStore.fetchGroups())
</script>

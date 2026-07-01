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
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Mehmonxona turi</span>
              <select
                :value="group.hotel_tier || ''"
                @change="onTierChange(group, $event)"
                :disabled="tierSaving === group.chat_id"
                class="text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="">Avto (nomdan)</option>
                <option value="comfort">Komfort</option>
                <option value="premium">Premium / Lux</option>
              </select>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500 shrink-0">Ellikboshi (@username)</span>
              <input
                :value="group.ellikboshi_username || ''"
                @change="onEllikboshiChange(group, $event)"
                :disabled="leaderSaving === group.chat_id"
                type="text"
                placeholder="@username"
                class="w-32 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-gray-700 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>
            <p class="text-[10px] text-gray-400 leading-snug">
              Bot bu guruhda xodimni @belgilaganda, murojaatni shu ellikboshiga ham shaxsiy (DM) yuboradi. (U avval botga /start bosgan bo'lishi kerak.)
            </p>
            <div class="flex items-center justify-between gap-2 pt-1">
              <span class="text-xs text-gray-500 shrink-0">Jo'nash sanasi</span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" :class="flightBadge(group.trip_start_date).cls">{{ flightBadge(group.trip_start_date).text }}</span>
                <input
                  :value="group.trip_start_date || ''"
                  @change="onDateChange(group, $event)"
                  :disabled="dateSaving === group.chat_id"
                  type="date"
                  class="w-32 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                />
              </div>
            </div>
            <p class="text-[10px] text-gray-400 leading-snug">
              Reys (Payshanba/Shanba) shu sanadan aniqlanadi — bot "samolyot qachon uchadi?" savoliga aniq vaqt bilan javob beradi.
            </p>
            <div class="flex items-center justify-between gap-2 pt-1">
              <span class="text-xs text-gray-500 shrink-0">Safar oldi majlis</span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" :class="majlisMeeting(group.trip_start_date).cls">{{ majlisMeeting(group.trip_start_date).text }}</span>
                <input
                  :value="group.preflight_majlis_time || ''"
                  @change="onMajlisTimeChange(group, $event)"
                  :disabled="majlisSaving === group.chat_id"
                  type="time"
                  class="w-32 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                />
              </div>
            </div>
            <p class="text-[10px] text-gray-400 leading-snug">
              Majlis kuni jo'nash sanasidan avtomatik aniqlanadi (reysdan 3 kun oldin: Payshanba→Dushanba, Shanba→Chorshanba). Faqat vaqtni kiriting — bot "majlis qachon?" savoliga to'liq taklif bilan javob beradi.
            </p>
            <div class="flex items-center justify-between gap-2 pt-1">
              <span class="text-xs text-gray-500 shrink-0">Mehmonxona — Makka</span>
              <select
                :value="group.hotel_makka || ''"
                @change="onHotelChange(group, 'makka', $event)"
                :disabled="hotelSaving === group.chat_id + ':makka'"
                class="w-36 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="">— tanlanmagan —</option>
                <option v-for="h in hotelOptions('makka', group.hotel_makka)" :key="h" :value="h">{{ h }}</option>
              </select>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500 shrink-0">Mehmonxona — Madina</span>
              <select
                :value="group.hotel_madina || ''"
                @change="onHotelChange(group, 'madina', $event)"
                :disabled="hotelSaving === group.chat_id + ':madina'"
                class="w-36 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="">— tanlanmagan —</option>
                <option v-for="h in hotelOptions('madina', group.hotel_madina)" :key="h" :value="h">{{ h }}</option>
              </select>
            </div>
            <p class="text-[10px] text-gray-400 leading-snug">
              Bot WiFi, qavatlar, ovqat vaqtlari kabi mehmonxonaga xos savollarga joriy shahardagi mehmonxona ma'lumotidan javob beradi.
            </p>
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
import { onMounted, ref } from 'vue'
import MainLayout from '../components/MainLayout.vue'
import { useGroupsStore, type GroupInfo } from '../stores/groups'
import { useHotelsStore } from '../stores/hotels'

const groupsStore = useGroupsStore()
const hotelsStore = useHotelsStore()
const tierSaving = ref<string | null>(null)
const leaderSaving = ref<string | null>(null)
const dateSaving = ref<string | null>(null)
const hotelSaving = ref<string | null>(null)
const majlisSaving = ref<string | null>(null)

// Dashboard-managed hotel list (Mehmonxonalar page), filtered by city slot.
// Keeps a group's already-saved hotel selectable even if it was later removed.
const hotelOptions = (city: string, current?: string | null) => hotelsStore.optionsForCity(city, current)

// Mirrors the bot: Thursday departure -> Payshanba flight, Saturday -> Shanba.
function flightBadge(dateStr: string | null) {
  if (!dateStr) return { text: 'Sana yo\'q', cls: 'bg-gray-100 text-gray-400' }
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = new Date(y || 1970, (m || 1) - 1, d || 1).getDay() // Sun=0 .. Sat=6
  if (day === 4) return { text: 'Payshanba', cls: 'bg-sky-50 text-sky-600' }
  if (day === 6) return { text: 'Shanba', cls: 'bg-sky-50 text-sky-600' }
  return { text: 'Reys yo\'q', cls: 'bg-amber-50 text-amber-600' }
}

async function onDateChange(group: GroupInfo, event: Event) {
  const date = (event.target as HTMLInputElement).value
  if (date === (group.trip_start_date || '')) return
  dateSaving.value = group.chat_id
  try {
    await groupsStore.setTripStartDate(group.chat_id, date)
  } finally {
    dateSaving.value = null
  }
}

// Mirrors the bot: the pre-flight majlis is 3 days before departure (Payshanba→Dushanba,
// Shanba→Chorshanba). Shows the derived meeting date so the admin sees which meeting the
// time is for; only the time is entered, the day/date follow the trip date automatically.
const UZ_WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
function majlisMeeting(dateStr: string | null) {
  if (!dateStr) return { text: 'Sana yo\'q', cls: 'bg-gray-100 text-gray-400' }
  const [y, m, d] = dateStr.split('-').map(Number)
  const dep = new Date(y || 1970, (m || 1) - 1, d || 1)
  const dow = dep.getDay() // Sun=0 .. Sat=6
  if (dow !== 4 && dow !== 6) return { text: 'Reys yo\'q', cls: 'bg-amber-50 text-amber-600' }
  const meet = new Date(dep)
  meet.setDate(meet.getDate() - 3)
  return { text: `${UZ_WEEKDAYS[meet.getDay()]}, ${meet.getDate()}-${UZ_MONTHS[meet.getMonth()]}`, cls: 'bg-emerald-50 text-emerald-600' }
}

async function onMajlisTimeChange(group: GroupInfo, event: Event) {
  const timeStr = (event.target as HTMLInputElement).value
  if (timeStr === (group.preflight_majlis_time || '')) return
  majlisSaving.value = group.chat_id
  try {
    await groupsStore.setPreflightMajlisTime(group.chat_id, timeStr)
  } finally {
    majlisSaving.value = null
  }
}

function canSend(group: GroupInfo): boolean {
  return group.ai_bot && group.turon_bot && !!group.trip_id
}

async function onTierChange(group: GroupInfo, event: Event) {
  const tier = (event.target as HTMLSelectElement).value
  tierSaving.value = group.chat_id
  try {
    await groupsStore.setHotelTier(group.chat_id, tier)
  } finally {
    tierSaving.value = null
  }
}

async function onEllikboshiChange(group: GroupInfo, event: Event) {
  const username = (event.target as HTMLInputElement).value.trim()
  if (username === (group.ellikboshi_username || '')) return
  leaderSaving.value = group.chat_id
  try {
    await groupsStore.setEllikboshi(group.chat_id, username)
  } finally {
    leaderSaving.value = null
  }
}

async function onHotelChange(group: GroupInfo, city: 'makka' | 'madina', event: Event) {
  const hotel = (event.target as HTMLSelectElement).value
  hotelSaving.value = group.chat_id + ':' + city
  try {
    await groupsStore.setHotel(group.chat_id, city, hotel)
  } finally {
    hotelSaving.value = null
  }
}

async function handleSendNow(group: GroupInfo) {
  if (!group.trip_id || !canSend(group)) return
  await groupsStore.sendNowPosts(group.trip_id, group.chat_id)
}

onMounted(() => { hotelsStore.fetch(); groupsStore.fetchGroups() })
</script>

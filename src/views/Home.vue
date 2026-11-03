<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Guruhlar</h1>
        <span v-if="groupsStore.items.length" class="text-sm text-gray-500">{{ groupsStore.items.length }} ta</span>
        <button class="btn btn-secondary" @click="groupsStore.fetchGroups()">
          <font-awesome-icon icon="arrows-rotate" class="w-3.5 h-3.5" />
          Yangilash
        </button>
      </div>

      <div v-if="groupsStore.loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <div v-else-if="groupsStore.items.length === 0" class="card empty">Guruh yo'q</div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div v-for="group in sortedGroups" :key="group.chat_id" class="card p-4 flex flex-col">
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-gray-900 truncate">{{ group.title }}</h3>
            <p class="text-xs text-gray-400 font-mono">{{ group.chat_id }}</p>
          </div>

          <div class="flex flex-wrap gap-1.5 mt-3">
            <span class="chip" :class="group.ai_bot ? 'chip-green' : 'chip-gray'">
              <span class="w-1.5 h-1.5 rounded-full" :class="group.ai_bot ? 'bg-emerald-500' : 'bg-gray-300'"></span>
              AI bot
            </span>
            <span class="chip" :class="group.turon_bot ? 'chip-green' : 'chip-gray'">
              <span class="w-1.5 h-1.5 rounded-full" :class="group.turon_bot ? 'bg-emerald-500' : 'bg-gray-300'"></span>
              Turon bot
            </span>
            <span v-if="group.trip_name" class="chip chip-blue min-w-0 max-w-full">
              <font-awesome-icon icon="plane" class="w-3 h-3 shrink-0" />
              <span class="truncate">{{ group.trip_name }}</span>
            </span>
            <span v-else class="chip chip-gray">Safar yo'q</span>
          </div>

          <dl class="mt-3 space-y-1.5 text-xs">
            <div class="flex items-center justify-between gap-2">
              <dt class="text-gray-500 shrink-0">Daraja</dt>
              <dd class="font-medium text-gray-800">{{ tierLabel(group.hotel_tier) }}</dd>
            </div>
            <!-- One line while one person runs the whole trip, two when the group is
                 split between cities. Collapsing a split into a single name would show
                 a leader who is not on duty half the time. -->
            <div v-if="!isSplit(group)" class="flex items-center justify-between gap-2">
              <dt class="text-gray-500 shrink-0">Ellikboshi</dt>
              <dd class="font-medium truncate text-right" :class="cityLead(group, 'makka') ? 'text-gray-800' : 'text-gray-400'">{{ cityLead(group, 'makka') || '—' }}</dd>
            </div>
            <template v-else>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-gray-500 shrink-0">Ellikboshi · Makka</dt>
                <dd class="font-medium truncate text-right" :class="cityLead(group, 'makka') ? 'text-gray-800' : 'text-gray-400'">{{ cityLead(group, 'makka') || '—' }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-gray-500 shrink-0">Ellikboshi · Madina</dt>
                <dd class="font-medium truncate text-right" :class="cityLead(group, 'madina') ? 'text-gray-800' : 'text-gray-400'">{{ cityLead(group, 'madina') || '—' }}</dd>
              </div>
            </template>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-gray-500 shrink-0">Jo'nash</dt>
              <dd class="flex items-center gap-1.5 min-w-0">
                <span class="chip h-5" :class="flightBadge(group.trip_start_date).cls">{{ flightBadge(group.trip_start_date).text }}</span>
                <span v-if="group.trip_start_date" class="font-medium text-gray-800 tabular-nums">{{ group.trip_start_date }}</span>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-gray-500 shrink-0">Majlis</dt>
              <dd class="flex items-center gap-1.5 min-w-0">
                <span class="chip h-5" :class="majlisMeeting(group.trip_start_date).cls">{{ majlisMeeting(group.trip_start_date).text }}</span>
                <input
                  :value="group.preflight_majlis_time || ''"
                  @change="onMajlisTimeChange(group, $event)"
                  :disabled="majlisSaving === group.chat_id"
                  type="time"
                  class="input input-sm w-24"
                />
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-gray-500 shrink-0">Makka</dt>
              <dd class="font-medium truncate text-right" :class="group.hotel_makka ? 'text-gray-800' : 'text-gray-400'">{{ group.hotel_makka || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="text-gray-500 shrink-0">Madina</dt>
              <dd class="font-medium truncate text-right" :class="group.hotel_madina ? 'text-gray-800' : 'text-gray-400'">{{ group.hotel_madina || '—' }}</dd>
            </div>
          </dl>

          <div class="mt-auto pt-4">
            <div v-if="group.is_activated" class="btn w-full bg-emerald-50 text-emerald-700 cursor-default">
              <font-awesome-icon icon="circle-check" class="w-3.5 h-3.5" />
              Aktiv
            </div>
            <button
              v-else
              @click="handleSendNow(group)"
              :disabled="!canSend(group) || groupsStore.sending === group.chat_id"
              class="btn w-full"
              :class="canSend(group) ? 'btn-primary' : 'bg-gray-100 text-gray-500'"
            >
              <template v-if="groupsStore.sending === group.chat_id">
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Jo'natilmoqda...
              </template>
              <template v-else-if="canSend(group)">
                <font-awesome-icon icon="paper-plane" class="w-3.5 h-3.5" />
                Botlarni ishga tushirish
              </template>
              <template v-else>
                <font-awesome-icon icon="lock" class="w-3 h-3" />
                {{ !group.ai_bot || !group.turon_bot ? 'Ikkala bot kerak' : 'Safar biriktirilmagan' }}
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '../components/AppShell.vue'
import { useGroupsStore, type GroupInfo } from '../stores/groups'
import { byGroupNumber } from '../utils/groupOrder'

const groupsStore = useGroupsStore()
const majlisSaving = ref<string | null>(null)

// Groups are numbered in their title (#001, #002…) — show them in that order.
const sortedGroups = computed(() => [...groupsStore.items].sort(byGroupNumber))

// Tier / ellikboshi / departure / hotels are shown read-only on this overview; they
// are edited in the AI panel's "Guruhlar" page (both admin and qa can open it). Only
// the pre-flight majlis time (below) lives solely here, so it stays editable.
function tierLabel(tier: string | null): string {
  return tier === 'comfort' ? 'Komfort' : tier === 'premium' ? 'Premium / Lux' : 'Avto'
}

/** Who leads this group in a city — the client-side mirror of the server's
 *  group_leader_for_city: the city column, falling back to the legacy one. */
function cityLead(g: GroupInfo, c: 'makka' | 'madina'): string {
  return (c === 'makka' ? g.ellikboshi_makka : g.ellikboshi_madina) || g.ellikboshi_username || ''
}
function isSplit(g: GroupInfo): boolean {
  return cityLead(g, 'makka').trim().toLowerCase() !== cityLead(g, 'madina').trim().toLowerCase()
}

// Mirrors the bot: Thursday departure -> Payshanba flight, Saturday -> Shanba.
function flightBadge(dateStr: string | null) {
  if (!dateStr) return { text: 'Sana yo\'q', cls: 'chip-gray' }
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = new Date(y || 1970, (m || 1) - 1, d || 1).getDay() // Sun=0 .. Sat=6
  if (day === 4) return { text: 'Payshanba', cls: 'chip-blue' }
  if (day === 6) return { text: 'Shanba', cls: 'chip-blue' }
  return { text: 'Reys yo\'q', cls: 'chip-amber' }
}

// Mirrors the bot: the pre-flight majlis is 3 days before departure (Payshanba→Dushanba,
// Shanba→Chorshanba). Shows the derived meeting date so the admin sees which meeting the
// time is for; only the time is entered, the day/date follow the trip date automatically.
const UZ_WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
function majlisMeeting(dateStr: string | null) {
  if (!dateStr) return { text: 'Sana yo\'q', cls: 'chip-gray' }
  const [y, m, d] = dateStr.split('-').map(Number)
  const dep = new Date(y || 1970, (m || 1) - 1, d || 1)
  const dow = dep.getDay() // Sun=0 .. Sat=6
  if (dow !== 4 && dow !== 6) return { text: 'Reys yo\'q', cls: 'chip-amber' }
  const meet = new Date(dep)
  meet.setDate(meet.getDate() - 3)
  return { text: `${UZ_WEEKDAYS[meet.getDay()]}, ${meet.getDate()}-${UZ_MONTHS[meet.getMonth()]}`, cls: 'chip-green' }
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

async function handleSendNow(group: GroupInfo) {
  if (!group.trip_id || !canSend(group)) return
  await groupsStore.sendNowPosts(group.trip_id, group.chat_id)
}

onMounted(() => { groupsStore.fetchGroups() })
</script>

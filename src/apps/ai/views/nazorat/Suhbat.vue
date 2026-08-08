<template>
   <div class="space-y-3">
      <!-- THE INBOX. Two peers, so it is a list rather than a screen of its own: the
           conversation opens under it and the reader never loses sight of the other
           thread. A peer never written to is still listed — a conversation that does not
           exist yet is somewhere you can start one, not something to hide. -->
      <div v-if="!peer" class="card divide-y divide-gray-100 overflow-hidden">
         <button v-for="p in s.chatPeers" :key="p.role" type="button"
            class="row-tap flex items-center gap-3.5 px-4 py-4 text-left"
            @click="open(p.role)">
            <span class="n-avatar">{{ initials(p.label) }}</span>
            <div class="min-w-0 flex-1">
               <p class="text-[16px] font-semibold tracking-[-0.015em]">{{ p.label }}</p>
               <p class="text-[13.5px] leading-snug mt-0.5 truncate"
                  :class="p.unread ? 'font-semibold text-[color:var(--n-ink-2)]'
                     : 'text-[color:var(--n-muted)]'">
                  <span v-if="p.last_text">
                     <span v-if="p.last_from_me" class="text-[color:var(--n-faint)]">Siz: </span>{{ p.last_text }}
                  </span>
                  <span v-else class="text-[color:var(--n-faint)]">Hali yozilmagan</span>
               </p>
            </div>
            <div class="shrink-0 text-right">
               <p v-if="p.last_at" class="text-[12.5px] text-[color:var(--n-faint)] tabular-nums">
                  {{ fmtDateTime(p.last_at) }}
               </p>
               <span v-if="p.unread" class="chip chip-unread mt-1.5">{{ p.unread }}</span>
            </div>
         </button>
      </div>

      <!-- ONE CONVERSATION. The back arrow and the peer's name live in the panel's top
           bar (see Nazorat.vue's isChatThread), where a phone expects them — and where
           they do not cost the messages a row of vertical space. -->
      <template v-else>
         <div class="card p-4">
            <div v-if="s.chatLoading" class="space-y-3 py-2">
               <div v-for="i in 3" :key="i" class="h-8 rounded-[1.125rem] bg-gray-100 animate-pulse"
                  :class="i % 2 ? 'w-2/3' : 'w-1/2 ml-auto'"></div>
            </div>

            <p v-else-if="!s.chatThread.length"
               class="py-10 text-center text-[15px] text-[color:var(--n-muted)]">
               Hali xabar yo'q. Birinchi bo'lib yozing.
            </p>

            <!-- Oldest first, newest at the bottom, the way a conversation reads. The
                 scroll is pinned to the bottom on open and after sending — see below. -->
            <div v-else ref="scroller" class="n-chat-scroll space-y-2">
               <div v-for="m in s.chatThread" :key="m.id" class="flex"
                  :class="m.from_me ? 'justify-end' : 'justify-start'">
                  <div class="n-bubble" :class="m.from_me ? 'is-mine' : ''">
                     <p class="whitespace-pre-wrap break-words">{{ m.text }}</p>
                     <p class="n-bubble-meta">
                        {{ fmtTime(m.created_at) }}
                        <!-- Read state is shown ONLY on your own messages: on theirs it
                             would be telling you what you already know. -->
                        <span v-if="m.from_me">· {{ m.read_at ? "o'qildi" : 'yuborildi' }}</span>
                     </p>
                  </div>
               </div>
            </div>

            <div class="flex items-end gap-2 mt-3 pt-3"
               style="border-top: 1px solid var(--n-line-soft)">
               <textarea v-model="draft" rows="1" class="inp n-chat-input" placeholder="Xabar..."
                  @keydown.enter.exact.prevent="send()"></textarea>
               <button class="btn-primary shrink-0" :disabled="!draft.trim() || s.chatSending"
                  @click="send()">
                  {{ s.chatSending ? '...' : 'Yuborish' }}
               </button>
            </div>
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNazoratStore } from '../../stores/nazorat'
import { fmtDateTime, fmtTime, initials } from './shared'

const s = useNazoratStore()
const route = useRoute()
const router = useRouter()

/** Which conversation is open, carried in the URL rather than in a ref — the same rule
 *  the Jurnal's filter follows. The phone's back gesture then closes the thread instead
 *  of leaving the panel, and a conversation can be linked to. */
const peer = computed(() =>
   typeof route.query.suhbat === 'string' && route.query.suhbat ? route.query.suhbat : '')
const draft = ref('')
const scroller = ref<HTMLElement | null>(null)

function open(role: string) {
   router.push({ path: route.path, query: { suhbat: role } })
}

/** Pinned to the bottom: a conversation opens at its newest message, not its oldest. */
async function toBottom() {
   await nextTick()
   if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function send() {
   const text = draft.value
   if (!text.trim() || !peer.value) return
   // Cleared BEFORE the await, so a slow network cannot make the reader think the
   // message was lost and type it again.
   draft.value = ''
   const ok = await s.sendChat(peer.value, text)
   if (!ok) draft.value = text
   await toBottom()
}

/** Opening a thread is what marks it read — the panel can observe its own reader, so it
 *  says so rather than inferring it from anything else. */
async function enter(role: string) {
   if (!role) return
   await s.loadChatThread(role)
   await s.markChatRead(role)
   await s.loadChatPeers()
   await toBottom()
}

watch(peer, (role) => {
   draft.value = ''
   if (role) enter(role)
   else s.loadChatPeers()
})

/** Polling, because this is a chat and a message that arrives in ten seconds is worth
 *  more than a websocket to maintain for three accounts. Whichever view is open refreshes
 *  itself: the thread silently (no skeleton, so it does not blink), the inbox wholesale. */
let timer: number | undefined
onMounted(async () => {
   await s.loadChatPeers()
   if (peer.value) await enter(peer.value)
   timer = window.setInterval(async () => {
      if (document.hidden) return   // a backgrounded tab polls nothing
      if (peer.value) {
         await s.loadChatThread(peer.value, true)
         await s.markChatRead(peer.value)
      } else {
         await s.loadChatPeers()
         await s.loadChatUnread()
      }
   }, 10000)
})
onUnmounted(() => { if (timer) window.clearInterval(timer) })
</script>

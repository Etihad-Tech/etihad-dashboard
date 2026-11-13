<template>
  <BaseModal :open="open" :title="title" width="sm:max-w-2xl" @close="emit('close')">
    <template #head>
      <span v-if="post?.is_sent" class="chip chip-green"><font-awesome-icon icon="check" class="w-2.5 h-2.5" />Yuborilgan</span>
    </template>

    <form id="post-form" class="space-y-4" @submit.prevent="save">
      <fieldset :disabled="locked" class="space-y-4">
        <div class="grid grid-cols-[6rem_8rem_1fr] gap-3 items-end">
          <div>
            <label class="label" for="pf-day">Kun</label>
            <input id="pf-day" v-model.number="form.day_number" type="number" min="0" max="365" class="input tabular-nums" required />
          </div>
          <div>
            <label class="label" for="pf-time">Vaqt</label>
            <input id="pf-time" v-model="form.scheduled_time" type="time" :step="form.scheduled_time.length > 5 ? 1 : 60" class="input tabular-nums" required />
          </div>
          <p class="text-sm text-gray-500 pb-2 truncate">
            {{ dayHint }}
            <span v-if="post?.delay_minutes" class="text-amber-700 font-medium"> · {{ fmtDelay(post.delay_minutes) }}</span>
          </p>
        </div>

        <div>
          <div class="flex items-end gap-1 mb-1">
            <label class="label mb-0 mr-auto" for="pf-text">{{ isPoll ? 'Savol' : 'Matn' }}</label>
            <template v-if="!isPoll">
              <button type="button" class="icon-btn w-7 h-7" title="Qalin" @click="wrap('b')"><font-awesome-icon icon="bold" class="w-3 h-3" /></button>
              <button type="button" class="icon-btn w-7 h-7" title="Kursiv" @click="wrap('i')"><font-awesome-icon icon="italic" class="w-3 h-3" /></button>
            </template>
          </div>
          <textarea id="pf-text" ref="textBox" v-model="form.message_text" rows="7" class="input" required></textarea>
          <div v-if="isPoll" class="flex flex-wrap gap-1.5 mt-2">
            <span v-for="o in options" :key="o" class="chip chip-gray">{{ o }}</span>
          </div>
          <p v-if="media" class="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500">
            <font-awesome-icon :icon="media.icon" class="w-3.5 h-3.5 text-gray-400" />
            {{ media.label }}<template v-if="media.count > 1"> · {{ media.count }} ta</template>
          </p>
        </div>

        <div class="flex flex-wrap gap-x-6 gap-y-4">
          <div>
            <span class="label">Qayerga</span>
            <div class="seg flex-wrap">
              <button v-for="o in placeChoices" :key="String(o.slot)" type="button" class="seg-btn"
                :class="{ 'seg-btn-on': form.topic_slot === o.slot }" @click="form.topic_slot = o.slot">
                {{ o.label }}
              </button>
            </div>
          </div>
          <div v-if="!isPoll">
            <label class="label" for="pf-cabinet">Kabinetga</label>
            <select id="pf-cabinet" :value="cabinetChoice" class="input w-auto pr-8"
              @change="pickCabinet(($event.target as HTMLSelectElement).value)">
              <option v-for="c in CABINET_CHOICES" :key="c.key" :value="c.key"
                :disabled="c.key === 'only' && !!cabinetBlock" :title="c.key === 'only' ? cabinetBlock : ''">
                {{ c.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex flex-wrap gap-x-6 gap-y-3">
          <label v-if="!cabinetOnly" class="flex items-center gap-2.5 text-sm text-gray-700">
            <ToggleSwitch v-model="form.pin_message" />Guruhda qadash
          </label>
          <label class="flex items-center gap-2.5 text-sm text-gray-700">
            <ToggleSwitch v-model="form.is_active" />Faol
          </label>
          <label class="flex items-center gap-2.5 text-sm text-gray-700" title="Botlar ishga tushirilganda darhol yuboriladi">
            <ToggleSwitch :model-value="form.send_mode === 'now'" @update:model-value="v => form.send_mode = v ? 'now' : 'scheduled'" />Hoziroq
          </label>
        </div>

        <div v-if="!cabinetOnly && !isPoll">
          <span class="label">Tugmalar</span>
          <div class="space-y-2">
            <div v-for="(b, i) in buttons" :key="i" class="flex items-center gap-2">
              <input v-model="b.name" class="input input-sm w-40 shrink-0" placeholder="Nomi" required />
              <input v-model="b.link" class="input input-sm" type="url" placeholder="https://" />
              <button type="button" class="icon-btn icon-btn-danger" title="Olib tashlash" @click="buttons.splice(i, 1)">
                <font-awesome-icon icon="xmark" class="w-3.5 h-3.5" />
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-ghost -ml-2" @click="buttons.push({ position: buttons.length + 1, name: '', link: '' })">
              <font-awesome-icon icon="plus" class="w-3 h-3" />Tugma
            </button>
          </div>
        </div>
      </fieldset>
      <p v-if="error" class="error-text">{{ error }}</p>
    </form>

    <template #footer>
      <button v-if="post" type="button" class="btn btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700 mr-auto" :disabled="busy" @click="remove">
        <font-awesome-icon icon="trash" class="w-3.5 h-3.5" /><span class="hidden sm:inline">O'chirish</span>
      </button>
      <button v-if="kind === 'trip' && post && !post.is_sent" type="button" class="btn btn-secondary" :disabled="busy" @click="sendNow">
        <font-awesome-icon icon="paper-plane" class="w-3.5 h-3.5" />Hozir<span class="hidden sm:inline">&nbsp;yuborish</span>
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('close')">{{ locked ? 'Yopish' : 'Bekor qilish' }}</button>
      <button v-if="!locked" type="submit" form="post-form" class="btn btn-primary" :disabled="busy">
        {{ busy ? 'Saqlanmoqda…' : 'Saqlash' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import BaseModal from '../../../components/BaseModal.vue'
import ToggleSwitch from '../../../components/ToggleSwitch.vue'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'
import { errorText, posts as postsApi, type Post, type PostButton, type PostFields, type PostKind, type TopicSlot, type Trip } from '../api'
import { CABINET_CHOICES, NEW_POST_PLACE, cabinetChoiceOf, dayDate, fmtDate, fmtDelay, mediaInfo, pollOptions, topicLabel, tripTopics } from '../format'

// Every setting of one post on one screen (owner, 2026-11-10) — the bot spreads them over
// a screen per flag. Media stays with the bot (it is the bot's own Telegram file);
// here it is shown, not changed.
const props = defineProps<{
  open: boolean
  kind: PostKind
  /** The trip id or the template id the post belongs to. */
  ownerId: string | number
  /** null = a new post. */
  post: Post | null
  trip?: Trip | null
  templateCabinetDefault?: boolean | null
  /** A new post's day: the day the list is filtered to. */
  defaultDay?: number | null
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const toast = useToast()
const { confirm } = useConfirm()

const form = reactive({
  day_number: 1,
  scheduled_time: '09:00',
  message_text: '',
  topic_slot: 1 as TopicSlot,
  pin_message: false,
  is_active: true,
  send_mode: 'scheduled' as 'scheduled' | 'now',
})
/** to_cabinet as stored: null = follow the template (a template post only). */
const toCabinet = ref<boolean | null>(false)
const buttons = ref<PostButton[]>([])
const savedButtons = ref('[]')
const busy = ref(false)
const error = ref('')
const textBox = ref<HTMLTextAreaElement | null>(null)

/** Bold / italic around the selected words — the post is sent as HTML, as the bot sends it. */
function wrap(tag: 'b' | 'i') {
  const el = textBox.value
  if (!el) return
  const { selectionStart: a, selectionEnd: b } = el
  const v = form.message_text
  form.message_text = `${v.slice(0, a)}<${tag}>${v.slice(a, b)}</${tag}>${v.slice(b)}`
  nextTick(() => {
    el.focus()
    el.setSelectionRange(a + tag.length + 2, b + tag.length + 2)
  })
}

watch(() => props.open, async (v) => {
  if (!v) return
  error.value = ''
  const p = props.post
  form.day_number = p?.day_number ?? props.defaultDay ?? 1
  // A time with seconds keeps them (a template post may go out at 09:30:15).
  const t = p?.scheduled_time ?? '09:00'
  form.scheduled_time = t.length > 5 && !t.endsWith(':00') ? t.slice(0, 8) : t.slice(0, 5)
  form.message_text = p?.message_text ?? ''
  // a new post: «Kabinet va guruhga» in the announcements topic, the bot's own default (2026-11-13)
  form.topic_slot = p ? p.topic_slot : NEW_POST_PLACE.topic_slot!
  form.pin_message = p?.pin_message ?? false
  form.is_active = p?.is_active ?? true
  form.send_mode = p?.send_mode ?? 'scheduled'
  toCabinet.value = !p ? NEW_POST_PLACE.to_cabinet! : props.kind === 'trip' ? !!p.to_cabinet : p.to_cabinet
  buttons.value = []
  savedButtons.value = '[]'
  if (p && !pollOptions(p).length) {
    try {
      buttons.value = (await postsApi.buttons(props.kind, p.id)).map(b => ({ position: b.position, name: b.name, link: b.link || '' }))
      savedButtons.value = JSON.stringify(wantedButtons())
    } catch { /* the form still opens */ }
  }
})

const title = computed(() => (props.post ? `${props.post.day_number}-kun · ${props.post.scheduled_time.slice(0, 5)}` : 'Yangi post'))
const locked = computed(() => !!props.post?.is_sent)
const options = computed(() => (props.post ? pollOptions(props.post) : []))
const isPoll = computed(() => options.value.length > 0)
const media = computed(() => (props.post ? mediaInfo(props.post) : null))
const cabinetOnly = computed(() => form.topic_slot === 0)

const dayHint = computed(() => {
  if (!props.trip) return ''
  const d = dayDate(props.trip.start_date, Number(form.day_number))
  return d ? fmtDate(d, true) : ''
})

/** Why «Faqat kabinetga» cannot be chosen for this post, or ''. The pilgrim bot takes the
 *  text and, since 2026-11-11, the media too; the post's buttons do not reach it. */
const cabinetBlock = computed(() => {
  if (isPoll.value) return "So'rovnoma kabinetga yuborilmaydi"
  if (buttons.value.some(b => b.name.trim())) return 'Tugmalar kabinet botiga yetmaydi — ularni olib tashlang'
  return ''
})

const placeChoices = computed(() => {
  const list: { slot: TopicSlot; label: string }[] = []
  if (props.kind === 'template') {
    list.push({ slot: 1, label: topicLabel(1) }, { slot: 2, label: topicLabel(2) }, { slot: null, label: topicLabel(null) })
  } else {
    const topics = tripTopics(props.trip ?? null)
    if (topics.length === 0) list.push({ slot: 1, label: 'Guruhga' })
    for (const t of topics) list.push({ slot: t.slot, label: topicLabel(t.slot) })
    if (topics.length > 1) list.push({ slot: null, label: topicLabel(null) })
    // a post that already has a choice this trip does not show keeps it visible
    if (!list.some(o => o.slot === form.topic_slot) && form.topic_slot !== 0) {
      list.push({ slot: form.topic_slot, label: topicLabel(form.topic_slot) })
    }
  }
  return list
})

// «Faqat kabinetga» is chosen under «Kabinetga», not «Qayerga» (owner, 2026-11-11).
const cabinetChoice = computed(() => cabinetChoiceOf(form.topic_slot, toCabinet.value, props.templateCabinetDefault))

function pickCabinet(key: string) {
  const c = CABINET_CHOICES.find(o => o.key === key)
  if (!c) return
  if (c.fields.topic_slot !== undefined) form.topic_slot = c.fields.topic_slot
  else if (cabinetOnly.value) form.topic_slot = placeChoices.value[0]!.slot
  toCabinet.value = c.fields.to_cabinet ?? null
}

function fields(): PostFields {
  const f: PostFields = { ...form, day_number: Number(form.day_number) }
  if (!isPoll.value) f.to_cabinet = toCabinet.value
  return f
}

/** The buttons as they will be stored: named ones only, numbered in order. */
function wantedButtons(): PostButton[] {
  return buttons.value
    .filter(b => b.name.trim())
    .map((b, i) => ({ position: i + 1, name: b.name.trim(), link: b.link?.trim() || null }))
}

/** Write the form to the server; the post's id. */
async function persist(): Promise<number> {
  let id = props.post?.id
  const wanted = cabinetOnly.value || isPoll.value ? [] : wantedButtons()
  const buttonsChanged = JSON.stringify(wanted) !== savedButtons.value
  // Buttons are cleared first, so the post may become «Faqat kabinetga» in the same save.
  if (id && buttonsChanged && wanted.length === 0) await postsApi.saveButtons(props.kind, id, [])
  if (id) await postsApi.update(props.kind, id, fields())
  else id = (await postsApi.create(props.kind, props.ownerId, fields())).id
  if (buttonsChanged && wanted.length) await postsApi.saveButtons(props.kind, id, wanted)
  savedButtons.value = JSON.stringify(wanted)
  return id
}

async function save() {
  busy.value = true
  error.value = ''
  try {
    await persist()
    toast.success(props.post ? 'Saqlandi' : "Post qo'shildi")
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = errorText(e, "Saqlab bo'lmadi")
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!props.post || !(await confirm({ title: "Postni o'chirish" }))) return
  busy.value = true
  try {
    await postsApi.bulk(props.kind, { ids: [props.post.id], action: 'delete' })
    toast.success("O'chirildi")
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
  }
}

async function sendNow() {
  if (!props.post) return
  const where = cabinetOnly.value ? 'ziyoratchilar kabinetiga' : 'guruhga'
  if (!(await confirm({ title: 'Hozir yuborish', message: `Post hoziroq ${where} yuboriladi`, confirmText: 'Yuborish' }))) return
  busy.value = true
  error.value = ''
  try {
    // What is on the screen is what goes out.
    await persist()
    await postsApi.sendNow(props.post.id)
    toast.success('Yuborildi')
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = errorText(e, "Yuborib bo'lmadi")
  } finally {
    busy.value = false
  }
}
</script>

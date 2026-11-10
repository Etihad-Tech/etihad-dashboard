<template>
  <BaseModal :open="open" :title="trip ? 'Safarni tahrirlash' : 'Yangi safar'" @close="emit('close')">
    <form id="trip-form" class="space-y-4" @submit.prevent="save">
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-3">
        <div>
          <label class="label" for="tf-name">Nomi</label>
          <input id="tf-name" v-model="form.name" class="input" required placeholder="Taj 13 kun" />
        </div>
        <div>
          <label class="label" for="tf-id">Safar ID</label>
          <input id="tf-id" v-model="form.trip_id" class="input font-mono" required :disabled="!!trip" placeholder="006-2026" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="tf-start">Uchish</label>
          <input id="tf-start" v-model="form.start_date" type="date" class="input" />
        </div>
        <div>
          <label class="label" for="tf-end">Qaytish</label>
          <input id="tf-end" v-model="form.end_date" type="date" class="input" :min="form.start_date || undefined" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="label" for="tf-chat">Guruh chat ID</label>
          <input id="tf-chat" v-model="form.group_chat_id" class="input font-mono" placeholder="-100…" />
        </div>
        <div>
          <label class="label" for="tf-link">Guruh havolasi</label>
          <input id="tf-link" v-model="form.group_invite_link" class="input" placeholder="https://t.me/+…" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="tf-topic1">E'lonlar mavzusi ID</label>
          <input id="tf-topic1" v-model.number="form.topic_id" type="number" min="1" class="input tabular-nums" />
        </div>
        <div>
          <label class="label" for="tf-topic2">2-mavzu ID</label>
          <input id="tf-topic2" v-model.number="form.topic_id_2" type="number" min="1" class="input tabular-nums" />
        </div>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
    </form>
    <template #footer>
      <button v-if="trip" type="button" class="btn btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700 mr-auto" @click="remove">
        <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />O'chirish
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('close')">Bekor qilish</button>
      <button type="submit" form="trip-form" class="btn btn-primary" :disabled="busy">{{ busy ? 'Saqlanmoqda…' : trip ? 'Saqlash' : 'Yaratish' }}</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseModal from '../../../components/BaseModal.vue'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'
import { errorText, trips as tripsApi, type Trip } from '../api'

// A trip's own settings — name, dates, its group and the group's topics — in one form.
const props = defineProps<{ open: boolean; trip?: Trip | null }>()
const emit = defineEmits<{ close: []; saved: [trip: Trip]; removed: [] }>()
const toast = useToast()
const { confirm } = useConfirm()

const blank = () => ({
  trip_id: '', name: '', start_date: '', end_date: '', group_chat_id: '', group_invite_link: '',
  topic_id: null as number | null, topic_id_2: null as number | null,
})
const form = reactive(blank())
const busy = ref(false)
const error = ref('')

watch(() => props.open, (v) => {
  if (!v) return
  error.value = ''
  const t = props.trip
  Object.assign(form, blank(), t ? {
    trip_id: t.trip_id, name: t.name, start_date: t.start_date?.slice(0, 10) || '', end_date: t.end_date?.slice(0, 10) || '',
    group_chat_id: t.group_chat_id || '', group_invite_link: t.group_invite_link || '',
    topic_id: t.topic_id, topic_id_2: t.topic_id_2,
  } : {})
})

async function save() {
  busy.value = true
  error.value = ''
  const body: Partial<Trip> = {
    name: form.name.trim(),
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    group_chat_id: form.group_chat_id.trim() || null,
    group_invite_link: form.group_invite_link.trim() || null,
  }
  try {
    let saved: Trip
    if (props.trip) {
      // An emptied topic is sent as 0, the API's «clear it»; an untouched one is left out.
      const topics: Partial<Trip> = {}
      if ((form.topic_id || null) !== props.trip.topic_id) topics.topic_id = form.topic_id || 0
      if ((form.topic_id_2 || null) !== props.trip.topic_id_2) topics.topic_id_2 = form.topic_id_2 || 0
      saved = await tripsApi.update(props.trip.trip_id, { ...body, ...topics })
    } else {
      saved = await tripsApi.create({
        ...body, trip_id: form.trip_id.trim(),
        topic_id: form.topic_id || null, topic_id_2: form.topic_id_2 || null,
      })
    }
    toast.success(props.trip ? 'Saqlandi' : 'Safar yaratildi')
    emit('saved', saved)
    emit('close')
  } catch (e) {
    error.value = errorText(e, "Saqlab bo'lmadi")
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!props.trip) return
  if (!(await confirm({ title: "Safarni o'chirish", message: "Postlar, ishtirokchilar va javoblar ham o'chadi" }))) return
  try {
    await tripsApi.remove(props.trip.trip_id)
    toast.success("Safar o'chirildi")
    emit('close')
    emit('removed')
  } catch (e) {
    error.value = errorText(e)
  }
}
</script>

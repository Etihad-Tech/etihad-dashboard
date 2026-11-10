<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <h1 class="page-title">Post shablonlari</h1>
        <div v-if="list.length > 8" class="relative w-full sm:w-64 order-last sm:order-none">
          <font-awesome-icon icon="magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input v-model="search" type="search" class="input pl-9" placeholder="Shablon nomi" />
        </div>
        <button class="btn btn-primary" @click="openCreate">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />Yangi shablon
        </button>
      </div>

      <div v-if="loading" class="card divide-y divide-gray-100">
        <div v-for="i in 4" :key="i" class="px-4 py-4"><div class="h-3.5 w-48 rounded bg-gray-100"></div></div>
      </div>
      <p v-else-if="loadError" class="card empty text-rose-600">{{ loadError }}</p>
      <div v-else-if="shown.length === 0" class="card empty">{{ search ? 'Topilmadi' : "Shablonlar yo'q" }}</div>

      <div v-else class="card overflow-x-auto">
        <table class="table sm:min-w-[520px]">
          <thead><tr><th>Shablon</th><th class="text-right">Postlar</th><th class="hidden sm:table-cell"></th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in shown" :key="t.id" class="cursor-pointer" @click="router.push(`/team/templates/${t.id}`)">
              <td class="max-w-md">
                <p class="font-medium text-gray-900 truncate">{{ t.name }}</p>
                <p v-if="t.description" class="text-xs text-gray-400 truncate">{{ t.description }}</p>
              </td>
              <td class="text-right tabular-nums text-gray-700">{{ t.post_count ?? 0 }}</td>
              <td class="hidden sm:table-cell"><span v-if="t.to_cabinet" class="chip chip-violet">+ Kabinet</span></td>
              <td class="text-right whitespace-nowrap" @click.stop>
                <button class="icon-btn" title="Nusxa olish" @click="copy(t)">
                  <font-awesome-icon icon="copy" class="w-3.5 h-3.5" /><span class="sr-only">Nusxa olish</span>
                </button>
                <button class="icon-btn icon-btn-danger" title="O'chirish" @click="remove(t)">
                  <font-awesome-icon icon="trash" class="w-3.5 h-3.5" /><span class="sr-only">O'chirish</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal :open="createOpen" title="Yangi shablon" @close="createOpen = false">
      <form id="tpl-create" class="space-y-4" @submit.prevent="create">
        <div>
          <label class="label" for="tc-name">Nomi</label>
          <input id="tc-name" v-model="draft.name" class="input" required placeholder="Comfort 13 kun" />
        </div>
        <div>
          <label class="label" for="tc-desc">Izoh</label>
          <input id="tc-desc" v-model="draft.description" class="input" />
        </div>
        <p v-if="formError" class="error-text">{{ formError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="createOpen = false">Bekor qilish</button>
        <button type="submit" form="tpl-create" class="btn btn-primary" :disabled="busy">Yaratish</button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import BaseModal from '../../../../components/BaseModal.vue'
import { useConfirm } from '../../../../composables/useConfirm'
import { useToast } from '../../../../composables/useToast'
import { errorText, templates as templatesApi, type Template } from '../../api'

const router = useRouter()
const toast = useToast()
const { confirm } = useConfirm()

const list = ref<Template[]>([])
const loading = ref(true)
const loadError = ref('')
const search = ref('')
const createOpen = ref(false)
const draft = reactive({ name: '', description: '' })
const formError = ref('')
const busy = ref(false)

async function load() {
  try {
    list.value = await templatesApi.list()
  } catch (e) {
    loadError.value = errorText(e, "Shablonlarni yuklab bo'lmadi")
  } finally {
    loading.value = false
  }
}
onMounted(load)

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  const rows = q ? list.value.filter(t => t.name.toLowerCase().includes(q)) : list.value
  return rows.slice().sort((a, b) => a.name.localeCompare(b.name))
})

function openCreate() {
  draft.name = ''
  draft.description = ''
  formError.value = ''
  createOpen.value = true
}

async function create() {
  busy.value = true
  try {
    const t = await templatesApi.create({ name: draft.name.trim(), description: draft.description.trim() || undefined })
    createOpen.value = false
    router.push(`/team/templates/${t.id}`)
  } catch (e) {
    formError.value = errorText(e, "Yaratib bo'lmadi")
  } finally {
    busy.value = false
  }
}

async function copy(t: Template) {
  let name = `${t.name} (nusxa)`
  for (let i = 2; list.value.some(x => x.name === name); i++) name = `${t.name} (nusxa ${i})`
  try {
    const c = await templatesApi.copy(t.id, name)
    toast.success(`«${c.name}» yaratildi`)
    await load()
  } catch (e) {
    toast.error(errorText(e))
  }
}

async function remove(t: Template) {
  if (!(await confirm({ title: `«${t.name}» shablonini o'chirish`, message: `${t.post_count ?? 0} ta posti ham o'chadi. Safarlarga qo'shilgan postlar qoladi.` }))) return
  try {
    await templatesApi.remove(t.id)
    list.value = list.value.filter(x => x.id !== t.id)
    toast.success("O'chirildi")
  } catch (e) {
    toast.error(errorText(e))
  }
}
</script>

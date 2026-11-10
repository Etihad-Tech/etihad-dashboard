<template>
  <AppShell>
    <div class="page">
      <div class="page-head">
        <router-link to="/team/templates" class="icon-btn" title="Shablonlar">
          <font-awesome-icon icon="arrow-left" class="w-4 h-4" />
          <span class="sr-only">Shablonlar</span>
        </router-link>
        <div class="min-w-0 mr-auto">
          <h1 class="text-xl font-semibold tracking-tight text-gray-900 truncate">{{ tpl?.name || 'Shablon' }}</h1>
          <p v-if="tpl?.description" class="text-sm text-gray-500 truncate">{{ tpl.description }}</p>
        </div>
        <template v-if="tpl">
          <label class="flex items-center gap-2 text-sm text-gray-700 mr-1" title="«Shablon bo'yicha» qoldirilgan postlar uchun">
            <ToggleSwitch :model-value="!!tpl.to_cabinet" @update:model-value="setCabinet" />Kabinetga ham
          </label>
          <button class="btn btn-primary" @click="importOpen = true">
            <font-awesome-icon icon="plane-arrival" class="w-3.5 h-3.5" />Safarlarga qo'shish
          </button>
          <button class="icon-btn" title="Tahrirlash" @click="openEdit">
            <font-awesome-icon icon="pen" class="w-3.5 h-3.5" /><span class="sr-only">Tahrirlash</span>
          </button>
        </template>
      </div>

      <p v-if="loadError" class="card empty text-rose-600">{{ loadError }}</p>
      <PostList v-else kind="template" :posts="rows" :template-cabinet="tpl?.to_cabinet" :loading="loading" @open="openPost" @changed="loadPosts">
        <template #actions>
          <button class="btn btn-secondary" @click="openPost(null)">
            <font-awesome-icon icon="plus" class="w-3.5 h-3.5" />Post
          </button>
        </template>
      </PostList>
    </div>

    <PostForm :open="postOpen" kind="template" :owner-id="tplId" :post="editing" :template-cabinet-default="tpl?.to_cabinet"
      @close="postOpen = false" @saved="loadPosts" />
    <ImportDialog :open="importOpen" mode="trips" :template="tpl" @close="importOpen = false" />

    <BaseModal :open="editOpen" title="Shablonni tahrirlash" @close="editOpen = false">
      <form id="tpl-edit" class="space-y-4" @submit.prevent="saveEdit">
        <div>
          <label class="label" for="te-name">Nomi</label>
          <input id="te-name" v-model="draft.name" class="input" required />
        </div>
        <div>
          <label class="label" for="te-desc">Izoh</label>
          <input id="te-desc" v-model="draft.description" class="input" />
        </div>
        <p v-if="editError" class="error-text">{{ editError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="editOpen = false">Bekor qilish</button>
        <button type="submit" form="tpl-edit" class="btn btn-primary">Saqlash</button>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '../../../../components/AppShell.vue'
import BaseModal from '../../../../components/BaseModal.vue'
import ToggleSwitch from '../../../../components/ToggleSwitch.vue'
import { useToast } from '../../../../composables/useToast'
import { errorText, posts as postsApi, templates as templatesApi, type Post, type Template } from '../../api'
import ImportDialog from '../../components/ImportDialog.vue'
import PostForm from '../../components/PostForm.vue'
import PostList from '../../components/PostList.vue'

// A template's posts, edited the same way as a trip's, and put into any number of trips.
const route = useRoute()
const toast = useToast()
const tplId = Number(route.params.id)

const tpl = ref<Template | null>(null)
const rows = ref<Post[]>([])
const loading = ref(true)
const loadError = ref('')
const postOpen = ref(false)
const editing = ref<Post | null>(null)
const importOpen = ref(false)
const editOpen = ref(false)
const draft = reactive({ name: '', description: '' })
const editError = ref('')

async function loadPosts() {
  try {
    rows.value = await postsApi.list('template', tplId)
  } catch (e) {
    toast.error(errorText(e, "Postlarni yuklab bo'lmadi"))
  }
}

onMounted(async () => {
  try {
    tpl.value = (await templatesApi.list()).find(t => t.id === tplId) ?? null
    if (!tpl.value) loadError.value = 'Shablon topilmadi'
    else await loadPosts()
  } catch (e) {
    loadError.value = errorText(e, "Shablonni yuklab bo'lmadi")
  } finally {
    loading.value = false
  }
})

function openPost(p: Post | null) {
  editing.value = p
  postOpen.value = true
}

async function setCabinet(v: boolean) {
  try {
    tpl.value = await templatesApi.update(tplId, { to_cabinet: v })
  } catch (e) {
    toast.error(errorText(e))
  }
}

function openEdit() {
  draft.name = tpl.value?.name ?? ''
  draft.description = tpl.value?.description ?? ''
  editError.value = ''
  editOpen.value = true
}

async function saveEdit() {
  try {
    tpl.value = await templatesApi.update(tplId, { name: draft.name.trim(), description: draft.description.trim() })
    editOpen.value = false
    toast.success('Saqlandi')
  } catch (e) {
    editError.value = errorText(e, "Saqlab bo'lmadi")
  }
}
</script>

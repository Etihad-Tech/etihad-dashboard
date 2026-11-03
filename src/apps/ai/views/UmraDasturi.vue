<template>
  <AppShell>
    <div class="page">
      <!-- ───────────── Header ───────────── -->
      <div v-if="!editing" class="page-head">
        <h1 class="page-title">Umra dasturi</h1>
        <div class="seg">
          <button class="seg-btn" :class="{ 'seg-btn-on': tab === 'shablonlar' }" @click="tab = 'shablonlar'">Shablonlar</button>
          <button class="seg-btn" :class="{ 'seg-btn-on': tab === 'joylar' }" @click="tab = 'joylar'">Joylar</button>
        </div>
        <button v-if="tab === 'shablonlar'" @click="openCreate()" class="btn btn-primary">
          <font-awesome-icon icon="plus" class="w-3.5 h-3.5" /> Yangi dastur
        </button>
      </div>

      <div v-else class="space-y-2">
        <button @click="closeEditor" class="btn btn-ghost btn-sm -ml-2.5">
          <font-awesome-icon icon="arrow-left" class="w-3 h-3" /> Umra dasturi
        </button>
        <div class="page-head">
          <h1 class="page-title truncate min-w-0">{{ editing.name }}</h1>
          <div class="flex flex-wrap items-center gap-2">
            <button @click="previewOpen = true" class="btn btn-ghost">
              <font-awesome-icon icon="eye" class="w-3.5 h-3.5" /> Ko'rish
            </button>
            <button @click="openCopy(editing)" class="btn btn-ghost">
              <font-awesome-icon icon="copy" class="w-3.5 h-3.5" /> Nusxalash
            </button>
            <!-- Russian: fills what is still untranslated; when nothing is missing, offers
                 to redo the whole programme (the office's own edits included). -->
            <button @click="translateProgram" :disabled="translating || dirty" :title="dirty ? 'Avval saqlang' : ''"
              class="btn" :class="editing.ru_missing ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'btn-ghost'">
              <font-awesome-icon icon="language" class="w-3.5 h-3.5" />
              {{ translating ? 'Tarjima qilinmoqda...' : (editing.ru_missing ? `Ruscha (${editing.ru_missing} yo'q)` : 'Ruscha: to\'liq') }}
            </button>
            <button v-if="!editing.is_template" @click="revertToTemplate(editing.group_telegram_id!)"
              class="btn btn-ghost text-rose-600 hover:text-rose-700 hover:bg-rose-50">
              <font-awesome-icon icon="rotate-right" class="w-3.5 h-3.5" /> Shablonga qaytarish
            </button>
            <button @click="saveItems" :disabled="!dirty || saving" class="btn btn-primary">
              {{ saving ? 'Saqlanmoqda...' : (dirty ? 'Saqlash' : 'Saqlangan') }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <template v-if="editing.is_template">
            <span class="chip" :class="editing.crm_package ? 'chip-amber' : 'chip-gray'">{{ editing.crm_package || 'Paketsiz' }}</span>
            <span class="chip chip-gray">{{ cellLabel(editing.days, editing.tier) }}</span>
            <span class="chip chip-gray">{{ planeLabel(editing.city_order) }}</span>
            <span v-if="nightsLabel(editing)" class="chip chip-gray">{{ nightsLabel(editing) }}</span>
          </template>
          <template v-else>
            <span class="chip chip-violet">{{ editing.group?.title || editing.group_telegram_id }}</span>
            <template v-if="editing.group?.shape">
              <span class="chip chip-gray">{{ cellLabel(editing.group.shape.days, editing.group.shape.tier) }}</span>
              <span class="chip chip-gray">{{ planeLabel(editing.group.shape.order) }}</span>
            </template>
          </template>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><div class="spinner"></div></div>

      <!-- ───────────── Grid of cells ───────────── -->
      <template v-else-if="!editing && tab === 'shablonlar'">
        <!-- ───── Packages from the CRM ───── -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 class="section-title">Paketlar ({{ packages.length }})</h2>
          <span v-if="!pkgConfigured" class="text-xs text-rose-600">CRM ulanmagan</span>
          <span v-else class="text-xs text-gray-500">{{ pkgSyncedAt ? `Sinxron: ${fmtDateTime(pkgSyncedAt)}` : 'Sinxronlanmagan' }}</span>
          <span v-if="pkgConflicts" class="text-xs text-amber-700">· {{ pkgConflicts }} chatda ikki paket</span>
          <button v-if="pkgConfigured" @click="syncPackages" :disabled="syncing" class="btn btn-secondary btn-sm ml-auto">
            <font-awesome-icon icon="rotate-right" class="w-3 h-3" :class="syncing ? 'animate-spin' : ''" />
            {{ syncing ? 'Sinxronlanmoqda...' : 'CRM bilan sinxronlash' }}
          </button>
        </div>

        <div v-if="packages.length === 0" class="card empty">Paketlar yo'q</div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div v-for="pk in packages" :key="'p' + pk.name" class="card p-4 flex flex-col gap-3"
            :class="pk.template ? '' : 'border-rose-200'">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-base font-semibold text-gray-900 leading-tight truncate">{{ pk.name }}</p>
                <p v-if="pk.template" class="text-xs text-gray-500 mt-0.5">
                  {{ cellLabel(pk.template.days, pk.template.tier) }} · {{ planeLabel(pk.template.city_order) }} · {{ nightsLabel(pk.template) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="chip" :class="pk.template ? 'chip-green' : 'chip-red'">{{ pk.template ? 'dastur bor' : 'dastur yo\'q' }}</span>
                <span v-if="!pk.in_crm" class="chip chip-amber">CRMda yo'q</span>
              </div>
            </div>

            <div class="text-sm">
              <p v-if="pk.template" class="font-medium text-gray-800 truncate">{{ pk.template.name }}
                <span class="text-gray-400 font-normal">· {{ pk.template.items_count }} band</span></p>
              <p class="text-xs text-gray-500 mt-1">
                {{ pk.groups_total }} guruh<template v-if="pk.groups_total">:
                  <span v-if="pk.on_template" class="text-gray-700">{{ pk.on_template }} dasturda</span>
                  <span v-if="pk.customized" class="text-gray-700"> · {{ pk.customized }} moslashtirilgan</span>
                  <span v-if="pk.fallback" class="text-amber-700"> · {{ pk.fallback }} paketsiz shablonda</span>
                  <span v-if="pk.without" class="text-rose-600"> · {{ pk.without }} dastursiz</span>
                </template>
                <span class="text-gray-400"> · CRMda {{ pk.crm_groups }}</span>
              </p>
              <p v-if="pk.template && pk.template.items_count" class="text-xs mt-1" :class="pk.template.ru_missing ? 'text-amber-600' : 'text-emerald-600'">
                <font-awesome-icon icon="language" class="w-3 h-3 mr-0.5" />
                {{ pk.template.ru_missing ? `Ruscha: ${pk.template.ru_missing} ta yo'q` : 'Ruscha to\'liq' }}
              </p>
            </div>

            <div v-if="openPkg === pk.name && pk.groups.length" class="-mx-1 max-h-48 overflow-y-auto divide-y divide-gray-100 border-y border-gray-100">
              <div v-for="g in pk.groups" :key="g.telegram_id" class="flex items-center gap-2 px-1 py-1.5 text-xs">
                <span class="flex-1 min-w-0 truncate text-gray-800">{{ g.title || g.telegram_id }}</span>
                <span v-if="g.trip_start_date" class="text-gray-400 tabular-nums">{{ fmtDate(g.trip_start_date) }}</span>
                <span class="shrink-0" :class="sourceClass(g)">{{ sourceLabel(g) }}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1 mt-auto">
              <template v-if="pk.template">
                <button @click="openProgram(pk.template.id)" class="btn btn-secondary btn-sm">
                  <font-awesome-icon icon="pen" class="w-3 h-3" /> Ochish
                </button>
                <button @click="openCopy(pk.template)" class="btn btn-ghost btn-sm">
                  <font-awesome-icon icon="copy" class="w-3 h-3" /> Nusxalash
                </button>
              </template>
              <button v-else @click="openCreate(undefined, pk.name)" class="btn btn-primary btn-sm">
                <font-awesome-icon icon="plus" class="w-3 h-3" /> Dastur yaratish
              </button>
              <button v-if="pk.groups.length" @click="openPkg = openPkg === pk.name ? null : pk.name" class="btn btn-ghost btn-sm">
                Guruhlar <font-awesome-icon icon="chevron-down" class="w-2.5 h-2.5 transition-transform" :class="openPkg === pk.name ? 'rotate-180' : ''" />
              </button>
              <button v-if="pk.template" @click="deleteTemplate(pk.template)" class="icon-btn icon-btn-danger ml-auto" title="O'chirish">
                <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- ───── Cell templates: the older kind, no package ───── -->
        <template v-if="templateCells.length">
          <h2 class="section-title pt-2">Paketsiz shablonlar ({{ templateCells.length }})</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="c in templateCells" :key="cellKey(c)" class="card p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-base font-semibold text-gray-900 leading-tight">{{ cellLabel(c.days, c.tier) }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">{{ planeLabel(c.order) }}<template v-if="c.template"> · {{ nightsLabel(c.template) }}</template></p>
                </div>
                <span class="chip chip-green shrink-0">shablon</span>
              </div>

              <div class="text-sm">
                <p class="font-medium text-gray-800 truncate">{{ c.template!.name }}
                  <span class="text-gray-400 font-normal">· {{ c.template!.items_count }} band</span></p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ c.groups_total }} guruh:
                  <span class="text-gray-700">{{ c.on_template }} shablonda</span> ·
                  <span class="text-gray-700">{{ c.customized }} moslashtirilgan</span>
                  <span v-if="c.without" class="text-rose-600"> · {{ c.without }} dastursiz</span>
                </p>
                <p v-if="c.tier_inferred" class="text-xs text-amber-600 mt-1">{{ c.tier_inferred }} guruhda Daraja avtomatik</p>
                <p v-if="c.template!.items_count" class="text-xs mt-1" :class="c.template!.ru_missing ? 'text-amber-600' : 'text-emerald-600'">
                  <font-awesome-icon icon="language" class="w-3 h-3 mr-0.5" />
                  {{ c.template!.ru_missing ? `Ruscha: ${c.template!.ru_missing} ta yo'q` : 'Ruscha to\'liq' }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-1 mt-auto">
                <button @click="openProgram(c.template!.id)" class="btn btn-secondary btn-sm">
                  <font-awesome-icon icon="pen" class="w-3 h-3" /> Ochish
                </button>
                <button @click="openCopy(c.template!)" class="btn btn-ghost btn-sm">
                  <font-awesome-icon icon="copy" class="w-3 h-3" /> Nusxalash
                </button>
                <button @click="openAttach(c.template!)" :disabled="!freePackages.length"
                  :title="freePackages.length ? '' : 'Bo\'sh paket yo\'q'"
                  class="btn btn-ghost btn-sm text-amber-700 hover:text-amber-800 hover:bg-amber-50">
                  <font-awesome-icon icon="tag" class="w-3 h-3" /> Paketga
                </button>
                <button @click="deleteTemplate(c.template!)" class="icon-btn icon-btn-danger ml-auto" title="O'chirish">
                  <font-awesome-icon icon="trash" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Groups whose computed shape has no template. Presented as GROUPS with the
             nights the office typed, not as cells: a «14 kun» here is a group whose
             12-night trip was entered as 13 nights, and the fix is on its card, not a
             new template. A real new shape is one click away all the same. -->
        <div v-if="unmatchedCells.length" class="space-y-3">
          <div class="flex items-center gap-2 pt-2">
            <font-awesome-icon icon="triangle-exclamation" class="w-4 h-4 text-amber-500" />
            <h2 class="section-title">Shablonsiz guruhlar ({{ unmatchedTotal }})</h2>
          </div>
          <div v-for="c in unmatchedCells" :key="'u' + cellKey(c)" class="card overflow-hidden border-amber-200">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 bg-amber-50/60 border-b border-amber-100">
              <span class="text-sm font-semibold text-gray-900">{{ cellLabel(c.days, c.tier) }}</span>
              <span class="text-xs text-gray-500">{{ planeLabel(c.order) }} · {{ c.groups.length }} guruh</span>
              <span v-if="c.order !== 'makka_only' && !KNOWN_DAYS.includes(c.days)" class="text-xs text-amber-700">
                {{ c.days }} kunlik safar yo'q — kechalarni tekshiring
              </span>
              <button @click="openCreate(c)" class="btn btn-primary btn-sm ml-auto">
                <font-awesome-icon icon="plus" class="w-3 h-3" /> Shablon yaratish
              </button>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="g in c.groups" :key="g.telegram_id" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                <span class="font-medium text-gray-800">{{ g.title || g.telegram_id }}</span>
                <span class="text-xs text-gray-500 tabular-nums">{{ nightsText(g.nights, c.order) }}</span>
                <span v-if="g.trip_start_date" class="text-xs text-gray-400 tabular-nums">{{ fmtDate(g.trip_start_date) }}</span>
                <span v-if="g.tier_inferred" class="chip chip-amber h-5">Daraja avtomatik</span>
                <router-link to="/ai/groups" class="ml-auto text-xs font-medium text-amber-700 hover:underline">Tuzatish</router-link>
              </div>
            </div>
          </div>
        </div>
        <p v-if="groupsWithoutMap" class="text-xs text-gray-400">{{ groupsWithoutMap }} guruhda kechalar kiritilmagan</p>
      </template>

      <!-- ───────────── Places dictionary ───────────── -->
      <template v-else-if="!editing && tab === 'joylar'">
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="placeQuery" type="text" placeholder="Qidirish..." class="input flex-1 min-w-[12rem]" />
          <form @submit.prevent="addPlace" class="flex flex-wrap items-center gap-2">
            <input v-model="newPlace.name" type="text" placeholder="Yangi joy" required class="input w-48 sm:w-56" />
            <select v-model="newPlace.city" class="input w-auto">
              <option value="">shahar —</option>
              <option v-for="c in CITY_OPTS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <button type="submit" class="btn btn-primary">Qo'shish</button>
          </form>
        </div>
        <div class="card divide-y divide-gray-100 overflow-hidden">
          <div v-if="filteredPlaces.length === 0" class="empty">Joylar yo'q</div>
          <div v-for="p in filteredPlaces" :key="p.id" class="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
            <span class="w-1.5 h-6 rounded-full shrink-0" :class="cityDot(p.city)"></span>
            <input v-if="placeEditId === p.id" v-model="placeEditName" @keyup.enter="savePlace(p)" @keyup.esc="placeEditId = null"
              class="input input-sm flex-1 min-w-[8rem]" />
            <span v-else class="flex-1 min-w-[8rem] text-sm text-gray-900">{{ p.name }}</span>
            <input v-if="placeEditId === p.id" v-model="placeEditNameRu" @keyup.enter="savePlace(p)" @keyup.esc="placeEditId = null"
              placeholder="Ruscha (avto)" class="input input-sm flex-1 min-w-[8rem] bg-sky-50/40 border-sky-100" />
            <span v-else class="flex-1 min-w-[8rem] text-sm" :class="p.name_ru ? 'text-sky-700' : 'text-amber-500'">{{ p.name_ru || 'ruscha yo\'q' }}</span>
            <select v-if="placeEditId === p.id" v-model="placeEditCity" class="input input-sm w-auto">
              <option value="">shahar —</option>
              <option v-for="c in CITY_OPTS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <span v-else class="text-xs text-gray-400 w-16">{{ cityName(p.city) || '—' }}</span>
            <span class="text-xs text-gray-400 w-16 text-right tabular-nums">{{ p.used }} band</span>
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="placeEditId === p.id">
                <button @click="savePlace(p)" class="btn btn-primary btn-sm">Saqlash</button>
                <button @click="placeEditId = null" class="btn btn-ghost btn-sm">Bekor</button>
              </template>
              <template v-else>
                <button @click="editPlace(p)" class="icon-btn" title="Tahrirlash"><font-awesome-icon icon="pen" class="w-3.5 h-3.5" /></button>
                <button @click="deletePlace(p)" :disabled="p.used > 0" :title="p.used ? 'Dasturda ishlatilgan' : 'O\'chirish'"
                  class="icon-btn icon-btn-danger"><font-awesome-icon icon="trash" class="w-3.5 h-3.5" /></button>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- ───────────── Editor ───────────── -->
      <template v-else-if="editing">
        <p v-if="editing.warnings?.includes('copy_stale')" class="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
          Guruh kechalari o'chirilgan — eski shakl
        </p>

        <!-- Template shape: the office's own nights, editable; groups on it inherit the days. -->
        <div v-if="editing.is_template" class="card p-4">
          <div class="flex flex-wrap items-end gap-3">
            <div class="min-w-[12rem] flex-1">
              <label class="label">Nomi</label>
              <input v-model="shapeForm.name" type="text" class="input" />
            </div>
            <div>
              <label class="label">Paket (CRM)</label>
              <select v-model="shapeForm.crm_package" class="input w-auto">
                <option value="">— paketsiz —</option>
                <option v-for="n in packageChoices(editing.crm_package)" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
            <div>
              <label class="label">Daraja</label>
              <select v-model="shapeForm.tier" class="input w-auto">
                <option value="comfort">Comfort</option>
                <option value="premium">Premium / Lux</option>
              </select>
            </div>
            <div>
              <label class="label">Marshrut</label>
              <select v-model="shapeForm.city_order" class="input w-auto">
                <option v-for="r in ROUTES" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <div v-for="leg in legsFor(shapeForm.city_order)" :key="leg.key">
              <label class="label">{{ leg.label }}</label>
              <input v-model.number="shapeForm[leg.key]" type="number" min="0" class="input w-16 text-center" />
            </div>
            <div class="text-sm text-gray-500 h-9 flex items-center">= <b class="text-gray-800 ml-1">{{ shapeDays }} kun</b></div>
            <button @click="saveShape" :disabled="!shapeDirty || saving" class="btn btn-secondary">Shaklni saqlash</button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 text-xs text-gray-500">
          <span>Ruscha qatorlar</span>
          <ToggleSwitch v-model="showRu" />
        </div>

        <div class="card overflow-hidden">
          <div v-for="(d, di) in editing.days_list" :key="d.day"
            class="flex flex-col sm:flex-row gap-2 sm:gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors duration-700"
            :class="movedDay === d.day ? 'bg-amber-100/70' : d.city === 'jidda' ? 'bg-amber-50/30' : d.city === 'madina' ? 'bg-sky-50/30' : ''">
            <div class="sm:w-24 shrink-0 flex sm:flex-col sm:items-start items-center flex-wrap gap-x-2 gap-y-0.5 sm:pt-1">
              <span class="text-sm font-semibold text-gray-900 tabular-nums">{{ d.day }}-kun</span>
              <span class="text-[11px] text-gray-500">{{ weekdayName(d.weekday) }}</span>
              <span class="text-[11px] text-gray-400 tabular-nums">{{ fmtDate(d.date) }}</span>
              <span class="chip h-5 text-[11px] sm:mt-1" :class="cityBand(d.city)">{{ cityName(d.city) || '—' }}</span>
              <!-- The whole day's lines change places with the neighbouring day's. The
                   number, date and city stay put: they are the trip's shape, not content. -->
              <div class="flex gap-0.5 ml-auto sm:ml-0 sm:mt-1 sm:-ml-1.5">
                <button @click="moveDay(di, -1)" :disabled="di === 0" class="icon-btn w-6 h-6" title="Kunni yuqoriga"><font-awesome-icon icon="arrow-up" class="w-3 h-3" /></button>
                <button @click="moveDay(di, 1)" :disabled="di === editing.days_list.length - 1" class="icon-btn w-6 h-6" title="Kunni pastga"><font-awesome-icon icon="arrow-down" class="w-3 h-3" /></button>
              </div>
            </div>
            <div class="flex-1 min-w-0 space-y-2">
              <div v-for="(it, idx) in d.items" :key="idx" class="space-y-1">
                <div class="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] sm:grid-cols-[1.25rem_14rem_minmax(0,1fr)_auto] gap-x-2 gap-y-1 items-center">
                  <span class="row-start-1 col-start-1 text-right text-[11px] text-gray-300 tabular-nums">{{ idx + 1 }}</span>
                  <input v-model="it.place_name" type="text" list="program-places" placeholder="Joy" @input="dirty = true"
                    :data-item="`${d.day}-${idx}`"
                    class="input input-sm row-start-1 col-start-2 font-medium"
                    :class="it.place_name.trim() ? '' : 'border-rose-300 ring-1 ring-rose-200'" />
                  <input v-model="it.note" type="text" placeholder="Izoh" @input="dirty = true"
                    @keydown.enter.prevent="addItem(d, idx)"
                    class="input input-sm row-start-2 col-start-2 sm:row-start-1 sm:col-start-3" />
                  <div class="row-start-1 col-start-3 sm:col-start-4 flex items-center">
                    <button @click="moveItem(d, idx, -1)" :disabled="idx === 0" class="icon-btn w-7 h-7" title="Yuqoriga"><font-awesome-icon icon="arrow-up" class="w-3 h-3" /></button>
                    <button @click="moveItem(d, idx, 1)" :disabled="idx === d.items.length - 1" class="icon-btn w-7 h-7" title="Pastga"><font-awesome-icon icon="arrow-down" class="w-3 h-3" /></button>
                    <button @click="removeItem(d, idx)" class="icon-btn icon-btn-danger w-7 h-7" title="O'chirish"><font-awesome-icon icon="xmark" class="w-3 h-3" /></button>
                  </div>
                </div>
                <!-- The Russian line the cabinet shows a Russian reader. Empty = the model fills
                     it on save; typed = kept as typed. The place's Russian is shared by every
                     programme naming that place, the note's belongs to this line. -->
                <div v-if="showRu" class="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] sm:grid-cols-[1.25rem_14rem_minmax(0,1fr)_auto] gap-x-2 gap-y-1 items-center">
                  <span class="row-start-1 col-start-1 text-right text-[10px] font-semibold text-sky-400">RU</span>
                  <input v-model="it.place_ru" type="text" placeholder="Название — avto" @input="dirty = true"
                    class="input input-sm row-start-1 col-start-2 h-7 bg-sky-50/40 border-sky-100 text-gray-700 placeholder:text-sky-300" />
                  <input v-if="it.note.trim()" v-model="it.note_ru" type="text" placeholder="Примечание — avto" @input="dirty = true"
                    class="input input-sm row-start-2 col-start-2 sm:row-start-1 sm:col-start-3 h-7 bg-sky-50/40 border-sky-100 text-gray-700 placeholder:text-sky-300" />
                  <span class="row-start-1 col-start-3 sm:col-start-4 w-[5.25rem]"></span>
                </div>
              </div>
              <button @click="addItem(d, d.items.length - 1)" class="btn btn-ghost btn-sm h-7 -ml-1 text-gray-400 hover:text-amber-700">+ band</button>
            </div>
          </div>
        </div>
        <datalist id="program-places">
          <option v-for="p in places" :key="p.id" :value="p.name">{{ cityName(p.city) }}</option>
        </datalist>
      </template>
    </div>

    <!-- ───────────── Create template ───────────── -->
    <BaseModal :open="createOpen" title="Yangi dastur" @close="createOpen = false">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Paket (CRM)</label>
          <select v-model="createForm.crm_package" class="input">
            <option value="">— paketsiz —</option>
            <option v-for="n in packageChoices()" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div>
          <label class="label">Nusxa manbai</label>
          <select v-model="createForm.source_id" class="input">
            <option :value="null">— bo'sh —</option>
            <option v-for="t in allTemplates" :key="t.id" :value="t.id">{{ t.crm_package ? `${t.crm_package} — ${t.name}` : t.name }}</option>
          </select>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button v-for="pr in PRESETS" :key="pr.name" @click="applyPreset(pr)" type="button"
          class="chip h-7 px-2.5 border transition-colors"
          :class="presetActive(pr) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
          {{ pr.name }}
        </button>
      </div>
      <div>
        <label class="label">Nomi</label>
        <input v-model="createForm.name" type="text" placeholder="Shanba 13 kun comfort" class="input" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Daraja</label>
          <select v-model="createForm.tier" class="input">
            <option value="comfort">Comfort</option>
            <option value="premium">Premium / Lux</option>
          </select>
        </div>
        <div>
          <label class="label">Marshrut</label>
          <select v-model="createForm.city_order" class="input">
            <option v-for="r in ROUTES" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div v-for="leg in legsFor(createForm.city_order)" :key="leg.key">
          <label class="label">{{ leg.label }} kechasi</label>
          <input v-model.number="createForm[leg.key]" type="number" min="0" class="input text-center" />
        </div>
      </div>
      <p class="text-sm text-gray-600">Shakl: <b>{{ cellLabel(createDays, createForm.tier) }}</b> · {{ planeLabel(createForm.city_order) }}</p>
      <p v-if="formError" class="error-text">{{ formError }}</p>
      <template #footer>
        <button @click="createOpen = false" class="btn btn-ghost">Bekor qilish</button>
        <button @click="createTemplate" :disabled="saving" class="btn btn-primary">Yaratish</button>
      </template>
    </BaseModal>

    <!-- ───────────── Copy ───────────── -->
    <BaseModal :open="copyOpen" :title="`Nusxalash: ${copySource?.name || ''}`" @close="copyOpen = false">
      <div class="seg w-full">
        <button type="button" class="seg-btn flex-1" :class="{ 'seg-btn-on': copyForm.mode === 'group' }" @click="copyForm.mode = 'group'">Guruhga</button>
        <button type="button" class="seg-btn flex-1" :class="{ 'seg-btn-on': copyForm.mode === 'cell' }" @click="copyForm.mode = 'cell'">Paketga / shablonga</button>
      </div>
      <div v-if="copyForm.mode === 'group'">
        <label class="label">Guruh</label>
        <select v-model="copyForm.group_telegram_id" class="input">
          <option :value="null">— tanlang —</option>
          <option v-for="g in groupsForCopy" :key="g.id" :value="g.id">{{ g.title || g.id }}<template v-if="g.trip_start_date"> · {{ fmtDate(g.trip_start_date) }}</template></option>
        </select>
      </div>
      <template v-else>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Paket (CRM)</label>
            <select v-model="copyForm.crm_package" class="input">
              <option value="">— paketsiz —</option>
              <option v-for="n in packageChoices()" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div>
            <label class="label">Nomi</label>
            <input v-model="copyForm.name" type="text" class="input" />
          </div>
          <div>
            <label class="label">Daraja</label>
            <select v-model="copyForm.tier" class="input">
              <option value="comfort">Comfort</option>
              <option value="premium">Premium / Lux</option>
            </select>
          </div>
          <div>
            <label class="label">Marshrut</label>
            <select v-model="copyForm.city_order" class="input">
              <option v-for="r in ROUTES" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="leg in legsFor(copyForm.city_order)" :key="leg.key">
            <label class="label">{{ leg.label }} kechasi</label>
            <input v-model.number="copyForm[leg.key]" type="number" min="0" class="input text-center" />
          </div>
        </div>
        <p class="text-sm text-gray-600">Shakl: <b>{{ cellLabel(copyDays, copyForm.tier) }}</b> · {{ planeLabel(copyForm.city_order) }}</p>
      </template>
      <p v-if="formError" class="error-text">{{ formError }}</p>
      <template #footer>
        <button @click="copyOpen = false" class="btn btn-ghost">Bekor qilish</button>
        <button @click="doCopy" :disabled="saving" class="btn btn-primary">Nusxalash</button>
      </template>
    </BaseModal>

    <!-- ───────────── Attach a cell template to a package ───────────── -->
    <BaseModal :open="attachOpen && !!attachTarget" :title="`Paketga biriktirish: ${attachTarget?.name || ''}`" width="sm:max-w-md" @close="attachOpen = false">
      <div>
        <label class="label">Paket</label>
        <select v-model="attachPackage" class="input">
          <option value="">— tanlang —</option>
          <option v-for="n in freePackages" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <p v-if="formError" class="error-text">{{ formError }}</p>
      <template #footer>
        <button @click="attachOpen = false" class="btn btn-ghost">Bekor qilish</button>
        <button @click="doAttach" :disabled="saving || !attachPackage" class="btn btn-primary">Biriktirish</button>
      </template>
    </BaseModal>

    <!-- ───────────── Preview, as the cabinet shows it ───────────── -->
    <BaseModal :open="previewOpen && !!editing" title="Umra rejasi" width="sm:max-w-md" @close="previewOpen = false">
      <template v-if="editing">
        <p v-if="!editing.is_template && editing.group?.title" class="text-xs text-gray-500">{{ editing.group.title }}</p>
        <div v-for="d in editing.days_list" :key="d.day">
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-sm font-semibold text-gray-900">{{ d.day }}-kun</span>
            <span class="text-xs text-gray-500">{{ weekdayName(d.weekday) }}<template v-if="d.date">, {{ fmtDate(d.date) }}</template></span>
            <span class="ml-auto chip h-5 text-[11px]" :class="cityBand(d.city)">{{ cityName(d.city) }}</span>
          </div>
          <p v-if="d.items.length === 0" class="text-xs text-gray-300 pl-1">—</p>
          <div v-for="(it, i) in d.items" :key="i" class="flex gap-2 pl-1 py-0.5">
            <span class="w-4 shrink-0 text-xs text-gray-300 tabular-nums pt-0.5">{{ i + 1 }}.</span>
            <div class="text-sm">
              <span class="font-medium text-gray-900">{{ it.place_name }}</span><span v-if="it.note" class="text-gray-500"> · {{ it.note }}</span>
              <!-- What a Russian reader sees: the translation, or the Uzbek line where there is none yet. -->
              <p class="text-xs" :class="it.place_ru || it.note_ru ? 'text-sky-700' : 'text-amber-600'">
                {{ it.place_ru || it.place_name }}<span v-if="it.note"> · {{ it.note_ru || it.note }}</span>
                <span v-if="!it.place_ru || (it.note && !it.note_ru)" class="text-amber-500"> (tarjimasiz)</span>
              </p>
            </div>
          </div>
        </div>
      </template>
    </BaseModal>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../../../components/AppShell.vue'
import BaseModal from '../../../components/BaseModal.vue'
import ToggleSwitch from '../../../components/ToggleSwitch.vue'
import api from '../../../api'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

// ─── Types ────────────────────────────────────────────────────────────────────────

interface Shape { days: number; tier: string; order: string; tier_inferred: boolean }
interface ProgramSummary {
  id: number; name: string; is_template: boolean; group_telegram_id: number | null
  /** The CRM package this template is for («TAJ 13»); null = a cell template. */
  crm_package: string | null
  days: number; tier: string; city_order: string
  jidda_nights: number; makka_nights: number; madina_nights: number
  items_count: number; updated_at: string | null; updated_by: string | null
  /** Lines a Russian reader still sees in Uzbek; 0 = fully translated. */
  ru_missing: number
}
interface Item { place_name: string; note: string; place_ru: string; note_ru: string }
interface Day { day: number; date: string | null; weekday: number | null; city: string | null; items: Item[] }
interface ProgramView extends ProgramSummary {
  start_date: string | null
  days_list: Day[]
  preview?: boolean
  group?: { telegram_id: number; title: string | null; shape: Shape | null }
  warnings?: string[]
}
interface CellGroup {
  telegram_id: number; title: string | null; trip_start_date: string | null
  nights: { jidda: number; makka: number; madina: number }; tier_inferred: boolean; source: string
}
interface Cell {
  days: number; tier: string; order: string; template: ProgramSummary | null
  groups_total: number; on_template: number; customized: number; without: number; tier_inferred: number
  groups: CellGroup[]
}
interface PackageGroup {
  telegram_id: number; title: string | null; trip_start_date: string | null
  source: string; program_name: string | null; warnings: string[]
}
/** A CRM package with its programme and the groups that are that package. */
interface PackageRow {
  name: string; in_crm: boolean; template: ProgramSummary | null; crm_groups: number
  groups_total: number; on_template: number; customized: number; fallback: number; without: number
  groups: PackageGroup[]
}
interface Place { id: number; name: string; city: string | null; name_ru: string | null; used: number }
interface GroupRow { id: number; title: string | null; trip_start_date: string | null }

type LegKey = 'jidda_nights' | 'makka_nights' | 'madina_nights'
const LEGS: { key: LegKey; label: string }[] = [
  { key: 'jidda_nights', label: 'Jidda' },
  { key: 'makka_nights', label: 'Makka' },
  { key: 'madina_nights', label: 'Madina' },
]
// The routes a trip runs (owner, 2026-10-15 added Jidda → Makka → Jidda: lands in
// Jidda, stays in Makka only, flies home from Jidda). The route is part of a template's
// cell — a Makka-only trip has its own programme even when its length matches a classic one.
const ROUTES = [
  { value: 'makka_madina', label: 'Shanba · Jidda → Makka → Madina' },
  { value: 'madina_makka', label: 'Payshanba · Madina → Makka' },
  { value: 'makka_only', label: 'Jidda → Makka → Jidda' },
]
/** The nights fields a route has: no Madina on the Makka-only route. */
function legsFor(order: string) {
  return order === 'makka_only' ? LEGS.filter(l => l.key !== 'madina_nights') : LEGS
}
const CITY_OPTS = [
  { value: 'jidda', label: 'Jidda' },
  { value: 'makka', label: 'Makka' },
  { value: 'madina', label: 'Madina' },
]
// The shapes the company runs this season (owner, 2026-09-16: 10/6/13 days, comfort and
// lux, and a 10-day comfort too). Presets only — a group's real shape still comes from
// its own nights, and a length outside this list is flagged as a probable typo.
type Preset = { name: string; tier: string; city_order: string; jidda_nights: number; makka_nights: number; madina_nights: number }
const PRESETS: Preset[] = [
  { name: 'Payshanba 10 kun comfort', tier: 'comfort', city_order: 'madina_makka', jidda_nights: 0, makka_nights: 5, madina_nights: 4 },
  { name: 'Payshanba 10 kun lux', tier: 'premium', city_order: 'madina_makka', jidda_nights: 0, makka_nights: 5, madina_nights: 4 },
  { name: 'Shanba 6 kun lux', tier: 'premium', city_order: 'makka_madina', jidda_nights: 1, makka_nights: 2, madina_nights: 2 },
  { name: 'Shanba 13 kun lux', tier: 'premium', city_order: 'makka_madina', jidda_nights: 1, makka_nights: 7, madina_nights: 4 },
  { name: 'Shanba 13 kun comfort', tier: 'comfort', city_order: 'makka_madina', jidda_nights: 1, makka_nights: 8, madina_nights: 3 },
]
const KNOWN_DAYS = [6, 10, 13]
// Python weekday(): Mon=0 … Sun=6 — what the API returns.
const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { confirm } = useConfirm()

// ─── State ────────────────────────────────────────────────────────────────────────

const loading = ref(false)
const saving = ref(false)
const tab = ref<'shablonlar' | 'joylar'>('shablonlar')
const cells = ref<Cell[]>([])
const templateCells = computed(() => cells.value.filter(c => c.template))
const unmatchedCells = computed(() => cells.value.filter(c => !c.template && c.groups.length))
const unmatchedTotal = computed(() => unmatchedCells.value.reduce((n, c) => n + c.groups.length, 0))
const groupsWithoutMap = ref(0)
// The CRM packages (owner, 19.10.2026: a programme per package — «TAJ 13», «ANJUM 6»).
const packages = ref<PackageRow[]>([])
const pkgConfigured = ref(true)
const pkgSyncedAt = ref<string | null>(null)
const pkgConflicts = ref(0)
const syncing = ref(false)
const openPkg = ref<string | null>(null)
/** Packages the CRM lists that have no programme yet — what a new one can be for. */
const freePackages = computed(() => packages.value.filter(p => p.in_crm && !p.template).map(p => p.name))
/** Every template, package or cell — the sources a new programme can be copied from. */
const allTemplates = computed<ProgramSummary[]>(() => [
  ...packages.value.filter(p => p.template).map(p => p.template!),
  ...templateCells.value.map(c => c.template!),
])
/** The package choices of a picker: the free ones, plus the one already chosen. */
function packageChoices(current?: string | null): string[] {
  const list = freePackages.value.slice()
  if (current && !list.includes(current)) list.unshift(current)
  return list
}
const places = ref<Place[]>([])
const groups = ref<GroupRow[]>([])
const editing = ref<ProgramView | null>(null)
const dirty = ref(false)
const previewOpen = ref(false)
const formError = ref('')

// ─── Labels ───────────────────────────────────────────────────────────────────────

function tierLabel(t: string | null | undefined): string {
  return t === 'comfort' ? 'comfort' : t === 'premium' ? 'lux' : (t || '?')
}
function cellLabel(days: number | null | undefined, tier: string | null | undefined): string {
  return `${days ?? '?'} kun · ${tierLabel(tier)}`
}
function planeLabel(order: string | null | undefined): string {
  return (ROUTES.find(r => r.value === (order || 'makka_madina')) ?? ROUTES[0]).label
}
function cellKey(c: Cell): string {
  return `${c.days}-${c.tier}-${c.order}`
}
function nightsLabel(p: { jidda_nights: number | null; makka_nights: number | null; madina_nights: number | null; city_order?: string | null }): string {
  const parts: string[] = []
  const seq: LegKey[] = p.city_order === 'madina_makka'
    ? ['madina_nights', 'makka_nights']
    : p.city_order === 'makka_only' ? ['jidda_nights', 'makka_nights'] : ['jidda_nights', 'makka_nights', 'madina_nights']
  for (const k of seq) {
    const n = p[k] || 0
    if (n) parts.push(`${LEGS.find(l => l.key === k)!.label} ${n}`)
  }
  return parts.join(' · ')
}
function nightsText(n: { jidda: number; makka: number; madina: number }, order: string): string {
  const seq: ('jidda' | 'makka' | 'madina')[] = order === 'madina_makka' ? ['madina', 'makka']
    : order === 'makka_only' ? ['jidda', 'makka'] : ['jidda', 'makka', 'madina']
  const parts = seq.filter(k => n[k]).map(k => `${cityName(k)} ${n[k]}`)
  const total = n.jidda + n.makka + n.madina
  return `${parts.join(' · ')} = ${total} kecha`
}
function cityName(c: string | null | undefined): string {
  return c === 'jidda' ? 'Jidda' : c === 'makka' ? 'Makka' : c === 'madina' ? 'Madina' : ''
}
function cityBand(c: string | null | undefined): string {
  if (c === 'jidda') return 'bg-amber-50 text-amber-700'
  if (c === 'madina') return 'bg-sky-50 text-sky-700'
  if (c === 'makka') return 'bg-emerald-50 text-emerald-700'
  return 'bg-gray-50 text-gray-400'
}
function cityDot(c: string | null | undefined): string {
  return c === 'jidda' ? 'bg-amber-400' : c === 'madina' ? 'bg-sky-400' : c === 'makka' ? 'bg-emerald-400' : 'bg-gray-200'
}
function weekdayName(w: number | null | undefined): string {
  return w === null || w === undefined ? '' : WEEKDAYS[w]
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** What a group of a package is shown, in the package's group list. */
function sourceLabel(g: PackageGroup): string {
  if (g.source === 'group') return 'o\'z dasturi'
  if (g.source === 'template' && g.warnings.includes('package_no_template')) return `paketsiz: ${g.program_name || ''}`
  if (g.source === 'template') return 'paket dasturi'
  return g.warnings.includes('no_day_map') ? 'kechalar yo\'q' : 'dastursiz'
}
function sourceClass(g: PackageGroup): string {
  if (g.source === 'none') return 'text-rose-600'
  if (g.warnings.includes('package_no_template') || g.warnings.includes('map_mismatch')) return 'text-amber-700'
  return 'text-gray-500'
}
function errText(e: any, fallback: string): string {
  const d = e?.response?.data?.detail
  return typeof d === 'string' ? d : fallback
}

// ─── Loading ──────────────────────────────────────────────────────────────────────

async function loadCells() {
  const { data } = await api.get('/programs/cells')
  cells.value = data.cells
  groupsWithoutMap.value = data.groups_without_map
}
async function loadPackages() {
  const { data } = await api.get('/programs/packages')
  packages.value = data.packages
  pkgConfigured.value = data.configured
  pkgSyncedAt.value = data.synced_at
  pkgConflicts.value = data.conflicts
}
/** The two lists of the main screen, always refreshed together. */
async function loadAll() {
  await Promise.all([loadCells(), loadPackages()])
}
async function syncPackages() {
  syncing.value = true
  try {
    const { data } = await api.post('/programs/packages/sync')
    toast.success(`CRM: ${data.packages} ta paket, ${data.groups} ta guruh`)
    await loadAll()
  } catch (e: any) {
    toast.error(errText(e, 'Sinxronlanmadi'))
  } finally { syncing.value = false }
}
async function loadPlaces() {
  const { data } = await api.get('/programs/places')
  places.value = data
}
async function loadGroups() {
  try {
    const { data } = await api.get('/groups')
    groups.value = data
  } catch { groups.value = [] }
}

function toView(data: any): ProgramView {
  return {
    ...data,
    days_list: (data.days_list || []).map((d: any) => ({
      day: d.day, date: d.date, weekday: d.weekday, city: d.city,
      items: (d.items || []).map((it: any) => ({
        place_name: it.place || '', note: it.note || '',
        place_ru: it.place_ru || '', note_ru: it.note_ru || '',
      })),
    })),
  }
}

async function openProgram(id: number) {
  loading.value = true
  try {
    const { data } = await api.get(`/programs/${id}`)
    editing.value = toView(data)
    dirty.value = false
    resetShapeForm()
    if (String(route.query.program) !== String(id)) router.replace({ query: { program: String(id) } })
  } catch (e: any) {
    toast.error(errText(e, 'Dastur ochilmadi'))
  } finally { loading.value = false }
}

async function openForGroup(telegramId: number) {
  try {
    const { data } = await api.get(`/programs/groups/${telegramId}`)
    if (data.program_id) return openProgram(data.program_id)
    toast.error(data.warnings?.includes('no_day_map')
      ? 'Guruhda kechalar kiritilmagan'
      : 'Bu shakl uchun shablon yo\'q')
    router.replace({ query: {} })
  } catch (e: any) { toast.error(errText(e, 'Guruh dasturi ochilmadi')) }
}

async function closeEditor() {
  if (dirty.value && !(await confirm({ title: 'Saqlanmagan o\'zgarishlar bor', message: 'Chiqsangiz, ular yo\'qoladi', confirmText: 'Chiqish' }))) return
  editing.value = null
  dirty.value = false
  router.replace({ query: {} })
  await loadAll()
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadAll(), loadPlaces()])
    // The group list serves only the copy dialog, and /groups waits on the Turon
    // registry lookup (seconds when that API is unreachable) — never block the
    // screen on it.
    loadGroups()
    if (route.query.program) await openProgram(Number(route.query.program))
    else if (route.query.group) await openForGroup(Number(route.query.group))
  } catch (e: any) {
    toast.error(errText(e, 'Yuklashda xatolik'))
  } finally { loading.value = false }
})

// ─── Items editing ────────────────────────────────────────────────────────────────

function addItem(d: Day, afterIdx: number) {
  d.items.splice(afterIdx + 1, 0, { place_name: '', note: '', place_ru: '', note_ru: '' })
  dirty.value = true
  // Enter in a note (or «+ band») means «next line»: put the cursor in the new
  // line's place field, so a whole day can be typed without touching the mouse.
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>(`input[data-item="${d.day}-${afterIdx + 1}"]`)
    el?.focus()
  })
}
function removeItem(d: Day, idx: number) {
  d.items.splice(idx, 1)
  dirty.value = true
}
function moveItem(d: Day, idx: number, delta: number) {
  const j = idx + delta
  if (j < 0 || j >= d.items.length) return
  const [it] = d.items.splice(idx, 1)
  d.items.splice(j, 0, it)
  dirty.value = true
}

/** Swap a whole day's lines with the neighbouring day's (owner, 2026-10-09: lines could
 *  be reordered inside a day, the days themselves could not). Only the CONTENT moves —
 *  day number, date and city are the trip's shape. The Russian travels with each line. */
const movedDay = ref<number | null>(null)
let movedTimer: ReturnType<typeof setTimeout> | null = null
function moveDay(idx: number, delta: number) {
  const list = editing.value?.days_list
  if (!list) return
  const j = idx + delta
  if (j < 0 || j >= list.length) return
  const a = list[idx], b = list[j]
  ;[a.items, b.items] = [b.items, a.items]
  dirty.value = true
  // A Makka visit landing on a Madina day is usually a slip — say so, do not refuse.
  if (a.city !== b.city && b.items.length)
    toast.info(`${b.day}-kun — ${cityName(b.city) || 'boshqa shahar'} kuni. Joylarni tekshiring`)
  movedDay.value = b.day
  if (movedTimer) clearTimeout(movedTimer)
  movedTimer = setTimeout(() => { movedDay.value = null }, 900)
}

async function saveItems() {
  if (!editing.value) return
  const p = editing.value
  const empty = p.days_list.find(d => d.items.some(it => !it.place_name.trim()))
  if (empty) { toast.error(`${empty.day}-kunda joy yozilmagan`); return }
  saving.value = true
  try {
    const { data } = await api.put(`/programs/${p.id}/items`, {
      days: p.days_list.map(d => ({
        day_no: d.day,
        items: d.items.map(it => ({
          place_name: it.place_name.trim(),
          city: d.city,
          note: it.note.trim() || null,
          place_ru: it.place_ru.trim() || null,
          note_ru: it.note_ru.trim() || null,
        })),
      })),
    })
    editing.value = toView(data)
    dirty.value = false
    // The save always lands; the Russian is filled by the model in the same request
    // and can fail on its own — then the button above says how many lines are left.
    if (data.ru_pending) toast.info('Saqlandi, ruscha tarjima qilinmadi')
    else toast.success('Dastur saqlandi')
    await loadPlaces()
  } catch (e: any) {
    toast.error(errText(e, 'Saqlanmadi'))
  } finally { saving.value = false }
}

// ─── Russian ──────────────────────────────────────────────────────────────────────

const showRu = ref(true)
const translating = ref(false)

/** Fill the missing Russian; when nothing is missing, offer to redo it all. */
async function translateProgram() {
  if (!editing.value || dirty.value) return
  const p = editing.value
  let force = false
  if (!p.ru_missing) {
    if (!(await confirm({ title: 'Ruschani qaytadan tarjima qilish?', message: 'Qo\'lda yozilgan ruscha ham almashadi.' }))) return
    force = true
  }
  translating.value = true
  try {
    const { data } = await api.post(`/programs/${p.id}/translate`, null, { params: { force } })
    editing.value = toView(data)
    toast.success(data.translated ? `${data.translated} ta matn tarjima qilindi` : 'Tarjima qilinadigan matn yo\'q')
    await loadPlaces()
  } catch (e: any) {
    toast.error(errText(e, 'Tarjima qilinmadi'))
  } finally { translating.value = false }
}

// ─── Template shape ───────────────────────────────────────────────────────────────

const shapeForm = reactive({ name: '', crm_package: '', tier: 'comfort', city_order: 'makka_madina', jidda_nights: 0, makka_nights: 0, madina_nights: 0 })
function resetShapeForm() {
  const p = editing.value
  if (!p) return
  shapeForm.name = p.name
  shapeForm.crm_package = p.crm_package || ''
  shapeForm.tier = p.tier
  shapeForm.city_order = p.city_order
  shapeForm.jidda_nights = p.jidda_nights || 0
  shapeForm.makka_nights = p.makka_nights || 0
  shapeForm.madina_nights = p.madina_nights || 0
}
const shapeDays = computed(() => (shapeForm.jidda_nights || 0) + (shapeForm.makka_nights || 0) + (shapeForm.madina_nights || 0) + 1)
const shapeDirty = computed(() => {
  const p = editing.value
  if (!p) return false
  return shapeForm.name !== p.name || shapeForm.crm_package !== (p.crm_package || '')
    || shapeForm.tier !== p.tier || shapeForm.city_order !== p.city_order
    || shapeForm.jidda_nights !== (p.jidda_nights || 0) || shapeForm.makka_nights !== (p.makka_nights || 0)
    || shapeForm.madina_nights !== (p.madina_nights || 0)
})
async function saveShape() {
  if (!editing.value) return
  if (dirty.value) { toast.error('Avval bandlarni saqlang'); return }
  saving.value = true
  try {
    const { data } = await api.put(`/programs/${editing.value.id}`, { ...shapeForm })
    editing.value = toView(data)
    resetShapeForm()
    toast.success(data.dropped_items ? `Shakl saqlandi, ${data.dropped_items} ta band tushib qoldi` : 'Shakl saqlandi')
    loadPackages().catch(() => {})
  } catch (e: any) {
    toast.error(errText(e, 'Shakl saqlanmadi'))
  } finally { saving.value = false }
}

// ─── Create ───────────────────────────────────────────────────────────────────────

const createOpen = ref(false)
const createForm = reactive({ name: '', crm_package: '', source_id: null as number | null, tier: 'comfort', city_order: 'makka_madina', jidda_nights: 1, makka_nights: 8, madina_nights: 3 })
const createDays = computed(() => (createForm.jidda_nights || 0) + (createForm.makka_nights || 0) + (createForm.madina_nights || 0) + 1)

function applyPreset(pr: Preset) {
  createForm.name = pr.name
  createForm.tier = pr.tier
  createForm.city_order = pr.city_order
  createForm.jidda_nights = pr.jidda_nights
  createForm.makka_nights = pr.makka_nights
  createForm.madina_nights = pr.madina_nights
}
function presetActive(pr: Preset): boolean {
  return createForm.tier === pr.tier && createForm.city_order === pr.city_order
    && createForm.jidda_nights === pr.jidda_nights && createForm.makka_nights === pr.makka_nights
    && createForm.madina_nights === pr.madina_nights
}
function openCreate(cell?: Cell, pkg?: string) {
  formError.value = ''
  createForm.crm_package = pkg || ''
  createForm.source_id = null
  if (pkg) {
    // The package's name is the programme's name; the office types its nights or picks
    // a programme to copy (which brings its nights along).
    createForm.name = pkg
  } else if (cell) {
    createForm.tier = cell.tier
    createForm.city_order = cell.order
    // A cell known only from groups: prefill the plane's usual split for its length.
    if (cell.order === 'madina_makka') {
      createForm.jidda_nights = 0; createForm.madina_nights = Math.min(4, cell.days - 1); createForm.makka_nights = cell.days - 1 - createForm.madina_nights
    } else if (cell.order === 'makka_only') {
      // The groups' own split is listed under the cell; this is only a starting point.
      createForm.jidda_nights = 1; createForm.madina_nights = 0; createForm.makka_nights = Math.max(1, cell.days - 2)
    } else {
      createForm.jidda_nights = 1; createForm.madina_nights = cell.days >= 13 ? 3 : 2; createForm.makka_nights = cell.days - 1 - 1 - createForm.madina_nights
    }
    const prefix = cell.order === 'madina_makka' ? 'Payshanba' : cell.order === 'makka_only' ? 'Jidda-Makka-Jidda' : 'Shanba'
    createForm.name = `${prefix} ${cell.days} kun ${tierLabel(cell.tier)}`
  } else {
    createForm.name = ''
  }
  createOpen.value = true
}
async function createTemplate() {
  formError.value = ''
  if (!createForm.name.trim()) { formError.value = 'Nomini kiriting'; return }
  saving.value = true
  try {
    const { source_id, ...shape } = createForm
    const body = { ...shape, name: createForm.name.trim(), crm_package: createForm.crm_package || null }
    const { data } = source_id
      ? await api.post(`/programs/${source_id}/copy`, body)
      : await api.post('/programs', body)
    createOpen.value = false
    toast.success(data.dropped_items ? `Dastur yaratildi, ${data.dropped_items} ta band tushib qoldi` : 'Dastur yaratildi')
    await loadAll()
    await openProgram(data.id)
  } catch (e: any) {
    formError.value = errText(e, 'Yaratilmadi')
  } finally { saving.value = false }
}

async function deleteTemplate(t: ProgramSummary) {
  const message = t.crm_package
    ? 'Paket guruhlari paketsiz shablonga o\'tadi.'
    : 'Bu shakldagi guruhlar dastursiz qoladi.'
  if (!(await confirm({ title: `Dasturni o'chirish: ${t.name}`, message }))) return
  try {
    await api.delete(`/programs/${t.id}`)
    toast.success('O\'chirildi')
    await loadAll()
  } catch (e: any) { toast.error(errText(e, 'O\'chirilmadi')) }
}

async function revertToTemplate(telegramId: number) {
  if (!(await confirm({ title: 'Shablonga qaytarish', message: 'Guruhning o\'z dasturi o\'chiriladi.', confirmText: 'Qaytarish' }))) return
  try {
    await api.delete(`/programs/groups/${telegramId}/customize`)
    toast.success('Guruh shablonga qaytdi')
    editing.value = null
    dirty.value = false
    router.replace({ query: {} })
    await loadAll()
  } catch (e: any) { toast.error(errText(e, 'Qaytarilmadi')) }
}

// ─── Copy ─────────────────────────────────────────────────────────────────────────

const copyOpen = ref(false)
const copySource = ref<ProgramSummary | null>(null)
const copyForm = reactive({ mode: 'group' as 'group' | 'cell', group_telegram_id: null as number | null, name: '', crm_package: '', tier: 'comfort', city_order: 'makka_madina', jidda_nights: 0, makka_nights: 0, madina_nights: 0 })
const copyDays = computed(() => (copyForm.jidda_nights || 0) + (copyForm.makka_nights || 0) + (copyForm.madina_nights || 0) + 1)
const groupsForCopy = computed(() => groups.value.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '')))

function openCopy(src: ProgramSummary) {
  formError.value = ''
  copySource.value = src
  copyForm.mode = 'group'
  copyForm.group_telegram_id = null
  copyForm.name = `${src.name} (nusxa)`
  copyForm.crm_package = ''
  copyForm.tier = src.tier
  copyForm.city_order = src.city_order
  copyForm.jidda_nights = src.jidda_nights || 0
  copyForm.makka_nights = src.makka_nights || 0
  copyForm.madina_nights = src.madina_nights || 0
  copyOpen.value = true
}
async function doCopy() {
  if (!copySource.value) return
  formError.value = ''
  const body: any = copyForm.mode === 'group'
    ? { group_telegram_id: copyForm.group_telegram_id }
    : { name: copyForm.name.trim(), crm_package: copyForm.crm_package || null, tier: copyForm.tier, city_order: copyForm.city_order, jidda_nights: copyForm.jidda_nights, makka_nights: copyForm.makka_nights, madina_nights: copyForm.madina_nights }
  if (copyForm.mode === 'group' && !body.group_telegram_id) { formError.value = 'Guruhni tanlang'; return }
  if (copyForm.mode === 'cell' && !body.name) { formError.value = 'Nomini kiriting'; return }
  saving.value = true
  try {
    const { data } = await api.post(`/programs/${copySource.value.id}/copy`, body)
    copyOpen.value = false
    toast.success(data.dropped_items ? `Nusxalandi, ${data.dropped_items} ta band tushib qoldi` : 'Nusxalandi')
    await loadAll()
    await openProgram(data.id)
  } catch (e: any) {
    formError.value = errText(e, 'Nusxalanmadi')
  } finally { saving.value = false }
}

// ─── Attach to a package ──────────────────────────────────────────────────────────

const attachOpen = ref(false)
const attachTarget = ref<ProgramSummary | null>(null)
const attachPackage = ref('')
function openAttach(t: ProgramSummary) {
  formError.value = ''
  attachTarget.value = t
  attachPackage.value = ''
  attachOpen.value = true
}
async function doAttach() {
  if (!attachTarget.value || !attachPackage.value) return
  formError.value = ''
  saving.value = true
  try {
    await api.put(`/programs/${attachTarget.value.id}`, { crm_package: attachPackage.value })
    attachOpen.value = false
    toast.success(`«${attachPackage.value}» paketiga biriktirildi`)
    await loadAll()
  } catch (e: any) {
    formError.value = errText(e, 'Biriktirilmadi')
  } finally { saving.value = false }
}

// ─── Places ───────────────────────────────────────────────────────────────────────

const placeQuery = ref('')
const newPlace = reactive({ name: '', city: '' })
const placeEditId = ref<number | null>(null)
const placeEditName = ref('')
const placeEditCity = ref('')
const placeEditNameRu = ref('')
const filteredPlaces = computed(() => {
  const q = placeQuery.value.trim().toLowerCase()
  return q ? places.value.filter(p => p.name.toLowerCase().includes(q)) : places.value
})
async function addPlace() {
  try {
    await api.post('/programs/places', { name: newPlace.name.trim(), city: newPlace.city || null })
    newPlace.name = ''
    toast.success('Joy qo\'shildi')
    await loadPlaces()
  } catch (e: any) { toast.error(errText(e, 'Qo\'shilmadi')) }
}
function editPlace(p: Place) {
  placeEditId.value = p.id
  placeEditName.value = p.name
  placeEditCity.value = p.city || ''
  placeEditNameRu.value = p.name_ru || ''
}
async function savePlace(p: Place) {
  try {
    // An empty Russian field means «let the model do it» (it re-translates on a rename).
    await api.put(`/programs/places/${p.id}`, {
      name: placeEditName.value.trim(), city: placeEditCity.value || null,
      name_ru: placeEditNameRu.value.trim() || null,
    })
    placeEditId.value = null
    toast.success('Saqlandi')
    await loadPlaces()
  } catch (e: any) { toast.error(errText(e, 'Saqlanmadi')) }
}
async function deletePlace(p: Place) {
  if (!(await confirm({ title: `Joyni o'chirish: ${p.name}` }))) return
  try {
    await api.delete(`/programs/places/${p.id}`)
    toast.success('O\'chirildi')
    await loadPlaces()
  } catch (e: any) { toast.error(errText(e, 'O\'chirilmadi')) }
}

watch(tab, () => { if (tab.value === 'joylar') loadPlaces() })
// The Makka-only route has no Madina night; its field is hidden, so it must not keep
// a number the server would refuse.
watch(() => shapeForm.city_order, o => { if (o === 'makka_only') shapeForm.madina_nights = 0 })
watch(() => createForm.city_order, o => { if (o === 'makka_only') createForm.madina_nights = 0 })
watch(() => copyForm.city_order, o => { if (o === 'makka_only') copyForm.madina_nights = 0 })
watch(() => createForm.source_id, id => {
  const src = allTemplates.value.find(t => t.id === id)
  if (!src) return
  createForm.tier = src.tier
  createForm.city_order = src.city_order
  createForm.jidda_nights = src.jidda_nights || 0
  createForm.makka_nights = src.makka_nights || 0
  createForm.madina_nights = src.madina_nights || 0
})
</script>

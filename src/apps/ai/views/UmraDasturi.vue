<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- ───────────── Header ───────────── -->
      <div class="flex items-start justify-between gap-4 animate-fade-up">
        <div class="min-w-0">
          <div v-if="editing" class="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <button @click="closeEditor" class="hover:text-gray-900 flex items-center gap-1.5">
              <font-awesome-icon icon="arrow-left" class="w-3 h-3" /> Umra dasturi
            </button>
            <span class="text-gray-300">/</span>
            <span class="text-gray-700 truncate">{{ editing.name }}</span>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 truncate">{{ editing ? editing.name : 'Umra dasturi' }}</h2>
          <p class="text-sm text-gray-500 mt-1">
            <template v-if="editing && editing.is_template">
              Shablon · {{ cellLabel(editing.days, editing.tier) }} · {{ planeLabel(editing.city_order) }} ·
              {{ nightsLabel(editing) }} · guruhlar shu shablonni jonli ko'radi
            </template>
            <template v-else-if="editing">
              Guruhning o'z dasturi · {{ editing.group?.title || editing.group_telegram_id }}
              <span v-if="editing.group?.shape"> · {{ cellLabel(editing.group.shape.days, editing.group.shape.tier) }}</span>
              · shablon o'zgarishlari bu guruhga tegmaydi
            </template>
            <template v-else>
              Kunlar bo'yicha dastur: kabinet «Umra rejasi» va vaucher shu yerdan o'qiydi. Shakl = kun soni × Daraja.
            </template>
          </p>
        </div>

        <div v-if="!editing" class="flex items-center gap-2 shrink-0">
          <button @click="tab = 'shablonlar'" class="px-3 py-1.5 rounded-2xl text-sm font-medium transition-colors"
            :class="tab === 'shablonlar' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'">Shablonlar</button>
          <button @click="tab = 'joylar'" class="px-3 py-1.5 rounded-2xl text-sm font-medium transition-colors"
            :class="tab === 'joylar' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'">Joylar</button>
          <button v-if="tab === 'shablonlar'" @click="openCreate()"
            class="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl transition-colors">
            <font-awesome-icon icon="plus" class="w-3.5 h-3.5" /> Yangi shablon
          </button>
        </div>

        <div v-else class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button @click="previewOpen = true" class="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <font-awesome-icon icon="eye" class="w-3.5 h-3.5" /> Ko'rish (kabinet)
          </button>
          <button @click="openCopy(editing)" class="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <font-awesome-icon icon="copy" class="w-3.5 h-3.5" /> Nusxalash
          </button>
          <!-- Russian: fills what is still untranslated; when nothing is missing, offers
               to redo the whole programme (the office's own edits included). -->
          <button @click="translateProgram" :disabled="translating || dirty"
            :title="dirty ? 'Avval saqlang' : ''"
            class="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium transition-colors disabled:opacity-50"
            :class="editing.ru_missing ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-gray-600 hover:bg-gray-100'">
            <font-awesome-icon icon="language" class="w-3.5 h-3.5" />
            {{ translating ? 'Tarjima qilinmoqda...' : (editing.ru_missing ? `Ruscha tarjima (${editing.ru_missing} ta yo'q)` : 'Ruscha: to\'liq') }}
          </button>
          <button v-if="!editing.is_template" @click="revertToTemplate(editing.group_telegram_id!)"
            class="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
            <font-awesome-icon icon="rotate-right" class="w-3.5 h-3.5" /> Shablonga qaytarish
          </button>
          <button @click="saveItems" :disabled="!dirty || saving"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors">
            {{ saving ? 'Saqlanmoqda...' : (dirty ? 'Saqlash' : 'Saqlangan') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- ───────────── Grid of cells ───────────── -->
      <template v-else-if="!editing && tab === 'shablonlar'">
        <div class="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-sm text-amber-800 animate-fade-up">
          <p class="font-medium mb-1">Qanday ishlaydi</p>
          <p class="text-amber-700">
            Har bir katak — bitta safar shakli (<b>kun soni × Daraja</b>) va uning bitta shabloni. Guruh o'z katagini
            <b>Guruhlar</b> sahifasidagi kechalar va Daraja bo'yicha o'zi topadi. Shablonni o'zgartirsangiz, undagi
            hamma guruh darhol yangisini ko'radi. Bitta guruhga alohida dastur kerak bo'lsa — Guruhlar sahifasida
            «Guruhga moslashtirish»: nusxa olinadi va shablondan ajraladi. Pastdagi «shablonsiz» ro'yxatda kutilmagan
            shakl chiqsa (11 kun, 14 kun), guruhning kechalari noto'g'ri kiritilgan: <b>kecha = kun − 1</b>.
          </p>
        </div>

        <div v-if="templateCells.length === 0" class="bg-white rounded-3xl border border-gray-200 py-16 text-center animate-fade-up">
          <font-awesome-icon icon="route" class="w-10 h-10 text-gray-300 mb-4" />
          <p class="text-gray-400">Hali shablon yo'q — «Yangi shablon» tugmasida tayyor shakllar bor</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div v-for="(c, i) in templateCells" :key="c.days + c.tier"
            class="bg-white rounded-3xl border border-gray-200 p-4 flex flex-col gap-3 animate-fade-up"
            :style="{ animationDelay: `${(i + 1) * 30}ms` }">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-lg font-semibold text-gray-900 leading-tight">{{ cellLabel(c.days, c.tier) }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ planeLabel(c.order) }}<template v-if="c.template"> · {{ nightsLabel(c.template) }}</template></p>
              </div>
              <span class="text-[11px] px-2 py-0.5 rounded-lg shrink-0 bg-emerald-50 text-emerald-600">shablon</span>
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
              <p v-if="c.tier_inferred" class="text-[11px] text-amber-600 mt-1">
                {{ c.tier_inferred }} guruhda Daraja «avtomatik» — nomidan taxmin qilindi. Guruhlar sahifasida aniq tanlang.
              </p>
              <p v-if="c.template!.items_count" class="text-[11px] mt-1" :class="c.template!.ru_missing ? 'text-amber-600' : 'text-emerald-600'">
                <font-awesome-icon icon="language" class="w-3 h-3 mr-0.5" />
                {{ c.template!.ru_missing ? `Ruscha: ${c.template!.ru_missing} ta band tarjimasiz` : 'Ruscha tarjima to\'liq' }}
              </p>
            </div>

            <div class="flex items-center gap-1 mt-auto pt-1">
              <button @click="openProgram(c.template!.id)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                <font-awesome-icon icon="pen" class="w-3 h-3" /> Ochish
              </button>
              <button @click="openCopy(c.template!)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                <font-awesome-icon icon="copy" class="w-3 h-3" /> Nusxalash
              </button>
              <button @click="deleteTemplate(c.template!)"
                class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                <font-awesome-icon icon="trash" class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
        <!-- Groups whose computed shape has no template. Presented as GROUPS with the
             nights the office typed, not as cells: a «14 kun» here is a group whose
             12-night trip was entered as 13 nights, and the fix is on its card, not a
             new template. A real new shape is one click away all the same. -->
        <div v-if="unmatchedCells.length" class="space-y-3 animate-fade-up">
          <div class="flex items-center gap-2 pt-2">
            <font-awesome-icon icon="triangle-exclamation" class="w-4 h-4 text-amber-500" />
            <h3 class="text-base font-semibold text-gray-900">Shablonsiz guruhlar ({{ unmatchedTotal }})</h3>
            <span class="text-xs text-gray-500">— kabinetda «Dastur tayyorlanmoqda» ko'rinadi</span>
          </div>
          <div v-for="c in unmatchedCells" :key="'u' + c.days + c.tier" class="bg-white rounded-3xl border border-amber-200 overflow-hidden">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 bg-amber-50/60 border-b border-amber-100">
              <span class="text-sm font-semibold text-gray-900">{{ cellLabel(c.days, c.tier) }}</span>
              <span class="text-xs text-gray-500">{{ planeLabel(c.order) }} · {{ c.groups.length }} guruh</span>
              <span v-if="!KNOWN_DAYS.includes(c.days)" class="text-xs text-amber-700">
                Kompaniyada {{ c.days }} kunlik safar yo'q — kechalarni tekshiring (kecha = kun − 1)
              </span>
              <button @click="openCreate(c)" class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors">
                <font-awesome-icon icon="plus" class="w-3 h-3" /> Shu shakl uchun shablon
              </button>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="g in c.groups" :key="g.telegram_id" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                <span class="font-medium text-gray-800">{{ g.title || g.telegram_id }}</span>
                <span class="text-xs text-gray-500 tabular-nums">{{ nightsText(g.nights, c.order) }}</span>
                <span v-if="g.trip_start_date" class="text-xs text-gray-400 tabular-nums">{{ fmtDate(g.trip_start_date) }}</span>
                <span v-if="g.tier_inferred" class="text-[11px] px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700">Daraja avtomatik</span>
                <router-link to="/ai/groups" class="ml-auto text-xs text-amber-700 hover:underline">Guruhlarda tuzatish</router-link>
              </div>
            </div>
          </div>
        </div>
        <p v-if="groupsWithoutMap" class="text-[11px] text-gray-400">
          {{ groupsWithoutMap }} guruhda jo'nash sanasi bor, lekin kechalar kiritilmagan — ular hech qaysi shaklga tushmaydi.
        </p>
      </template>

      <!-- ───────────── Places dictionary ───────────── -->
      <template v-else-if="!editing && tab === 'joylar'">
        <div class="flex items-center gap-3 animate-fade-up">
          <input v-model="placeQuery" type="text" placeholder="Qidirish..."
            class="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <form @submit.prevent="addPlace" class="flex items-center gap-2">
            <input v-model="newPlace.name" type="text" placeholder="Yangi joy nomi" required
              class="w-56 bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <select v-model="newPlace.city" class="bg-white border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none">
              <option value="">shahar —</option>
              <option v-for="c in CITY_OPTS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <button type="submit" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-2xl">Qo'shish</button>
          </form>
        </div>
        <div class="bg-white rounded-3xl border border-gray-200 divide-y divide-gray-100 overflow-hidden animate-fade-up">
          <div v-if="filteredPlaces.length === 0" class="py-12 text-center text-gray-400 text-sm">Joylar ro'yxati bo'sh</div>
          <div v-for="p in filteredPlaces" :key="p.id" class="flex items-center gap-3 px-4 py-2.5">
            <span class="w-1.5 h-6 rounded-full shrink-0" :class="cityDot(p.city)"></span>
            <input v-if="placeEditId === p.id" v-model="placeEditName" @keyup.enter="savePlace(p)" @keyup.esc="placeEditId = null"
              class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <span v-else class="flex-1 text-sm text-gray-900">{{ p.name }}</span>
            <input v-if="placeEditId === p.id" v-model="placeEditNameRu" @keyup.enter="savePlace(p)" @keyup.esc="placeEditId = null"
              placeholder="Русское название — avtomatik"
              class="flex-1 bg-sky-50/40 border border-sky-100 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            <span v-else class="flex-1 text-sm" :class="p.name_ru ? 'text-sky-700' : 'text-amber-500'">{{ p.name_ru || 'ruscha yo\'q' }}</span>
            <select v-if="placeEditId === p.id" v-model="placeEditCity" class="bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-xs">
              <option value="">shahar —</option>
              <option v-for="c in CITY_OPTS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <span v-else class="text-[11px] text-gray-400 w-16">{{ cityName(p.city) || '—' }}</span>
            <span class="text-[11px] text-gray-400 w-20 text-right">{{ p.used }} bandda</span>
            <template v-if="placeEditId === p.id">
              <button @click="savePlace(p)" class="px-3 py-1.5 rounded-2xl text-xs font-medium text-white bg-amber-600 hover:bg-amber-700">Saqlash</button>
              <button @click="placeEditId = null" class="px-3 py-1.5 rounded-2xl text-xs text-gray-500 hover:bg-gray-100">Bekor</button>
            </template>
            <template v-else>
              <button @click="editPlace(p)" class="px-3 py-1.5 rounded-2xl text-xs font-medium text-gray-500 hover:bg-gray-100"><font-awesome-icon icon="pen" class="w-3 h-3" /></button>
              <button @click="deletePlace(p)" :disabled="p.used > 0" :title="p.used ? 'Dasturda ishlatilgan' : ''"
                class="px-3 py-1.5 rounded-2xl text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"><font-awesome-icon icon="trash" class="w-3 h-3" /></button>
            </template>
          </div>
        </div>
      </template>

      <!-- ───────────── Editor ───────────── -->
      <template v-else-if="editing">
        <div v-if="editing.warnings?.includes('copy_stale')" class="bg-rose-50 border border-rose-200 rounded-3xl p-3 text-sm text-rose-700">
          Guruhning kechalari o'chirilgan — dastur nusxa olingan paytdagi shakl bo'yicha ko'rsatilmoqda.
        </div>

        <!-- Template shape: the office's own nights, editable; groups on it inherit the days. -->
        <div v-if="editing.is_template" class="bg-white rounded-3xl border border-gray-200 p-4 animate-fade-up">
          <div class="flex flex-wrap items-end gap-3">
            <div class="min-w-[14rem] flex-1">
              <label class="block text-[11px] text-gray-400 mb-1">Shablon nomi</label>
              <input v-model="shapeForm.name" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 mb-1">Daraja</label>
              <select v-model="shapeForm.tier" class="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="comfort">Comfort</option>
                <option value="premium">Premium / Lux</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 mb-1">Marshrut</label>
              <select v-model="shapeForm.city_order" class="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="makka_madina">Shanba · Jidda → Makka → Madina</option>
                <option value="madina_makka">Payshanba · Madina → Makka</option>
              </select>
            </div>
            <div v-for="leg in LEGS" :key="leg.key">
              <label class="block text-[11px] text-gray-400 mb-1">{{ leg.label }} kechasi</label>
              <input v-model.number="shapeForm[leg.key]" type="number" min="0" class="w-20 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div class="text-sm text-gray-500 pb-2">= <b class="text-gray-800">{{ shapeDays }} kun</b></div>
            <button @click="saveShape" :disabled="!shapeDirty || saving"
              class="px-4 py-2 rounded-2xl text-sm font-medium transition-colors"
              :class="shapeDirty ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-400'">Shaklni saqlash</button>
          </div>
        </div>

        <div v-if="!dirty && editing.days_list.every(d => d.items.length === 0)" class="bg-amber-50 border border-amber-200 rounded-3xl p-3 text-sm text-amber-800">
          Dastur bo'sh. Har bir kunga joylarni kiriting — «+ band» ni bosing yoki oxirgi izohda Enter.
        </div>

        <div class="flex items-center justify-end gap-2 text-xs text-gray-500">
          <span>Ruscha qatorlarni ko'rsatish</span>
          <button @click="showRu = !showRu" type="button" role="switch" :aria-checked="showRu"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            :class="showRu ? 'bg-sky-500' : 'bg-gray-300'">
            <span class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform" :class="showRu ? 'translate-x-4' : 'translate-x-0.5'"></span>
          </button>
        </div>

        <div class="bg-white rounded-3xl border border-gray-200 overflow-hidden animate-fade-up">
          <div v-for="d in editing.days_list" :key="d.day" class="flex gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
            :class="d.city === 'jidda' ? 'bg-amber-50/30' : d.city === 'madina' ? 'bg-sky-50/30' : ''">
            <div class="w-16 shrink-0 pt-1.5">
              <p class="text-sm font-semibold text-gray-900 tabular-nums">{{ d.day }}-kun</p>
              <p class="text-[11px] text-gray-500">{{ weekdayName(d.weekday) }}</p>
              <p class="text-[11px] text-gray-400 tabular-nums">{{ fmtDate(d.date) }}</p>
            </div>
            <div class="w-[4.5rem] shrink-0 pt-1.5">
              <span class="inline-block text-[11px] font-medium px-2 py-0.5 rounded-lg" :class="cityBand(d.city)">{{ cityName(d.city) || '—' }}</span>
            </div>
            <div class="flex-1 min-w-0 space-y-1.5">
              <div v-for="(it, idx) in d.items" :key="idx" class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="w-5 text-right text-[11px] text-gray-300 tabular-nums shrink-0">{{ idx + 1 }}</span>
                  <input v-model="it.place_name" type="text" list="program-places" placeholder="Joy" @input="dirty = true"
                    :data-item="`${d.day}-${idx}`"
                    class="w-56 bg-gray-50 border rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    :class="it.place_name.trim() ? 'border-gray-200' : 'border-rose-300 ring-1 ring-rose-200'" />
                  <input v-model="it.note" type="text" placeholder="Izoh (nima bo'ladi)" @input="dirty = true"
                    @keydown.enter.prevent="addItem(d, idx)"
                    class="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <button @click="moveItem(d, idx, -1)" :disabled="idx === 0" class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-20" title="Yuqoriga"><font-awesome-icon icon="arrow-up" class="w-3 h-3" /></button>
                  <button @click="moveItem(d, idx, 1)" :disabled="idx === d.items.length - 1" class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-20" title="Pastga"><font-awesome-icon icon="arrow-down" class="w-3 h-3" /></button>
                  <button @click="removeItem(d, idx)" class="p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="O'chirish"><font-awesome-icon icon="xmark" class="w-3 h-3" /></button>
                </div>
                <!-- The Russian line the cabinet shows a Russian reader. Empty = the model fills
                     it on save; typed = kept as typed. The place's Russian is shared by every
                     programme naming that place, the note's belongs to this line. -->
                <div v-if="showRu" class="flex items-center gap-2 pr-[5.75rem]">
                  <span class="w-5 text-right text-[10px] font-semibold text-sky-400 shrink-0">RU</span>
                  <input v-model="it.place_ru" type="text" placeholder="Название места — avtomatik" @input="dirty = true"
                    class="w-56 bg-sky-50/40 border border-sky-100 rounded-xl px-3 py-1 text-xs text-gray-700 placeholder:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                  <input v-if="it.note.trim()" v-model="it.note_ru" type="text" placeholder="Примечание — avtomatik" @input="dirty = true"
                    class="flex-1 min-w-0 bg-sky-50/40 border border-sky-100 rounded-xl px-3 py-1 text-xs text-gray-700 placeholder:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
              </div>
              <button @click="addItem(d, d.items.length - 1)" class="text-xs text-gray-400 hover:text-amber-600 px-1 py-1">+ band</button>
            </div>
          </div>
        </div>
        <datalist id="program-places">
          <option v-for="p in places" :key="p.id" :value="p.name">{{ cityName(p.city) }}</option>
        </datalist>
        <p class="text-[11px] text-gray-400">
          Joyni ro'yxatdan tanlang yoki yangisini yozing — u «Joylar» lug'atiga o'zi qo'shiladi. Tartib — strelkalar bilan.
          Kun shahri Guruhlar sahifasidagi kechalardan olinadi, bu yerda o'zgarmaydi.
        </p>
      </template>
    </div>

    <!-- ───────────── Create template ───────────── -->
    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="createOpen = false">
      <div class="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Yangi shablon</h3>
        <p class="text-sm text-gray-500">Bir shakl uchun bitta shablon. Tayyor shakllardan birini bosing yoki kechalarni o'zingiz kiriting.</p>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="pr in PRESETS" :key="pr.name" @click="applyPreset(pr)" type="button"
            class="px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors"
            :class="presetActive(pr) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
            {{ pr.name }}
          </button>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">Nomi</label>
          <input v-model="createForm.name" type="text" placeholder="Masalan: Shanba 13 kun comfort" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Daraja</label>
            <select v-model="createForm.tier" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none">
              <option value="comfort">Comfort</option>
              <option value="premium">Premium / Lux</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Marshrut</label>
            <select v-model="createForm.city_order" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none">
              <option value="makka_madina">Shanba · Jidda → Makka → Madina</option>
              <option value="madina_makka">Payshanba · Madina → Makka</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="leg in LEGS" :key="leg.key">
            <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ leg.label }} kechasi</label>
            <input v-model.number="createForm[leg.key]" type="number" min="0" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>
        <p class="text-sm text-gray-600">Shakl: <b>{{ cellLabel(createDays, createForm.tier) }}</b></p>
        <p v-if="formError" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="createOpen = false" class="px-4 py-2 rounded-2xl text-sm text-gray-500 hover:bg-gray-100">Bekor qilish</button>
          <button @click="createTemplate" :disabled="saving" class="px-4 py-2 rounded-2xl text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">Yaratish</button>
        </div>
      </div>
    </div>

    <!-- ───────────── Copy ───────────── -->
    <div v-if="copyOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="copyOpen = false">
      <div class="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900">Nusxalash: {{ copySource?.name }}</h3>
        <div class="flex gap-2">
          <button @click="copyForm.mode = 'group'" class="flex-1 px-3 py-2 rounded-2xl text-sm font-medium border transition-colors"
            :class="copyForm.mode === 'group' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">Guruhga</button>
          <button @click="copyForm.mode = 'cell'" class="flex-1 px-3 py-2 rounded-2xl text-sm font-medium border transition-colors"
            :class="copyForm.mode === 'cell' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">Yangi shablonga</button>
        </div>
        <template v-if="copyForm.mode === 'group'">
          <p class="text-sm text-gray-500">Guruh o'z nusxasini oladi va shablondan ajraladi. Keyin uni shu yerda tahrirlaysiz.</p>
          <select v-model="copyForm.group_telegram_id" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none">
            <option :value="null">— guruhni tanlang —</option>
            <option v-for="g in groupsForCopy" :key="g.id" :value="g.id">{{ g.title || g.id }}<template v-if="g.trip_start_date"> · {{ fmtDate(g.trip_start_date) }}</template></option>
          </select>
        </template>
        <template v-else>
          <p class="text-sm text-gray-500">Boshqa shakl uchun shablon: bandlar kunma-kun ko'chadi, yangi shakldan ortiq kunlar tushib qoladi.</p>
          <input v-model="copyForm.name" type="text" placeholder="Yangi shablon nomi" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <div class="grid grid-cols-2 gap-3">
            <select v-model="copyForm.tier" class="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none">
              <option value="comfort">Comfort</option>
              <option value="premium">Premium / Lux</option>
            </select>
            <select v-model="copyForm.city_order" class="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none">
              <option value="makka_madina">Shanba · Jidda → Makka → Madina</option>
              <option value="madina_makka">Payshanba · Madina → Makka</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="leg in LEGS" :key="leg.key">
              <label class="block text-xs font-medium text-gray-500 mb-1.5">{{ leg.label }} kechasi</label>
              <input v-model.number="copyForm[leg.key]" type="number" min="0" class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <p class="text-sm text-gray-600">Shakl: <b>{{ cellLabel(copyDays, copyForm.tier) }}</b></p>
        </template>
        <p v-if="formError" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="copyOpen = false" class="px-4 py-2 rounded-2xl text-sm text-gray-500 hover:bg-gray-100">Bekor qilish</button>
          <button @click="doCopy" :disabled="saving" class="px-4 py-2 rounded-2xl text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">Nusxalash</button>
        </div>
      </div>
    </div>

    <!-- ───────────── Preview, as the cabinet shows it ───────────── -->
    <div v-if="previewOpen && editing" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="previewOpen = false">
      <div class="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div class="sticky top-0 bg-white/95 backdrop-blur px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p class="text-base font-semibold text-gray-900">Umra rejasi</p>
            <p class="text-xs text-gray-500">{{ editing.is_template ? 'Shablon ko\'rinishi (sana — eng yaqin reys)' : (editing.group?.title || '') }}</p>
          </div>
          <button @click="previewOpen = false" class="p-2 rounded-xl text-gray-400 hover:bg-gray-100"><font-awesome-icon icon="xmark" class="w-4 h-4" /></button>
        </div>
        <div class="px-5 py-3 space-y-4">
          <div v-for="d in editing.days_list" :key="d.day">
            <div class="flex items-baseline gap-2 mb-1">
              <span class="text-sm font-semibold text-gray-900">{{ d.day }}-kun</span>
              <span class="text-xs text-gray-500">{{ weekdayName(d.weekday) }}<template v-if="d.date">, {{ fmtDate(d.date) }}</template></span>
              <span class="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-lg" :class="cityBand(d.city)">{{ cityName(d.city) }}</span>
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
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'
import { useConfirm } from '../../../composables/useConfirm'
import { useToast } from '../../../composables/useToast'

// ─── Types ────────────────────────────────────────────────────────────────────────

interface Shape { days: number; tier: string; order: string; tier_inferred: boolean }
interface ProgramSummary {
  id: number; name: string; is_template: boolean; group_telegram_id: number | null
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
interface Place { id: number; name: string; city: string | null; name_ru: string | null; used: number }
interface GroupRow { id: number; title: string | null; trip_start_date: string | null }

type LegKey = 'jidda_nights' | 'makka_nights' | 'madina_nights'
const LEGS: { key: LegKey; label: string }[] = [
  { key: 'jidda_nights', label: 'Jidda' },
  { key: 'makka_nights', label: 'Makka' },
  { key: 'madina_nights', label: 'Madina' },
]
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
  return order === 'madina_makka' ? 'Payshanba · Madina → Makka' : 'Shanba · Jidda → Makka → Madina'
}
function nightsLabel(p: { jidda_nights: number | null; makka_nights: number | null; madina_nights: number | null; city_order?: string | null }): string {
  const parts: string[] = []
  const seq: LegKey[] = p.city_order === 'madina_makka'
    ? ['madina_nights', 'makka_nights'] : ['jidda_nights', 'makka_nights', 'madina_nights']
  for (const k of seq) {
    const n = p[k] || 0
    if (n) parts.push(`${LEGS.find(l => l.key === k)!.label} ${n}`)
  }
  return parts.join(' · ')
}
function nightsText(n: { jidda: number; makka: number; madina: number }, order: string): string {
  const seq: ('jidda' | 'makka' | 'madina')[] = order === 'madina_makka' ? ['madina', 'makka'] : ['jidda', 'makka', 'madina']
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
      ? 'Bu guruhda kechalar kiritilmagan — avval Guruhlar sahifasida to\'ldiring'
      : 'Bu guruh shakli uchun shablon yo\'q — avval shablon yarating')
    router.replace({ query: {} })
  } catch (e: any) { toast.error(errText(e, 'Guruh dasturi ochilmadi')) }
}

async function closeEditor() {
  if (dirty.value && !(await confirm({ title: 'Saqlanmagan o\'zgarishlar bor', message: 'Chiqsangiz, ular yo\'qoladi', confirmText: 'Chiqish' }))) return
  editing.value = null
  dirty.value = false
  router.replace({ query: {} })
  await loadCells()
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadCells(), loadPlaces()])
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

async function saveItems() {
  if (!editing.value) return
  const p = editing.value
  const empty = p.days_list.find(d => d.items.some(it => !it.place_name.trim()))
  if (empty) { toast.error(`${empty.day}-kunda joysiz band bor — joyni yozing yoki bandni o'chiring`); return }
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
    if (data.ru_pending) toast.info('Dastur saqlandi, ruscha tarjima qilinmadi — «Ruscha tarjima» tugmasini bosing')
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
    if (!(await confirm({ title: 'Barcha ruscha matnni qaytadan tarjima qilish?', message: 'Qo\'lda tahrirlangan ruscha qatorlar ham model tarjimasi bilan almashadi.' }))) return
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

const shapeForm = reactive({ name: '', tier: 'comfort', city_order: 'makka_madina', jidda_nights: 0, makka_nights: 0, madina_nights: 0 })
function resetShapeForm() {
  const p = editing.value
  if (!p) return
  shapeForm.name = p.name
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
  return shapeForm.name !== p.name || shapeForm.tier !== p.tier || shapeForm.city_order !== p.city_order
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
    toast.success(data.dropped_items ? `Shakl saqlandi, ${data.dropped_items} ta band tushib qoldi (kunlar kamaydi)` : 'Shakl saqlandi')
  } catch (e: any) {
    toast.error(errText(e, 'Shakl saqlanmadi'))
  } finally { saving.value = false }
}

// ─── Create ───────────────────────────────────────────────────────────────────────

const createOpen = ref(false)
const createForm = reactive({ name: '', tier: 'comfort', city_order: 'makka_madina', jidda_nights: 1, makka_nights: 8, madina_nights: 3 })
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
function openCreate(cell?: Cell) {
  formError.value = ''
  if (cell) {
    createForm.tier = cell.tier
    createForm.city_order = cell.order
    // A cell known only from groups: prefill the plane's usual split for its length.
    if (cell.order === 'madina_makka') {
      createForm.jidda_nights = 0; createForm.madina_nights = Math.min(4, cell.days - 1); createForm.makka_nights = cell.days - 1 - createForm.madina_nights
    } else {
      createForm.jidda_nights = 1; createForm.madina_nights = cell.days >= 13 ? 3 : 2; createForm.makka_nights = cell.days - 1 - 1 - createForm.madina_nights
    }
    createForm.name = `${cell.order === 'madina_makka' ? 'Payshanba' : 'Shanba'} ${cell.days} kun ${tierLabel(cell.tier)}`
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
    const { data } = await api.post('/programs', { ...createForm, name: createForm.name.trim() })
    createOpen.value = false
    toast.success('Shablon yaratildi')
    await loadCells()
    await openProgram(data.id)
  } catch (e: any) {
    formError.value = errText(e, 'Yaratilmadi')
  } finally { saving.value = false }
}

async function deleteTemplate(t: ProgramSummary) {
  if (!(await confirm({ title: `Shablonni o'chirish: ${t.name}`, message: 'Bu shakldagi guruhlar dastursiz qoladi. Guruhlarning o\'z nusxalari saqlanadi.' }))) return
  try {
    await api.delete(`/programs/${t.id}`)
    toast.success('O\'chirildi')
    await loadCells()
  } catch (e: any) { toast.error(errText(e, 'O\'chirilmadi')) }
}

async function revertToTemplate(telegramId: number) {
  if (!(await confirm({ title: 'Shablonga qaytarish', message: 'Guruhning o\'z dasturi o\'chiriladi, u yana shablonni ko\'radi.', confirmText: 'Qaytarish' }))) return
  try {
    await api.delete(`/programs/groups/${telegramId}/customize`)
    toast.success('Guruh shablonga qaytdi')
    editing.value = null
    dirty.value = false
    router.replace({ query: {} })
    await loadCells()
  } catch (e: any) { toast.error(errText(e, 'Qaytarilmadi')) }
}

// ─── Copy ─────────────────────────────────────────────────────────────────────────

const copyOpen = ref(false)
const copySource = ref<ProgramSummary | null>(null)
const copyForm = reactive({ mode: 'group' as 'group' | 'cell', group_telegram_id: null as number | null, name: '', tier: 'comfort', city_order: 'makka_madina', jidda_nights: 0, makka_nights: 0, madina_nights: 0 })
const copyDays = computed(() => (copyForm.jidda_nights || 0) + (copyForm.makka_nights || 0) + (copyForm.madina_nights || 0) + 1)
const groupsForCopy = computed(() => groups.value.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '')))

function openCopy(src: ProgramSummary) {
  formError.value = ''
  copySource.value = src
  copyForm.mode = 'group'
  copyForm.group_telegram_id = null
  copyForm.name = `${src.name} (nusxa)`
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
    : { name: copyForm.name.trim(), tier: copyForm.tier, city_order: copyForm.city_order, jidda_nights: copyForm.jidda_nights, makka_nights: copyForm.makka_nights, madina_nights: copyForm.madina_nights }
  if (copyForm.mode === 'group' && !body.group_telegram_id) { formError.value = 'Guruhni tanlang'; return }
  if (copyForm.mode === 'cell' && !body.name) { formError.value = 'Nomini kiriting'; return }
  saving.value = true
  try {
    const { data } = await api.post(`/programs/${copySource.value.id}/copy`, body)
    copyOpen.value = false
    toast.success(data.dropped_items ? `Nusxalandi, ${data.dropped_items} ta band tushib qoldi` : 'Nusxalandi')
    await loadCells()
    await openProgram(data.id)
  } catch (e: any) {
    formError.value = errText(e, 'Nusxalanmadi')
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
</script>

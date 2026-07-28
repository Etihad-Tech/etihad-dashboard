<template>
   <AppLayout>
      <div class="space-y-6">
         <div class="flex items-center justify-between gap-4 flex-wrap animate-fade-up">
            <div>
               <h2 class="text-2xl font-bold text-gray-900">{{ scopeTitle }}</h2>
               <p class="text-sm text-gray-500 mt-1">{{ scopeSubtitle }}</p>
            </div>
            <div class="flex items-center gap-2">
               <div class="flex gap-1 bg-gray-100 rounded-xl p-1">
                  <button v-for="p in PERIODS" :key="p.value" @click="setPeriod(p.value)"
                     class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                     :class="period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'">
                     {{ p.label }}
                  </button>
               </div>
            </div>
         </div>

         <!-- WHICH SLICE of the trip everything below describes. Applied on the SERVER,
              so the cards, the trend, the table and the jurnal can never end up
              describing different slices. -->
         <div class="flex flex-wrap items-center gap-2 animate-fade-up">
            <select v-model="filterGroup" @change="load"
               class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white max-w-[240px]">
               <option value="">Barcha guruhlar</option>
               <option v-for="g in groupChoices" :key="g.chat_id" :value="String(g.chat_id)">
                  {{ g.label }}
               </option>
            </select>
            <select v-model="filterCity" @change="load"
               class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white">
               <option value="">Ikkala shahar</option>
               <option value="makka">Makka</option>
               <option value="madina">Madina</option>
            </select>
            <button v-if="filterGroup || filterCity" @click="clearSlice"
               class="text-xs text-gray-500 hover:text-gray-800 underline">
               Filtrni tozalash
            </button>
            <span v-if="filterGroup || filterCity" class="text-[11px] text-gray-400">
               Quyidagi barcha raqamlar faqat shu tanlov bo'yicha
            </span>
         </div>

         <div v-if="loading" class="flex justify-center py-12">
            <div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
         </div>

         <div v-else-if="loadError"
            class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm animate-fade-up">
            <p class="font-medium text-red-800 mb-1">Ma'lumotni yuklab bo'lmadi</p>
            <p class="text-red-700 mb-3">
               Bu «murojaat yo'q» degani EMAS — server javob bermadi yoki ruxsat yetmadi.
            </p>
            <button @click="load"
               class="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg">
               Qayta urinish
            </button>
         </div>

         <template v-else>
            <!-- MUROJAATLAR — counted per NEED -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up">
               <div v-for="(c, i) in needCards" :key="i" class="bg-white rounded-2xl border border-gray-200 p-4">
                  <p class="text-xs text-gray-500">{{ c.label }}</p>
                  <p class="text-2xl font-bold mt-1" :class="c.tone">{{ c.value }}</p>
                  <p v-if="c.hint" class="text-[11px] text-gray-400 mt-1">{{ c.hint }}</p>
               </div>
            </div>

            <!-- XODIM JAVOBLARI — counted per WORKER, not per need. Kept in its own
                 titled block because a need sent to the whole crew produces one row per
                 member: these numbers are NOT shares of "Murojaatlar" above. -->
            <div class="animate-fade-up">
               <div class="mb-2">
                  <h3 class="text-base font-semibold text-gray-900">{{ personWord }} javoblari</h3>
                  <p class="text-[11px] text-gray-400">
                     Har bir {{ personWordLower }} uchun alohida sanaladi — bitta murojaat
                     butun jamoaga yuborilsa, har biri uchun bittadan yoziladi
                  </p>
               </div>
               <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div v-for="(c, i) in workerCards" :key="i" class="bg-white rounded-2xl border border-gray-200 p-4">
                     <p class="text-xs text-gray-500">{{ c.label }}</p>
                     <p class="text-2xl font-bold mt-1" :class="c.tone">{{ c.value }}</p>
                     <p v-if="c.hint" class="text-[11px] text-gray-400 mt-1">{{ c.hint }}</p>
                  </div>
               </div>

               <!-- The four colours in one place. «Takroriy so'rov» and «Bajarilmagan»
                    are the two ends of the SAME event (the pilgrim asked twice) seen
                    from different legs of the chain, which is exactly what nobody could
                    tell from the old near-identical names. -->
               <div class="mt-3 bg-white rounded-2xl border border-gray-200 p-4">
                  <p class="text-xs font-semibold text-gray-900 mb-2">Ranglar nimani bildiradi</p>
                  <div class="grid gap-2 sm:grid-cols-2">
                     <div v-for="l in LEGEND" :key="l.label" class="flex gap-2">
                        <span class="shrink-0">{{ l.dot }}</span>
                        <p class="text-xs text-gray-600">
                           <span class="font-medium" :class="l.tone">{{ l.label }}</span>
                           — {{ l.text }}
                        </p>
                     </div>
                  </div>
                  <p class="text-[11px] text-gray-400 mt-3">
                     Ziyoratchi bitta narsani ikki marta so'rasa, u BITTA hodisa ikkita
                     raqam beradi: birinchi murojaatni olgan xodimga 🔴 Bajarilmagan,
                     ikkinchisini olganga 🟡 Takroriy so'rov.
                  </p>
               </div>
            </div>

            <!-- trend: how the buckets move over time (line graph, not just totals) -->
            <div class="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 animate-fade-up">
               <div class="flex items-baseline justify-between gap-3 mb-4">
                  <div>
                     <h3 class="text-sm font-semibold text-gray-900">Vaqt bo'yicha dinamika</h3>
                     <p class="text-[11px] text-gray-400 mt-0.5">
                        {{ period === 'day' ? 'Soatlar' : 'Kunlar' }} bo'yicha
                        {{ personWordLower }} javoblari (Makka/Madina vaqti)
                     </p>
                  </div>
               </div>
               <div v-if="trendLabels.length" class="h-56 sm:h-72">
                  <Line :data="trendData" :options="trendOptions" :plugins="[crosshairPlugin]" />
               </div>
               <div v-else class="py-12 text-center text-gray-400 text-sm">
                  Bu davr uchun ma'lumot yo'q
               </div>
            </div>

            <div v-if="report && report.undelivered"
               class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 animate-fade-up">
               <p class="font-medium mb-1">{{ report.undelivered }} ta xabar yetib bormadi</p>
               <p class="text-amber-700">
                  Ular botni «Start» qilmagan — javob bermagani o'zlarining aybi emas
                  va hisobotda ularga yozilmaydi. Jadvalda bu «Hisobga olinmagan»
                  ustunida ko'rinadi.
               </p>
               <!-- Name them. A bare count leaves the office guessing WHO to chase, and
                    the readiness check cannot predict this case: a telegram_id typed into
                    the staff row looks reachable, but Telegram still refuses a DM to
                    someone who never pressed Start privately. -->
               <div v-if="undeliveredPeople.length" class="flex flex-wrap gap-1.5 mt-2">
                  <span v-for="(p, i) in undeliveredPeople" :key="i"
                     class="text-xs px-2 py-0.5 bg-white border border-amber-200 rounded-lg text-amber-800">
                     {{ p }}
                  </span>
               </div>
            </div>

            <!-- needs that reached NOBODY — no crew for that city, or none DM-able -->
            <div v-if="report && report.unassigned"
               class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm animate-fade-up">
               <p class="font-medium text-red-800 mb-1">
                  {{ report.unassigned }} ta murojaat hech kimga yetmadi
               </p>
               <p class="text-red-700">
                  Bu shahar uchun xodim biriktirilmagan yoki hech biriga DM yuborib bo'lmadi —
                  ziyoratchining so'rovi hech kimga topshirilmagan. Xodimlar ro'yxatini
                  va quyidagi «Start» ogohlantirishini tekshiring.
                  <span class="block mt-1 text-red-600/80">
                     Bu raqam lavozim bo'yicha ajratilmaydi: hech kimga bormagan murojaatda
                     mas'ul yo'q, shuning uchun u ikkala nazoratchida ham ko'rinadi.
                  </span>
               </p>
            </div>

            <!-- #4: active staff / leaders the bot can't reach yet (never pressed Start) -->
            <div v-if="staffReadiness.length"
               class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm animate-fade-up">
               <p class="font-medium text-red-800 mb-1">
                  {{ staffReadiness.length }} ta faol
                  {{ scope === 'all' ? 'xodim/ellikboshiga' : personWordLower + 'ga' }}
                  DM yuborib bo'lmaydi
               </p>
               <p class="text-red-700 mb-2">
                  Ular botni «Start» qilmagan — murojaatlar ularga umuman bormaydi. Har biri botga
                  <code class="bg-white px-1 rounded">/start</code> yozishi kerak
                  (yoki Xodimlar sahifasida ularning Telegram ID raqamini kiriting).
               </p>
               <div class="flex flex-wrap gap-1.5">
                  <span v-for="(s, i) in staffReadiness" :key="i"
                     class="text-xs px-2 py-0.5 bg-white border border-red-200 rounded-lg text-red-700">
                     {{ s.username || s.name || '—' }}
                     <template v-if="s.location"> · {{ s.location }}</template>
                     <template v-if="s.role === 'ellikboshi'"> · Ellikboshi</template>
                  </span>
               </div>
            </div>

            <!-- #1: confirmed bot mistakes, broken down by kind -->
            <div v-if="errorKinds.length"
               class="bg-white rounded-2xl border border-gray-200 p-4 animate-fade-up">
               <h3 class="text-sm font-semibold text-gray-900 mb-3">Bot xatolari — turlari bo'yicha</h3>
               <div class="space-y-2">
                  <div v-for="k in errorKinds" :key="k.label" class="flex items-center gap-3">
                     <span class="text-xs text-gray-600 w-40 shrink-0">{{ k.label }}</span>
                     <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div class="bg-indigo-500 h-full rounded-full"
                           :style="{ width: (report && report.bot_mistakes ? (k.count / report.bot_mistakes * 100) : 0) + '%' }"></div>
                     </div>
                     <span class="text-xs font-semibold text-gray-900 w-6 text-right">{{ k.count }}</span>
                  </div>
               </div>
            </div>

            <!-- per-worker evidence sheet -->
            <div class="animate-fade-up">
               <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 class="text-base font-semibold text-gray-900">{{ personWord }}lar nazorati</h3>
                  <div class="flex flex-wrap items-center gap-2">
                     <!-- Only the combined account ever sees both lavozim in the data;
                          for a scoped controller this dropdown would have one option. -->
                     <select v-if="scope === 'all'" v-model="filterRole"
                        class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white">
                        <option value="">Barcha lavozimlar</option>
                        <option value="staff">Xodim</option>
                        <option value="ellikboshi">Ellikboshi</option>
                     </select>
                     <select v-model="filterName"
                        class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white max-w-[180px]">
                        <option value="">Barcha ismlar</option>
                        <option v-for="n in workerNameOptions" :key="n" :value="n">{{ n }}</option>
                     </select>
                  </div>
               </div>
               <div v-if="filteredWorkers.length === 0"
                  class="bg-white rounded-2xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
                  {{ workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
                     : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
               </div>
               <div v-else class="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                  <table class="w-full text-sm min-w-[640px]">
                     <thead>
                        <tr class="text-left text-xs text-gray-500 border-b border-gray-100">
                           <th class="px-4 py-3 font-medium">Username</th>
                           <th class="px-3 py-3 font-medium" title="Shifokorga faqat sog'liq murojaatlari, aeroport xodimiga faqat aeroport murojaatlari boradi — shuning uchun ularning soni kam bo'lishi normal">Vazifa</th>
                           <th class="px-4 py-3 font-medium">Ism</th>
                           <th class="px-3 py-3 font-medium" title="Qaysi shaharlarda va nechta guruhda ishlagan">Qayerda</th>
                           <th class="px-3 py-3 font-medium text-center" title="Shu odamga yuborilgan kartochkalar soni">Murojaatlar</th>
                           <th class="px-3 py-3 font-medium text-center">Qabul</th>
                           <th class="px-3 py-3 font-medium text-center" title="Yetib borgan, lekin qabul qilinmagan">🔵 Javobsiz</th>
                           <th class="px-3 py-3 font-medium text-center" title="Qabul qilindi, ziyoratchi qayta so'ramadi">🟢 Bajarildi</th>
                           <th class="px-3 py-3 font-medium text-center" title="Ziyoratchi ilgari so'ragan edi — shu odam ikkinchi so'rovni qabul qildi">🟡 Takroriy so'rov</th>
                           <th class="px-3 py-3 font-medium text-center" title="Qabul qilgan, LEKIN ziyoratchi qayta so'ragan — aslida hal qilinmagan">🔴 Bajarilmagan</th>
                           <th class="px-3 py-3 font-medium text-center" title="Bu odamning zimmasidan chiqqan kartochkalar: yetib bormagan, boshqa xodim olgan yoki «Xatolik» deb belgilangan. Ular hech qaysi rangga qo'shilmaydi.">Hisobga olinmagan</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="w in filteredWorkers" :key="w.telegram_id"
                           class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                           <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              {{ w.username || ('ID ' + w.telegram_id) }}
                           </td>
                           <td class="px-3 py-3">
                              <span class="text-xs px-2 py-0.5 rounded-lg whitespace-nowrap"
                                 :class="w.role === 'ellikboshi' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'">
                                 {{ jobLabel(w) }}
                              </span>
                           </td>
                           <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ w.name || '—' }}</td>
                           <td class="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{{ whereLabel(w) }}</td>
                           <td class="px-3 py-3 text-center text-gray-600">{{ w.dms }}</td>
                           <td class="px-3 py-3 text-center text-gray-600">{{ w.accepted }}</td>
                           <td class="px-3 py-3 text-center"
                              :class="w.never_accepted ? 'text-blue-600 font-semibold' : 'text-gray-400'">
                              {{ w.never_accepted }}
                           </td>
                           <td class="px-3 py-3 text-center"
                              :class="w.completed ? 'text-emerald-600 font-semibold' : 'text-gray-400'">
                              {{ w.completed }}
                           </td>
                           <td class="px-3 py-3 text-center"
                              :class="w.re_requests ? 'text-amber-600 font-semibold' : 'text-gray-400'">
                              {{ w.re_requests }}
                           </td>
                           <td class="px-3 py-3 text-center"
                              :class="w.reopened ? 'text-red-600 font-semibold' : 'text-gray-400'">
                              {{ w.reopened }}
                           </td>
                           <!-- Without this the row simply does not add up: a card that
                                never arrived / a colleague took / was flagged leaves every
                                colour column at 0, so "1 murojaat" then six zeros reads as
                                broken data instead of "it never became their job". -->
                           <td class="px-3 py-3 text-center" :title="uncountedHint(w)"
                              :class="uncounted(w) ? 'text-gray-600' : 'text-gray-400'">
                              {{ uncounted(w) }}
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
               <p class="text-[11px] text-gray-400 mt-2">
                  Har bir qatorda: <b>Murojaatlar = Qabul + Javobsiz + Hisobga olinmagan</b>,
                  <b>Qabul = Bajarildi + Takroriy so'rov + Bajarilmagan</b>.
                  Sonlar xodimlar o'rtasida turlicha bo'lishi normal: kartochka faqat
                  <b>o'sha paytdagi shahar jamoasiga</b> yuboriladi, shifokorga esa faqat
                  sog'liq murojaatlari — hammaga hamma murojaat bormaydi.
               </p>
            </div>

            <!-- drill-down -->
            <div class="animate-fade-up">
               <div class="flex items-center justify-between mb-3">
                  <h3 class="text-base font-semibold text-gray-900">
                     Har bir {{ personWordLower }} bo'yicha jurnal
                  </h3>
                  <button @click="showRequests = !showRequests"
                     class="text-xs font-medium text-gray-500 hover:text-gray-800">
                     {{ showRequests ? 'Yashirish' : 'Ko\'rsatish' }}
                  </button>
               </div>
               <div v-if="showRequests">
                  <div v-if="staffLogs.length === 0"
                     class="bg-white rounded-2xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
                     {{ workers.length === 0 ? 'Bu davrda murojaat bo\'lmagan'
                     : 'Filtrga mos ' + personWordLower + ' topilmadi' }}
                  </div>
                  <!-- compact list of names; tap a name to open that xodim's log -->
                  <div v-else class="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                     <div v-for="s in staffLogs" :key="s.telegram_id">
                        <button type="button" @click="toggleStaff(s.telegram_id)"
                           class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50">
                           <span class="flex items-center gap-2 min-w-0">
                              <span class="text-gray-400 text-xs w-3 shrink-0">{{ expandedStaff.has(s.telegram_id) ? '▾' : '▸' }}</span>
                              <span class="text-sm font-semibold text-gray-900 truncate">
                                 {{ s.name || s.username || ('ID ' + s.telegram_id) }}
                              </span>
                              <span v-if="scope === 'all'" class="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                 :class="s.role === 'ellikboshi' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'">
                                 {{ s.role === 'ellikboshi' ? 'Ellikboshi' : 'Xodim' }}
                              </span>
                           </span>
                           <span class="text-xs text-gray-400 shrink-0">{{ s.entries.length }} ta murojaat</span>
                        </button>
                        <div v-if="expandedStaff.has(s.telegram_id)" class="px-4 pb-3 pt-1 space-y-3 bg-gray-50/50">
                           <div v-for="(e, i) in s.entries" :key="i"
                              class="border-l-2 pl-3"
                              :class="e.parent_request_id && !e.reopen_dismissed ? 'border-amber-200' : 'border-gray-200'">
                              <p class="text-sm text-gray-900">
                                 <span v-if="e.parent_request_id && !e.reopen_dismissed" class="text-amber-600 font-medium">🔁 Takroriy so'rov · </span>
                                 {{ e.text || '—' }}
                              </p>
                              <!-- WHERE it came from. The controller was not in that
                                   chat, so a request text on its own is unreadable. -->
                              <p class="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                                 <span class="font-medium text-gray-600">{{ e.group_label }}</span>
                                 <span v-if="e.city">· {{ cityLabel(e.city) }}</span>
                                 <span v-if="e.room_no">· {{ e.room_no }}-xona</span>
                                 <span v-if="e.pilgrim_username">· {{ e.pilgrim_username }}</span>
                              </p>
                              <p class="text-xs mt-0.5" :class="e.sum.tone">
                                 {{ e.sum.text }}
                                 <a v-if="e.message_link" :href="e.message_link" target="_blank"
                                    class="text-amber-600 hover:underline ml-1 whitespace-nowrap">Xabarni ko'rish</a>
                                 <button v-if="e.parent_request_id && !e.reopen_dismissed"
                                    @click="dismissReopen(e.id)"
                                    class="text-gray-400 hover:text-gray-700 hover:underline ml-2 whitespace-nowrap"
                                    title="Bu aslida takror emas — noto'g'ri aniqlangan qayta so'rovni bekor qiladi (asl murojaat yana «bajarildi» bo'ladi)">
                                    Takror emas
                                 </button>
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <!-- The jurnal is built from the last `reqLimit` murojaat, so say so
                       rather than let a truncated list read as the whole period. -->
                  <div v-if="requestsTruncated"
                     class="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                     <span>
                        Faqat oxirgi {{ requests.length }} ta murojaat ko'rsatilmoqda —
                        yuqoridagi jadval esa butun davrni sanaydi.
                     </span>
                     <button v-if="reqLimit < MAX_REQ_LIMIT" @click="loadMoreRequests"
                        class="px-3 py-1 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
                        Ko'proq yuklash
                     </button>
                  </div>
               </div>
            </div>

            <!-- tuning — ADMIN ONLY: these fields decide who turns red, and the toggle
                 can stop the recording entirely, so the nazoratchi does not get them
                 (the API enforces it too; this only avoids showing a button that 403s) -->
            <div v-if="isAdmin" class="bg-white rounded-2xl border border-gray-200 p-5 animate-fade-up">
               <h3 class="text-base font-semibold text-gray-900 mb-1">Sozlamalar</h3>
               <p class="text-xs text-gray-500 mb-4">
                  Bir xil so'rov qayta kelganda: xodim uchun oyna tugagach — yangi so'rov;
                  ellikboshi uchun 0 = hech qachon tugamaydi (doim hal qilinmagan deb sanaladi).
               </p>
               <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">Xodim oynasi (soat)</label>
                     <input v-model.number="form.staff_repeat_window_hours" type="number" min="0"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">Ellikboshi oynasi (soat, 0 = cheksiz)</label>
                     <input v-model.number="form.ellikboshi_repeat_window_hours" type="number" min="0"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">IT guruh ID</label>
                     <input v-model.number="form.it_group_id" type="number"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                     <label class="block text-xs font-medium text-gray-500 mb-1.5">IT mavzu (topic) ID</label>
                     <input v-model.number="form.it_topic_id" type="number"
                        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
               </div>
               <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <button @click="form.is_enabled = !form.is_enabled"
                     class="flex items-center gap-2 text-sm font-medium transition-colors"
                     :class="form.is_enabled ? 'text-emerald-600' : 'text-gray-400'">
                     <font-awesome-icon :icon="form.is_enabled ? 'toggle-on' : 'toggle-off'" class="w-5 h-5" />
                     {{ form.is_enabled ? 'Nazorat yoqilgan' : 'Nazorat o\'chirilgan' }}
                  </button>
                  <button @click="save" :disabled="saving"
                     class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
                     {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
                  </button>
               </div>
               <p v-if="savedMsg" class="text-xs text-emerald-600 mt-2">{{ savedMsg }}</p>
            </div>
         </template>
      </div>
   </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
   Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
   Tooltip, Legend, Filler, type ChartOptions, type Plugin,
} from 'chart.js'
import AppLayout from '../components/AppLayout.vue'
import api from '../../../api'
import { useAuthStore } from '../../../stores/auth'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface Report {
   // per NEED
   requests: number; unassigned: number
   // per RECIPIENT ROW (one per worker the need was DM'd to)
   dms: number; delivered: number; undelivered: number
   accepted: number; never_accepted: number; completed: number; re_requests: number
   reopened: number; avg_response_seconds: number | null
   flagged: number; bot_mistakes: number; flags_neutral: number; flags_pending: number
   error_kinds: Record<string, number>
}
interface Worker {
   telegram_id: number; username: string | null; name: string | null; role: string
   dms: number; undelivered: number; accepted: number; never_accepted: number
   completed: number; re_requests: number; reopened: number; released: number
   flagged: number; flags_confirmed: number; flags_neutral: number
   avg_response_seconds: number | null
   // Where this person actually worked, from the needs themselves — "7 murojaat" reads
   // very differently across nine groups than inside one.
   cities: string[]; group_count: number
   // Their JOB from the staff table (ishchi_guruh / doctor / airport), NOT the
   // control-system role. A doctor only ever receives health needs.
   staff_role: string | null
}
interface GroupOption { chat_id: number; title: string | null; cities: string[] }
// `location` is null for an ellikboshi — a leader belongs to a group, not a city.
interface StaffReady { role: string; location: string | null; username: string | null; name: string | null }

// Xatolik taxonomy labels — codes mirror server IT_ERROR_KINDS (bot/services/control.py).
const KIND_LABELS: Record<string, string> = {
   wp: "Noto'g'ri shaxs",
   nr: "So'rov emas",
   wl: "Noto'g'ri shahar/xona",
   wa: "Javob noto'g'ri",
   unlabeled: 'Turi belgilanmagan',
}

const PERIODS = [
   { value: 'day', label: 'Kunlik' },
   { value: 'week', label: 'Haftalik' },
   { value: 'month', label: 'Oylik' },
]

// The four colour buckets spelled out once, in words an ordinary reader can act on.
// 🟡 and 🔴 used to be called "Qayta so'rov" and "Qayta so'ralgan", which are the same
// two words in the same order — nobody could tell them apart, and they are opposites:
// one is credit for handling a follow-up, the other is blame for a false "done".
const LEGEND = [
   { dot: '🟢', label: 'Bajarildi', tone: 'text-emerald-600',
     text: "qabul qildi, ziyoratchi qayta so'ramadi" },
   { dot: '🟡', label: "Takroriy so'rov", tone: 'text-amber-600',
     text: "ziyoratchi ilgari ham so'ragan edi — shu odam ikkinchi so'rovni qabul qildi" },
   { dot: '🔴', label: 'Bajarilmagan', tone: 'text-red-600',
     text: "qabul qilgan, LEKIN ziyoratchi qayta so'radi — aslida hal qilinmagan" },
   { dot: '🔵', label: 'Javobsiz', tone: 'text-blue-600',
     text: 'kartochka yetib bordi, lekin umuman qabul qilinmadi' },
]

const CITY_LABELS: Record<string, string> = { makka: 'Makka', madina: 'Madina' }
function cityLabel(c: string | null): string {
   return c ? (CITY_LABELS[c] || c) : ''
}

const period = ref('day')
const loading = ref(false)
const saving = ref(false)
const savedMsg = ref('')
const showRequests = ref(true)
const report = ref<Report | null>(null)
const workers = ref<Worker[]>([])
const timeseries = ref<{ period: string; completed: number; re_requests: number; reopened: number; never_accepted: number }[]>([])
const filterRole = ref('')          // '' = all, else 'staff' | 'ellikboshi'
const filterName = ref('')          // matches name OR username (case-insensitive)
// Slice filters — sent to the SERVER, so every number on the page moves together.
const filterGroup = ref('')         // '' = all groups, else the chat_id as a string
const filterCity = ref('')          // '' = both, else 'makka' | 'madina'
const groupOptions = ref<GroupOption[]>([])
const requests = ref<any[]>([])
const staffReadiness = ref<StaffReady[]>([])
const loadError = ref(false)

// Which population this LOGIN may see: 'staff' | 'ellikboshi' | 'all'. Comes from the
// API (the token decides it), never from a dropdown — a scoped controller cannot widen
// their own view, and the page must not label itself as something it is not. Until the
// first load answers, assume the narrowest honest thing: nothing role-specific.
const scope = ref<'staff' | 'ellikboshi' | 'all'>('all')
const isStaffScope = computed(() => scope.value === 'staff')
const isLeaderScope = computed(() => scope.value === 'ellikboshi')

/** "Xodim" / "Ellikboshi" — the word for one person in this account's population. */
const personWord = computed(() => (isLeaderScope.value ? 'Ellikboshi' : 'Xodim'))
const personWordLower = computed(() => personWord.value.toLowerCase())

const scopeTitle = computed(() =>
   isStaffScope.value ? 'Nazorat — Xodimlar'
      : isLeaderScope.value ? 'Nazorat — Ellikboshilar'
         : 'Nazorat',
)
const scopeSubtitle = computed(() =>
   isStaffScope.value
      ? "Ishchi guruh murojaatlarni qanday bajarayotgani — dalillar bilan"
      : isLeaderScope.value
         ? "Ellikboshilar murojaatlarni qanday bajarayotgani — dalillar bilan"
         : "Xodimlar va ellikboshilar murojaatlarni qanday bajarayotgani — dalillar bilan",
)

/** Group name for the filter dropdown; falls back to the raw id when a group has no
 *  title saved (never show an empty option — an unnamed group is still a real one). */
function groupLabel(g: { chat_id: number; title: string | null; cities?: string[] }): string {
   const name = g.title || `Guruh ${g.chat_id}`
   const cities = (g.cities || []).map(cityLabel).filter(Boolean)
   return cities.length ? `${name} · ${cities.join(', ')}` : name
}

/** The Guruh dropdown. Two groups CAN carry the same Telegram title, and two identical
 *  options would leave the reader unable to tell which slice they picked — so a repeated
 *  label falls back to the chat id, which is always unique. */
const groupChoices = computed(() => {
   const seen = new Map<string, number>()
   for (const g of groupOptions.value) {
      const l = groupLabel(g)
      seen.set(l, (seen.get(l) || 0) + 1)
   }
   return groupOptions.value.map((g) => {
      const l = groupLabel(g)
      return { chat_id: g.chat_id, label: (seen.get(l) || 0) > 1 ? `${l} · ${g.chat_id}` : l }
   })
})

// staff.role -> a job an ordinary reader recognises. The job is WHY two people's
// numbers differ: the doctor is deliberately kept out of the whole-crew tag and only
// receives health needs, the airport contact only airport ones.
const JOB_LABELS: Record<string, string> = {
   ishchi_guruh: 'Ishchi guruh',
   doctor: 'Shifokor',
   airport: 'Aeroport',
}
function jobLabel(w: Worker): string {
   if (w.role === 'ellikboshi') return 'Ellikboshi'
   const j = w.staff_role
   return j ? (JOB_LABELS[j] || j) : 'Xodim'
}

/** Cards that left this person's accountability: never arrived, a colleague claimed it
 *  first, or they marked it a bot error. In none of the four colour buckets — so without
 *  this the row's own numbers do not add up to its "Murojaatlar". */
function uncounted(w: Worker): number {
   return (w.undelivered || 0) + (w.released || 0) + (w.flagged || 0)
}
function uncountedHint(w: Worker): string {
   return `Yetib bormadi: ${w.undelivered || 0} · Boshqa xodim oldi: ${w.released || 0}`
      + ` · «Xatolik» deb belgilangan: ${w.flagged || 0}`
}

/** Who the bot actually FAILED to reach this period. `staff-readiness` only predicts
 *  this (and misses anyone whose staff row carries a telegram_id they never activated
 *  by pressing Start); an undelivered card is the proof it really happened. */
const undeliveredPeople = computed(() =>
   workers.value.filter((w) => w.undelivered > 0)
      .map((w) => `${personLabel(w)} (${w.undelivered})`),
)

/** "Makka · 3 guruh" — where a worker's needs came from this period. */
function whereLabel(w: Worker): string {
   const cities = (w.cities || []).map(cityLabel).filter(Boolean).join(', ')
   const groups = w.group_count ? `${w.group_count} guruh` : ''
   return [cities, groups].filter(Boolean).join(' · ') || '—'
}

// Drill-down paging. The per-staff jurnal is built from these rows, so a silent cap
// would make a truncated log look like the worker's whole period.
const REQ_PAGE = 200
const MAX_REQ_LIMIT = 500          // the API's own ceiling
const reqLimit = ref(REQ_PAGE)
const requestsTruncated = computed(() => requests.value.length >= reqLimit.value)

// Only the admin may tune the control system (the API enforces it; this hides the form).
const auth = useAuthStore()
const isAdmin = computed(() => !auth.role || auth.role === 'admin')

const form = ref({
   staff_repeat_window_hours: 6,
   ellikboshi_repeat_window_hours: 0,
   it_group_id: null as number | null,
   it_topic_id: null as number | null,
   is_enabled: true,
})

/** Seconds -> a short Uzbek duration ("2 soat 5 daq"). null when never measured. */
function dur(s: number | null): string {
   if (s === null || s === undefined) return '—'
   if (s < 60) return `${Math.round(s)} soniya`
   const m = Math.floor(s / 60)
   if (m < 60) return `${m} daq`
   const h = Math.floor(m / 60)
   const rem = m % 60
   return rem ? `${h} soat ${rem} daq` : `${h} soat`
}

function fmtTime(iso: string | null): string {
   if (!iso) return '—'
   return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

/** Counted per NEED (one pilgrim request = 1), whatever the crew size. */
const needCards = computed(() => {
   const r = report.value
   if (!r) return []
   return [
      {
         label: 'Murojaatlar', value: r.requests, tone: 'text-gray-900',
         hint: `${r.delivered} ta ${personWordLower.value} kartochkasi yetib bordi`,
      },
      { label: 'O\'rtacha javob vaqti', value: dur(r.avg_response_seconds), tone: 'text-gray-900' },
      {
         label: 'Bot xatosi (tasdiqlangan)', value: r.bot_mistakes, tone: 'text-indigo-600',
         hint: r.flags_pending ? `${r.flags_pending} ta kutilmoqda` : '',
      },
      {
         label: 'Asossiz «Xatolik»', value: r.flags_neutral,
         tone: r.flags_neutral ? 'text-red-600' : 'text-gray-900',
         hint: 'IT neytral deb topgan',
      },
   ]
})

/** Counted per WORKER: a need sent to the whole crew yields one row per member, so
 *  these deliberately do NOT sum to "Murojaatlar" — they are rendered under their own
 *  heading for exactly that reason. */
const workerCards = computed(() => {
   const r = report.value
   if (!r) return []
   return [
      {
         label: '🟢 Bajarildi', value: r.completed, tone: 'text-emerald-600',
         hint: 'Qabul qilindi, ziyoratchi qayta so\'ramadi',
      },
      {
         label: '🟡 Takroriy so\'rov', value: r.re_requests,
         tone: r.re_requests ? 'text-amber-600' : 'text-gray-900',
         hint: 'Ikkinchi so\'rovni qabul qilgan',
      },
      {
         label: '🔴 Bajarilmagan', value: r.reopened, tone: r.reopened ? 'text-red-600' : 'text-gray-900',
         hint: 'Qabul qilgan, lekin ziyoratchi qayta so\'ragan',
      },
      {
         label: '🔵 Javobsiz qolgan', value: r.never_accepted,
         tone: r.never_accepted ? 'text-blue-600' : 'text-gray-900',
         hint: 'Yetib borgan, lekin qabul qilinmagan',
      },
   ]
})

// The trend line — the same four colour buckets as the cards, but over time. Colours
// mirror the card tones: 🟢 completed, 🟡 re_requests, 🔴 reopened, 🔵 never_accepted.
const TREND_SERIES = [
   { key: 'completed', label: 'Bajarildi', color: '#10b981' },
   { key: 're_requests', label: "Takroriy so'rov", color: '#f59e0b' },
   { key: 'reopened', label: 'Bajarilmagan', color: '#ef4444' },
   { key: 'never_accepted', label: 'Javobsiz', color: '#3b82f6' },
] as const

/** X-axis labels: hour for the day period, else day/month. Rendered in SAUDI time
 *  (Asia/Riyadh) because that is how the server groups them — the crew and the pilgrims
 *  are there, so an evening in Makka must not straddle two labels for a viewer in
 *  Tashkent. */
const SAUDI_TZ = 'Asia/Riyadh'
const trendLabels = computed(() =>
   timeseries.value.map((t) => {
      const d = new Date(t.period)
      return period.value === 'day'
         ? d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit', timeZone: SAUDI_TZ })
         : d.toLocaleDateString('uz', { day: '2-digit', month: '2-digit', timeZone: SAUDI_TZ })
   }),
)

const trendData = computed(() => ({
   labels: trendLabels.value,
   datasets: TREND_SERIES.map((s) => ({
      label: s.label,
      data: timeseries.value.map((t) => t[s.key] ?? 0),
      borderColor: s.color,
      backgroundColor: s.color,
      pointBackgroundColor: s.color,
      pointBorderWidth: 0,
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 3,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.4,
      fill: false,
      borderCapStyle: 'round' as CanvasLineCap,
      borderJoinStyle: 'round' as CanvasLineJoin,
   })),
}))

const trendOptions: ChartOptions<'line'> = {
   responsive: true,
   maintainAspectRatio: false,
   layout: { padding: { top: 4, right: 6 } },
   interaction: { mode: 'index', intersect: false, axis: 'x' },
   plugins: {
      legend: {
         position: 'top',
         align: 'end',
         labels: {
            usePointStyle: true, pointStyle: 'circle',
            boxWidth: 7, boxHeight: 7, padding: 16,
            color: '#6b7280', font: { size: 11, weight: 500 },
         },
      },
      tooltip: {
         backgroundColor: 'rgba(17, 24, 39, 0.96)',
         padding: 12, cornerRadius: 12,
         titleColor: '#9ca3af', titleFont: { size: 11, weight: 600 },
         bodyColor: '#f9fafb', bodyFont: { size: 12, weight: 500 },
         bodySpacing: 6, boxPadding: 6, usePointStyle: true,
         caretSize: 6, caretPadding: 10,
         borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1,
      },
   },
   scales: {
      x: {
         grid: { display: false },
         border: { display: false },
         ticks: { color: '#9ca3af', font: { size: 11 }, padding: 8 },
      },
      y: {
         beginAtZero: true, grace: '25%',
         border: { display: false },
         grid: { color: 'rgba(17, 24, 39, 0.05)' },
         ticks: { color: '#9ca3af', font: { size: 11 }, padding: 10, stepSize: 1, precision: 0 },
      },
   },
}

// A soft dashed vertical guide at the hovered point — pairs with the index tooltip so all
// four series read at the same moment (a small touch that lifts the chart out of the
// chart.js defaults). Drawn under the points, over the lines.
const crosshairPlugin: Plugin<'line'> = {
   id: 'nazoratCrosshair',
   afterDatasetsDraw(chart) {
      const first = chart.getActiveElements()[0]
      if (!first) return
      const x = (first.element as PointElement).x
      const { ctx, chartArea } = chart
      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.16)'
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
      ctx.restore()
   },
}

/** Display label for a worker/recipient — the DASHBOARD name if entered, else @username. */
function personLabel(p: { name?: string | null; username?: string | null; telegram_id: number }): string {
   return p.name || p.username || ('ID ' + p.telegram_id)
}

/** Distinct worker labels for the "filter by name" dropdown. */
const workerNameOptions = computed(() =>
   [...new Set(workers.value.map(personLabel))].sort((a, b) => a.localeCompare(b)),
)

/** Workers filtered by the lavozim (role) dropdown and the chosen name. */
const filteredWorkers = computed(() =>
   workers.value.filter((w) => {
      if (filterRole.value && w.role !== filterRole.value) return false
      if (filterName.value && personLabel(w) !== filterName.value) return false
      return true
   }),
)

/** Human duration between two timestamps; if `toIso` is null, measures up to NOW (still open). */
function durBetween(fromIso: string | null, toIso: string | null): string {
   if (!fromIso) return '—'
   const to = toIso ? new Date(toIso).getTime() : Date.now()
   return dur(Math.max(0, Math.round((to - new Date(fromIso).getTime()) / 1000)))
}

/** One request turned into a plain Uzbek sentence an ordinary reader understands, plus a
 *  colour tone. Accept is terminal (no solve step): once a worker takes a need it counts
 *  as done (🟢 bajarildi) UNTIL the pilgrim asks again, which turns it 🔴 hal bo'lmagan.
 *  Covers every state: not-delivered, Xatolik, taken-by-another, 🔵 javobsiz,
 *  🟢 completed, 🟡 accepted-re-request, 🔴 reopened. */
function entrySummary(e: any): { text: string; tone: string } {
   const sent = fmtTime(e.dm_sent_at)
   // "Xodim" / "Ellikboshi" — the same sentence, addressed to whoever this account
   // actually watches, so a leaders' controller never reads about "xodimlar".
   const who = personWord.value
   if (!e.delivered)
      return { text: `${who}ga yetib bormadi.`, tone: 'text-gray-400' }
   if (e.flagged_at)
      return {
         text: `${sent} da yuborildi. ${who} «Xatolik» deb belgiladi`
            + (e.it_verdict ? ` (IT: ${e.it_verdict}).` : " (IT hali ko'rmagan)."),
         tone: 'text-indigo-600',
      }
   if (e.released_at) {
      const c = e.claimed_by
      const verb = c && c.flagged ? '«Xatolik» deb belgiladi' : 'qabul qildi'
      return {
         text: `${sent} da yuborildi. Boshqa ${personWordLower.value} ${verb}${c ? ` (${c.name})` : ''}.`,
         tone: 'text-gray-400',
      }
   }
   if (!e.accepted_at)   // 🔵 delivered but never taken
      return {
         text: `${sent} da yuborildi. ${who} hali qabul qilmadi (javobsiz: ${durBetween(e.dm_sent_at, null)}).`,
         tone: 'text-blue-600',
      }
   const acc = fmtTime(e.accepted_at)
   const wait = durBetween(e.dm_sent_at, e.accepted_at)
   if (e.reopened_count > 0)   // 🔴 accepted, but the pilgrim came back -> false completion
      return {
         text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}), LEKIN ziyoratchi qayta so'radi — bajarilmagan.`,
         tone: 'text-red-600',
      }
   if (e.parent_request_id && !e.reopen_dismissed)   // 🟡 accepted follow-up (already a repeat)
      return {
         text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}) — takroriy so'rov, bajarildi.`,
         tone: 'text-amber-600',
      }
   return {   // 🟢 clean single-pass completion
      text: `${sent} da yuborildi. ${who} ${acc} da qabul qildi (${wait}) — bajarildi.`,
      tone: 'text-emerald-600',
   }
}

/** Per-STAFF activity log: every request each worker was DM'd about, newest first, each
 *  turned into a plain sentence. Honours the lavozim + name filters; busiest worker first. */
const staffLogs = computed(() => {
   const nameById = new Map(workers.value.map((w) => [w.telegram_id, w.name]))
   const map = new Map<number, any>()
   for (const r of requests.value) {
      for (const rec of r.recipients) {
         let s = map.get(rec.telegram_id)
         if (!s) {
            s = {
               telegram_id: rec.telegram_id, username: rec.username,
               name: nameById.get(rec.telegram_id) ?? null, role: rec.role, entries: [] as any[],
            }
            map.set(rec.telegram_id, s)
         }
         // For a released row, name the colleague who actually took (or flagged) the need.
         const sib = r.recipients.find((o: any) =>
            o.telegram_id !== rec.telegram_id && (o.accepted_at || o.flagged_at))
         s.entries.push({
            id: r.id, text: r.text, parent_request_id: r.parent_request_id,
            reopen_dismissed: r.reopen_dismissed, message_link: r.message_link,
            // Context the reader needs to make sense of the text at all.
            group_label: r.group_title || `Guruh ${r.chat_id}`,
            city: r.location, room_no: r.room_no, pilgrim_username: r.pilgrim_username,
            created_at: r.created_at, delivered: rec.delivered, it_verdict: rec.it_verdict,
            dm_sent_at: rec.dm_sent_at, accepted_at: rec.accepted_at,
            flagged_at: rec.flagged_at, released_at: rec.released_at, reopened_count: rec.reopened_count,
            claimed_by: sib
               ? { name: nameById.get(sib.telegram_id) || sib.username || ('ID ' + sib.telegram_id),
                   flagged: !sib.accepted_at && !!sib.flagged_at }
               : null,
         })
      }
   }
   return [...map.values()]
      .map((s) => {
         s.entries.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         s.entries = s.entries.map((e: any) => ({ ...e, sum: entrySummary(e) }))
         return s
      })
      .filter((s) => !filterRole.value || s.role === filterRole.value)
      .filter((s) => !filterName.value || personLabel(s) === filterName.value)
      .sort((a, b) => b.entries.length - a.entries.length)
})

/** Accordion: which staff rows are expanded to show their log. */
const expandedStaff = ref<Set<number>>(new Set())
function toggleStaff(id: number) {
   const s = new Set(expandedStaff.value)
   s.has(id) ? s.delete(id) : s.add(id)
   expandedStaff.value = s
}

function setPeriod(p: string) {
   period.value = p
   load()
}

/** The chosen slice as a query string — appended to every read so the whole page always
 *  describes the same group / city. */
const sliceQuery = computed(() => {
   const parts = [`period=${period.value}`]
   if (filterGroup.value) parts.push(`chat_id=${encodeURIComponent(filterGroup.value)}`)
   if (filterCity.value) parts.push(`city=${encodeURIComponent(filterCity.value)}`)
   return parts.join('&')
})

function clearSlice() {
   filterGroup.value = ''
   filterCity.value = ''
   load()
}

async function load() {
   loading.value = true
   loadError.value = false
   try {
      const q = sliceQuery.value
      const [rep, wrk, ts, reqs, sr, st, sc, grp] = await Promise.all([
         api.get(`/control/report?${q}`),
         api.get(`/control/workers?${q}`),
         api.get(`/control/timeseries?${q}`),
         api.get(`/control/requests?${q}&limit=${reqLimit.value}`),
         api.get('/control/staff-readiness'),
         api.get('/control/settings'),
         api.get('/control/scope'),
         // Deliberately NOT sliced: the group list must keep offering the other groups,
         // otherwise picking one would leave you unable to pick a different one.
         api.get(`/control/groups?period=${period.value}`),
      ])
      report.value = rep.data
      workers.value = wrk.data
      timeseries.value = ts.data
      requests.value = reqs.data
      staffReadiness.value = sr.data
      scope.value = sc.data?.scope || 'all'
      groupOptions.value = grp.data
      form.value = {
         staff_repeat_window_hours: st.data.staff_repeat_window_hours,
         ellikboshi_repeat_window_hours: st.data.ellikboshi_repeat_window_hours,
         it_group_id: st.data.it_group_id,
         it_topic_id: st.data.it_topic_id,
         is_enabled: st.data.is_enabled,
      }
   } catch {
      // Surfaced, not swallowed: an empty page that means "the request failed" reads
      // exactly like one that means "nothing happened this period" — and on an evidence
      // panel those two are opposites.
      loadError.value = true
      report.value = null
      workers.value = []
      timeseries.value = []
      requests.value = []
      staffReadiness.value = []
      groupOptions.value = []
   } finally {
      loading.value = false
   }
}

/** The drill-down is capped; pull the next page when the office needs more of it. */
function loadMoreRequests() {
   reqLimit.value = Math.min(MAX_REQ_LIMIT, reqLimit.value + REQ_PAGE)
   load()
}

/** Feature #1 — the confirmed-mistake breakdown as [{label, count}], biggest first. */
const errorKinds = computed(() => {
   const e = report.value?.error_kinds
   if (!e) return [] as { label: string; count: number }[]
   return Object.entries(e)
      .map(([code, count]) => ({ label: KIND_LABELS[code] || code, count }))
      .sort((a, b) => b.count - a.count)
})

/** Feature #6 — dismiss a falsely auto-detected repeat, then refresh the evidence. */
async function dismissReopen(id: number) {
   try {
      await api.post(`/control/requests/${id}/dismiss-reopen`)
      await load()
   } catch { /* ignore — the row just stays as-is */ }
}

async function save() {
   saving.value = true
   savedMsg.value = ''
   try {
      await api.put('/control/settings', form.value)
      savedMsg.value = 'Saqlandi'
      setTimeout(() => (savedMsg.value = ''), 2500)
   } catch {
      savedMsg.value = 'Saqlashda xatolik'
   } finally {
      saving.value = false
   }
}

onMounted(load)
</script>

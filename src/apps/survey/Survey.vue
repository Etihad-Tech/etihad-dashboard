<template>
   <div class="sn-app">
      <!-- ETIHAD green/gold — deliberately NOT the dashboard chrome: the owner wants
           this to read as its own tool, for its own login. -->
      <header class="sn-top">
         <div class="sn-brand">
            <span class="sn-brand-mark">ETIHAD</span>
            <span class="sn-brand-name">Sifat nazorati</span>
         </div>
         <span class="sn-brand-sub">Qaytgan ziyoratchilar so'rovnomasi</span>
         <div class="sn-topright">
            <span v-if="doneToday" class="sn-topstat"><Icon name="check" :size="14" /> {{ doneToday }} ta saqlangan</span>
            <button type="button" class="sn-topbtn" @click="logout">Chiqish</button>
         </div>
      </header>

      <div class="sn-body" :class="{ 'has-current': !!current }">
         <!-- ─────────── LEFT: groups → one group's pilgrims ─────────── -->
         <!-- The way in is the GROUP (owner, 2026-08-18): pick it, its list fills from
              the CRM, call down the list. Two screens in one column instead of an
              accordion — the open group gets the whole height for its people. -->
         <aside class="sn-side">
            <div class="sn-search">
               <Icon name="search" :size="15" />
               <input v-model="search" :placeholder="openGroupObj ? 'Ism yoki telefon' : 'Guruh, ism yoki telefon'" />
               <button v-if="search" type="button" class="sn-iconbtn" title="Tozalash" @click="search = ''">
                  <Icon name="x" :size="14" />
               </button>
            </div>

            <!-- Level 1: the groups, recently returned first. -->
            <template v-if="!openGroupObj">
               <div class="sn-side-head">
                  <span class="sn-eyebrow">Guruhlar</span>
                  <span class="sn-side-count">{{ filteredGroups.length }}</span>
               </div>
               <div class="sn-scroll">
                  <!-- A pilgrim found by name or number opens straight away — the
                       search must not stop at «it is in that group somewhere». -->
                  <template v-if="searchHits.length">
                     <div class="sn-subhead">Ziyoratchilar</div>
                     <button v-for="p in searchHits" :key="'h' + p.id" type="button" class="sn-hit"
                        @click="openFromSearch(p)">
                        <span class="sn-dot" :class="dotClass(p)"></span>
                        <span class="sn-hit-main">
                           <b>{{ p.full_name }}</b>
                           <small>{{ p.group_title || '—' }}</small>
                        </span>
                     </button>
                     <div class="sn-subhead">Guruhlar</div>
                  </template>

                  <button v-for="g in filteredGroups" :key="g.chat_id" type="button" class="sn-gcard"
                     @click="openGroupView(g.chat_id)">
                     <span class="sn-gcard-top">
                        <b class="sn-gtitle">{{ g.title || g.chat_id }}</b>
                        <Icon name="chevron" :size="15" class="sn-chev" />
                     </span>
                     <span class="sn-gmeta">
                        {{ tripRange(g) }}<template v-if="g.ellikboshi_username"> · {{ g.ellikboshi_username }}</template>
                     </span>
                     <!-- Coverage, not a raw count: §10.3 drops a group's surveys from
                          the ball entirely under 50%, so the bar shows the line too. -->
                     <span class="sn-cover" :class="{ ok: coverPct(g) >= 50 }">
                        <span class="sn-cover-bar"><i :style="{ width: coverPct(g) + '%' }"></i><em></em></span>
                        <span class="sn-cover-num">{{ g.surveyed_count || 0 }}/{{ g.pilgrim_count || 0 }}</span>
                     </span>
                  </button>
                  <p v-if="!filteredGroups.length" class="sn-empty-note">Guruh topilmadi.</p>
               </div>
            </template>

            <!-- Level 2: one group — where its list stands, the way to add, and its people. -->
            <template v-else>
               <div class="sn-ghead">
                  <button type="button" class="sn-back" @click="closeGroupView">
                     <Icon name="back" :size="16" /> Guruhlar
                  </button>
                  <h2 class="sn-ghead-title">{{ openGroupObj.title || openGroupObj.chat_id }}</h2>
                  <div class="sn-gmeta">
                     {{ tripRange(openGroupObj) }}<template v-if="openGroupObj.ellikboshi_username"> · {{ openGroupObj.ellikboshi_username }}</template>
                  </div>
                  <div class="sn-cover sn-cover-lg" :class="{ ok: coverPct(openGroupObj) >= 50 }">
                     <span class="sn-cover-bar"><i :style="{ width: coverPct(openGroupObj) + '%' }"></i><em></em></span>
                     <span class="sn-cover-num">{{ openGroupObj.surveyed_count || 0 }}/{{ openGroupObj.pilgrim_count || 0 }} · {{ coverPct(openGroupObj) }}%</span>
                  </div>
                  <!-- The list fills itself from the CRM every time the group is
                       opened (owner, 2026-10-07); this line says where it stands. -->
                  <div v-if="crmStatus" class="sn-crm" :class="'st-' + crmStatus.tone">
                     <Icon :name="crmStatus.tone === 'busy' ? 'sync' : crmStatus.tone === 'ok' ? 'check' : 'alert'"
                        :size="13" :class="{ 'sn-spin': crmStatus.tone === 'busy' }" />
                     <span>{{ crmStatus.text }}</span>
                  </div>
                  <div class="sn-gtools">
                     <button type="button" class="sn-btn sn-btn-soft" @click="openImport">
                        <Icon name="plus" :size="14" /> Qo'shish
                     </button>
                     <!-- The whole list at once — the sheet went into the wrong group.
                          Saved surveys stay (server rule), and the toast says so. -->
                     <button v-if="deletableOf(openGroupObj.chat_id)" type="button" class="sn-btn sn-btn-quiet sn-danger-hover"
                        @click="clearGroup(openGroupObj)">Ro'yxatni tozalash</button>
                  </div>
               </div>

               <div class="sn-chips">
                  <button type="button" class="sn-chip" :class="{ on: !statusFilter }" @click="statusFilter = ''">
                     Hammasi <em>{{ groupAll.length }}</em>
                  </button>
                  <button v-for="(l, k) in CALL_LABELS" v-show="statusCounts[k]" :key="k" type="button" class="sn-chip"
                     :class="{ on: statusFilter === k }" @click="statusFilter = statusFilter === k ? '' : k">
                     {{ l }} <em>{{ statusCounts[k] }}</em>
                  </button>
               </div>

               <div class="sn-scroll">
                  <!-- A div, not a <button>: text inside a button cannot be swept with
                       the mouse, and a name or a number is picked straight off this
                       list (owner, 2026-09-08: «allow copy pasting»). Enter / Space
                       open; the ✕ is a sibling so its click does not open the row. -->
                  <div v-for="p in groupPilgrims" :key="p.id" class="sn-prow"
                     :class="{ on: current && current.id === p.id, saved: p.survey_status === 'saved' }">
                     <div class="sn-prow-main" role="button" tabindex="0" @click="open(p)"
                        @keydown.enter.prevent="open(p)" @keydown.space.prevent="open(p)">
                        <span class="sn-dot" :class="dotClass(p)"></span>
                        <span class="sn-prow-text">
                           <b>{{ p.full_name }}</b>
                           <small :class="{ 'sn-warn-text': !p.phone }">{{ p.phone ? '+' + p.phone : NO_PHONE }}</small>
                        </span>
                        <span class="sn-pstatus" :class="'cs-' + p.call_status">
                           {{ p.survey_status === 'saved' ? 'Saqlangan' : (CALL_LABELS[p.call_status] || p.call_status) }}
                        </span>
                     </div>
                     <button type="button" class="sn-iconbtn sn-prow-x" :disabled="p.survey_status === 'saved'"
                        :title="p.survey_status === 'saved' ? SAVED_NO_DELETE : 'Ro\'yxatdan o\'chirish'"
                        @click="removePilgrim(p)"><Icon name="x" :size="14" /></button>
                  </div>
                  <p v-if="!groupPilgrims.length" class="sn-empty-note">
                     {{ groupAll.length ? "Bu filtr bo'yicha hech kim yo'q." : EMPTY_GROUP }}
                  </p>
               </div>
            </template>
         </aside>

         <!-- ─────────── FORM ─────────── -->
         <main v-if="current" class="sn-main">
            <button type="button" class="sn-back sn-back-mobile" @click="current = null">
               <Icon name="back" :size="16" /> Ro'yxat
            </button>

            <!-- WHO is on the line: name, number, the trip it is about, and the call. -->
            <section class="sn-card sn-person">
               <div class="sn-person-top">
                  <div class="sn-person-name">
                     <!-- The imported name is a starting point, not a fact: the
                          specialist learns the truth on the call and fixes it here. -->
                     <h1 v-if="editingName === null" class="sn-editable" title="Ismni tuzatish" @click="startEditName()">
                        {{ current.full_name }}<Icon name="edit" :size="15" class="sn-pen" />
                     </h1>
                     <input v-else ref="nameInput" v-model="editingName" class="sn-h1input"
                        @keyup.enter="commitName" @keyup.esc="editingName = null" @blur="commitName" />
                     <div class="sn-copyrow">
                        <button type="button" class="sn-mini" title="Ismni nusxalash"
                           @click="copyText(current.full_name, 'Ism')"><Icon name="copy" :size="13" /> Ism</button>
                        <button v-if="current.phone" type="button" class="sn-mini" title="Ism va telefonni birga nusxalash"
                           @click="copyText(`${current.full_name} +${current.phone}`, 'Ism va telefon')">
                           <Icon name="copy" :size="13" /> Ism + telefon</button>
                     </div>
                  </div>
                  <!-- The number is what the specialist dials — biggest thing after the name. -->
                  <div class="sn-phone">
                     <template v-if="editingPhone === null">
                        <a v-if="current.phone" :href="'tel:+' + current.phone" class="sn-phone-link">
                           <Icon name="phone" :size="16" /> +{{ current.phone }}
                        </a>
                        <span v-else class="sn-phone-none">{{ NO_PHONE }}</span>
                        <button v-if="current.phone" type="button" class="sn-iconbtn" title="Raqamni nusxalash"
                           @click="copyText('+' + current.phone, 'Telefon')"><Icon name="copy" :size="15" /></button>
                        <button type="button" class="sn-iconbtn" title="Raqamni tuzatish" @click="startEditPhone()">
                           <Icon name="edit" :size="15" /></button>
                     </template>
                     <input v-else v-model="editingPhone" class="sn-input sn-phoneinput" placeholder="+998 …"
                        @keyup.enter="commitPhone" @keyup.esc="editingPhone = null" @blur="commitPhone" />
                  </div>
               </div>

               <dl class="sn-facts">
                  <div class="sn-fact sn-fact-wide">
                     <dt>Guruh</dt>
                     <dd>
                        <!-- A MOVE, not an assignment: there is no «— tanlang —» to take
                             the group away again. The full trip range in each label —
                             two groups can share a name, never a name AND its dates. -->
                        <select v-model="pickedGroup" class="sn-select" :disabled="isSaved" @change="assignGroup">
                           <option v-for="g in pickableGroups" :key="g.chat_id" :value="g.chat_id">
                              {{ g.title }}{{ g.trip_start_date ? ` · ${dmy(g.trip_start_date)} — ${g.trip_end_date ? dmy(g.trip_end_date) : '?'}` : '' }}
                           </option>
                        </select>
                        <!-- Narrowed to the day Bitrix says they left; always switchable
                             off, because a wrong hint must never hide the right group. -->
                        <button v-if="current.depart_hint && !showAllGroups" type="button" class="sn-link"
                           @click="showAllGroups = true">{{ dmy(current.depart_hint) }} kuni — {{ pickableGroups.length }} ta · hammasi</button>
                        <button v-else-if="current.depart_hint" type="button" class="sn-link"
                           @click="showAllGroups = false">faqat {{ dmy(current.depart_hint) }} kuni</button>
                     </dd>
                  </div>
                  <div class="sn-fact">
                     <dt>Safar</dt>
                     <dd>{{ groupInfo ? tripRange(groupInfo) : '—' }}</dd>
                  </div>
                  <div class="sn-fact">
                     <dt>Ellikboshi</dt>
                     <!-- Both names when the cities had different leaders; the ball is
                          keyed to the Makka one (server-side, save_survey), so it is marked. -->
                     <dd v-if="groupInfo && splitGroup">
                        {{ groupInfo.ellikboshi_username }} <small>Makka · ball shunga</small><br />
                        {{ groupInfo.ellikboshi_madina || '—' }} <small>Madina</small>
                     </dd>
                     <dd v-else>{{ groupInfo?.ellikboshi_username || '—' }}</dd>
                  </div>
                  <div class="sn-fact">
                     <dt>Sotuvchi</dt>
                     <!-- Who sold the booking, from the CRM with the pilgrim (owner, 2026-10-09). -->
                     <dd v-if="current.seller">{{ current.seller.name }}</dd>
                     <dd v-else class="sn-muted">CRMda ko'rsatilmagan</dd>
                  </div>
               </dl>

               <!-- The §6 call belongs 1–3 days AFTER the flight home. Amber, not red:
                    an unfinished trip is a «not yet», not a fault. -->
               <div v-if="notReturnedYet" class="sn-banner sn-banner-warn">
                  <Icon name="alert" :size="15" />
                  <span>Bu safar hali tugamagan ({{ groupInfo?.trip_end_date ? dmy(groupInfo.trip_end_date) : '' }}) — so'rovnoma qaytgandan keyin o'tkaziladi.</span>
               </div>

               <div class="sn-callrow">
                  <span class="sn-eyebrow">Qo'ng'iroq</span>
                  <div class="sn-seg">
                     <button v-for="(l, k) in CALL_LABELS" :key="k" type="button" :class="{ on: current.call_status === k, ['cs-' + k]: true }"
                        :disabled="isSaved && k !== 'boldi'" :aria-pressed="current.call_status === k"
                        @click="setStatus(k)">{{ l }}</button>
                  </div>
                  <button v-if="!isSaved" type="button" class="sn-link sn-link-danger sn-callrow-del"
                     @click="removePilgrim(current)">Ro'yxatdan o'chirish</button>
               </div>

               <div v-if="isSaved" class="sn-banner sn-banner-ok">
                  <Icon name="check" :size="15" />
                  <span>
                     So'rovnoma saqlangan —
                     <b>{{ savedScore === null ? "ellikboshi bahosiz (Q1 to'liq emas)" : savedScore + ' ball' }}</b>.
                     O'zgartirish faqat izoh bilan, alohida tartibda (§6.4).
                  </span>
                  <button v-if="nextPilgrim" type="button" class="sn-btn sn-btn-primary sn-banner-btn" @click="open(nextPilgrim)">
                     Keyingisi <Icon name="chevron" :size="14" />
                  </button>
               </div>
            </section>

            <!-- Every scored row is 0–10 + «—» (javob bermadi). Keys 1–9 and 0 = 10
                 score the highlighted row, «−» skips, Enter/↓ ↑ move on. -->
            <div class="sn-legend">
               <template v-if="scale === 10">
                  <span><kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd> = 10</span>
                  <span><kbd>−</kbd> javob bermadi</span>
                  <span><kbd>↑</kbd><kbd>↓</kbd> savollar</span>
                  <span class="sn-legend-low"><i></i> 0–{{ LOW_MAX_10 }} va «Yo'q» — sabab majburiy</span>
               </template>
               <span v-else>Bu so'rovnoma eski 1–5 shkalada boshlangan — shu shkalada davom etadi. 1–{{ LOW_MAX_5 }} va «Yo'q» — sabab majburiy.</span>
            </div>

            <section v-for="(b, bi) in BLOCKS" :key="b.key" class="sn-card sn-qcard">
               <header class="sn-qhead">
                  <span class="sn-qnum">{{ bi + 1 }}</span>
                  <h3 class="sn-qtitle">{{ b.title }}</h3>
                  <span class="sn-tag" :class="{ 'sn-tag-kpi': b.kpi }">{{ b.who }}</span>
               </header>

               <div v-for="r in b.rows.filter(showRow)" :key="r.k" :ref="(el) => setRowEl(r.k, el)" class="sn-row"
                  :class="{ focus: focusKey === r.k, low: needsReason(r.k) }" @click="focusKey = r.k">
                  <div class="sn-row-main">
                     <div class="sn-row-label">
                        {{ rowLabel(r) }}
                        <small v-if="rowHint(r)">{{ rowHint(r) }}</small>
                     </div>
                     <div class="sn-row-ctrl">
                        <div v-if="r.type === 'choice'" class="sn-strip sn-strip-choice" role="group" :aria-label="rowLabel(r)">
                           <button v-for="c in r.choices" :key="String(c.v)" type="button"
                              :class="answers[r.k] === c.v ? ['sel', choiceBand(c.v)] : []"
                              :aria-pressed="answers[r.k] === c.v" :disabled="isSaved" @click="setAns(r.k, c.v)">{{ c.l }}</button>
                        </div>
                        <!-- 1–5 only on a survey STARTED before the switch to 0–10. -->
                        <div v-else class="sn-strip" :class="{ 'sn-strip-10': !isFive(r) }" role="group" :aria-label="rowLabel(r)">
                           <button v-for="v in scaleValues(r)" :key="v" type="button"
                              :class="answers[r.k] === v ? ['sel', band(r, v)] : []"
                              :aria-pressed="answers[r.k] === v" :disabled="isSaved" @click="setAns(r.k, v)">{{ v }}</button>
                        </div>
                        <!-- «0» is an ANSWER (the harshest); only «—» skips, and a
                             skipped row is excluded from every mean. -->
                        <button type="button" class="sn-skip" :class="{ sel: answers[r.k] === null && touched.has(r.k) }"
                           :disabled="isSaved" title="Javob bermadi" @click="setAns(r.k, null)">—</button>
                     </div>
                  </div>
                  <!-- A low answer is saved only with its reason (owner, 2026-10-09). -->
                  <div v-if="needsReason(r.k)" class="sn-reason" :class="{ missing: !hasReason(r.k) }">
                     <label :for="'why-' + r.k">
                        {{ r.type === 'choice' ? "Nega «Yo'q»?" : 'Nega past baho?' }}
                        <span v-if="!isSaved" class="sn-req">majburiy</span>
                     </label>
                     <textarea :id="'why-' + r.k" :ref="(el) => setReasonEl(r.k, el)" v-model="reasons[r.k]" rows="2"
                        :disabled="isSaved" :placeholder="REASON_PLACEHOLDER"
                        @keydown.enter.exact.prevent="reasonDone(r.k)" @keydown.esc.prevent="reasonDone(r.k)"></textarea>
                  </div>
               </div>
            </section>

            <!-- A low answer to a question the form no longer asks (an old draft's
                 retired key) still needs its reason — the server's rule reads the
                 answers, not the form. -->
            <section v-if="orphanLow.length" class="sn-card sn-qcard">
               <header class="sn-qhead">
                  <span class="sn-qnum">!</span>
                  <h3 class="sn-qtitle">Eski savollardagi past baholar</h3>
               </header>
               <div v-for="k in orphanLow" :key="k" class="sn-row low">
                  <div class="sn-row-main"><div class="sn-row-label">{{ AFF_LABELS[k] || k }} — {{ answers[k] }}</div></div>
                  <div class="sn-reason" :class="{ missing: !hasReason(k) }">
                     <label :for="'why-' + k">Nega past baho? <span class="sn-req">majburiy</span></label>
                     <textarea :id="'why-' + k" :ref="(el) => setReasonEl(k, el)" v-model="reasons[k]" rows="2"
                        :disabled="isSaved" :placeholder="REASON_PLACEHOLDER"></textarea>
                  </div>
               </div>
            </section>

            <!-- Muammolar — §6: each pinned to a place, a responsible party and a
                 severity; only ellikboshi-attributed ones touch their ball. -->
            <section class="sn-card sn-qcard">
               <header class="sn-qhead">
                  <span class="sn-qnum">{{ BLOCKS.length + 1 }}</span>
                  <h3 class="sn-qtitle">Safar davomida qanday muammolar bo'ldi?</h3>
                  <span class="sn-tag">mas'ulga biriktiriladi</span>
               </header>
               <div v-for="(pr, i) in problems" :key="i" class="sn-prob">
                  <div class="sn-prob-grid">
                     <label>Joy
                        <select v-model="pr.joy" class="sn-select" :disabled="isSaved">
                           <option>Makka</option><option>Madina</option>
                           <option>Jidda</option><option>Toshkent</option>
                        </select></label>
                     <label>Mas'ul
                        <select v-model="pr.masul" class="sn-select" :disabled="isSaved">
                           <option value="ellikboshi">Ellikboshi{{ groupInfo ? ' — ' + groupInfo.ellikboshi_username : '' }}</option>
                           <option value="ishchi_guruh">Tashkiliy guruh</option>
                           <option value="shifokor">Shifokor</option>
                           <option value="otinoyi">Otinoyi</option>
                           <option value="hotel">Mehmonxona</option>
                           <option value="avia">Aviakompaniya</option>
                           <option value="tashkent">Toshkent jamoasi</option>
                           <option value="admin">Guruh admini</option>
                           <option value="none">Hech kim (tashqi sabab)</option>
                        </select></label>
                     <label>Jiddiylik
                        <select v-model="pr.jiddiylik" class="sn-select" :disabled="isSaved">
                           <option value="kichik">Kichik (−5)</option>
                           <option value="orta">O'rta (−10)</option>
                           <option value="jiddiy">Jiddiy (−15)</option>
                        </select></label>
                  </div>
                  <div class="sn-prob-text">
                     <input v-model="pr.text" :disabled="isSaved" placeholder="Muammo mohiyati" class="sn-input" />
                     <button v-if="!isSaved" type="button" class="sn-iconbtn sn-danger-hover" title="Muammoni o'chirish"
                        @click="problems.splice(i, 1)"><Icon name="trash" :size="15" /></button>
                  </div>
               </div>
               <button v-if="!isSaved" type="button" class="sn-btn sn-btn-soft"
                  @click="problems.push({ joy: 'Makka', masul: 'ellikboshi', jiddiylik: 'kichik', text: '' })">
                  <Icon name="plus" :size="14" /> Muammo qo'shish</button>
               <p v-else-if="!problems.length" class="sn-muted">Muammo yozilmagan.</p>
            </section>

            <section class="sn-card sn-qcard">
               <header class="sn-qhead">
                  <span class="sn-qnum">{{ BLOCKS.length + 2 }}</span>
                  <h3 class="sn-qtitle">Yanada yaxshi bo'lishimiz uchun nima kerak?</h3>
               </header>
               <textarea v-model="suggestion" :disabled="isSaved" class="sn-input" rows="3"
                  placeholder="Ziyoratchining taklifini o'z so'zlari bilan yozing."></textarea>
            </section>
            <section class="sn-card sn-qcard">
               <header class="sn-qhead">
                  <span class="sn-qnum">{{ BLOCKS.length + 3 }}</span>
                  <h3 class="sn-qtitle">Bizni tanlashingizga nima sabab bo'ldi?</h3>
                  <span class="sn-tag">marketing · baholanmaydi</span>
               </header>
               <textarea v-model="choiceReason" :disabled="isSaved" class="sn-input" rows="2"
                  placeholder="Tavsiya, reklama, narx, oldingi safar …"></textarea>
            </section>

            <!-- Always in reach: how far the call has got, what still blocks the save,
                 and the save itself. -->
            <footer class="sn-savebar">
               <div class="sn-progress">
                  <span class="sn-progress-num"><b>{{ answeredCount }}</b>/{{ totalKeys }} savol</span>
                  <span class="sn-progress-bar"><i :style="{ width: (totalKeys ? answeredCount / totalKeys * 100 : 0) + '%' }"></i></span>
               </div>
               <button v-if="missingReasons.length && !isSaved" type="button" class="sn-missing" @click="focusReason(missingReasons[0])">
                  <Icon name="alert" :size="14" /> {{ missingReasons.length }} ta past bahoga sabab yozilmagan
               </button>
               <span v-else-if="draftState" class="sn-draft" :class="{ bad: draftState.endsWith('!') }">{{ draftState }}</span>
               <div class="sn-savebar-end">
                  <span class="sn-savebar-ell" title="Ellikboshi bahosi — taxminiy">
                     Ellikboshi: <b>{{ preview.ell === null ? '—' : preview.ell }}</b>/100
                  </span>
                  <button v-if="isSaved && nextPilgrim" type="button" class="sn-btn sn-btn-primary sn-btn-lg" @click="open(nextPilgrim)">
                     Keyingi ziyoratchi <Icon name="chevron" :size="14" />
                  </button>
                  <button v-else type="button" class="sn-btn sn-btn-primary sn-btn-lg" :disabled="isSaved || saving"
                     :title="missingReasons.length ? 'Avval past baholarga sabab yozing' : ''" @click="save">
                     {{ isSaved ? 'Saqlangan' : saving ? 'Saqlanmoqda…' : 'Saqlash va yopish' }}
                  </button>
               </div>
            </footer>
         </main>

         <main v-else class="sn-main sn-main-empty">
            <div class="sn-card sn-welcome">
               <h2>Ziyoratchini tanlang</h2>
               <ol>
                  <li><b>Guruhni oching</b> — ro'yxat CRMdan o'zi olinadi.</li>
                  <li><b>Ziyoratchini tanlang</b> va qo'ng'iroq qiling.</li>
                  <li><b>Javoblarni belgilang</b> — past bahoga sabab yozing, so'ng saqlang.</li>
               </ol>
               <p class="sn-muted">CRMda bo'lmagan guruhga ziyoratchini «Qo'shish» orqali Excel fayl yoki qo'lda kiriting.</p>
            </div>
         </main>

         <!-- ─────────── LIVE IMPACT (preview; the SAVED score is the server's) ── -->
         <aside v-if="current" class="sn-sum">
            <section class="sn-card">
               <div class="sn-eyebrow">Ellikboshi bahosi</div>
               <div class="sn-bignum" :class="preview.ell === null ? '' : scoreBand(preview.ell)">
                  {{ preview.ell === null ? '—' : preview.ell }}<small>/100</small>
               </div>
               <div class="sn-bar" :class="preview.ell === null ? '' : scoreBand(preview.ell)"><i :style="{ width: (preview.ell || 0) + '%' }"></i></div>
               <div class="sn-brk"><span>Muomala va e'tibor</span><span>{{ preview.muomala ?? '—' }} / {{ W.service }}</span></div>
               <div class="sn-brk"><span>Bilim darajasi</span><span>{{ preview.bilim ?? '—' }} / {{ W.knowledge }}</span></div>
               <div class="sn-brk"><span>Qayta tanlash</span><span>{{ preview.qayta ?? '—' }} / {{ W.again }}</span></div>
               <div class="sn-brk"><span>Qayta Umra sifati</span><span>{{ preview.umra ?? '—' }} / {{ W.umra }}</span></div>
               <div class="sn-brk neg"><span>Muammolar jarimasi</span><span>−{{ preview.jarima }}</span></div>
               <p class="sn-note">Taxminiy. Rasmiy ball saqlashda serverda hisoblanadi; oylik KPI = operatsion × 0,5 + ziyoratchi bahosi × 0,5.</p>
            </section>
            <section class="sn-card">
               <div class="sn-eyebrow">Boshqa baholar</div>
               <div v-for="a in affected" :key="a.key" class="sn-aff">
                  <span class="sn-aff-label">{{ a.label }}</span>
                  <span class="sn-aff-val" :class="a.band">{{ a.value }}</span>
               </div>
               <p v-if="!affected.length" class="sn-note">Hozircha yo'q.</p>
            </section>
         </aside>
      </div>

      <!-- ─────────── ADD PEOPLE to the open group ─────────── -->
      <!-- Two doors into the same queue, both through THIS group: the workbook, or one
           name typed (or pasted) by hand. No paste-a-list box: the owner had it
           removed on 2026-08-20 — «буфер обмена» meant copying names and numbers OUT
           of the panel. -->
      <div v-if="importFor !== null" class="sn-modal" @click.self="closeImport" @keydown.esc="closeImport">
         <div class="sn-modal-card" role="dialog" aria-modal="true" aria-labelledby="sn-import-title">
            <header class="sn-modal-head">
               <div>
                  <h2 id="sn-import-title">Ziyoratchi qo'shish</h2>
                  <p class="sn-muted">{{ openGroupObj?.title }}</p>
               </div>
               <button type="button" class="sn-iconbtn" title="Yopish" @click="closeImport"><Icon name="x" :size="16" /></button>
            </header>
            <div class="sn-tabs">
               <button type="button" :class="{ on: importMode === 'file' }" @click="setMode('file')">Excel fayl</button>
               <button type="button" :class="{ on: importMode === 'manual' }" @click="setMode('manual')">Qo'lda</button>
            </div>

            <template v-if="importMode === 'file'">
               <input ref="fileEl" type="file" accept=".xlsx,.xlsm" class="hidden" @change="onFile" />
               <button type="button" class="sn-drop" :disabled="importing" @click="pickFile">
                  <Icon name="upload" :size="20" />
                  <b>{{ importing ? "O'qilyapti…" : fileName || 'Excel faylni tanlang' }}</b>
                  <small v-if="filePreview?.sheet">«{{ filePreview.sheet }}» varag'i</small>
                  <small v-else>Faqat <b>Ф.И.Ш.</b> va <b>тел.ракам</b> ustunlari o'qiladi</small>
               </button>

               <!-- The report BEFORE anything is written: the wrong tab, last month's
                    file — each looks like a successful import until somebody counts. -->
               <div v-if="filePreview" class="sn-report">
                  <div class="sn-report-counts">
                     <span><b>{{ filePreview.counts.ok || 0 }}</b> telefon bilan</span>
                     <span v-if="filePreview.counts.no_phone" class="warn"><b>{{ filePreview.counts.no_phone }}</b> telefonsiz</span>
                     <span v-if="filePreview.counts.bad_phone" class="bad"><b>{{ filePreview.counts.bad_phone }}</b> raqam o'qilmadi</span>
                     <span v-if="filePreview.counts.no_name" class="bad"><b>{{ filePreview.counts.no_name }}</b> ismsiz</span>
                     <span v-if="filePreview.counts.short_row" class="bad"><b>{{ filePreview.counts.short_row }}</b> qator kalta</span>
                  </div>
                  <p v-if="filePreview.counts.no_phone" class="sn-note">
                     Telefonsizlar ham qo'shiladi — qamrov hisobiga kiradi, raqamini keyin yozsa bo'ladi.
                  </p>
                  <div class="sn-plist">
                     <div v-for="r in filePreview.preview" :key="r.line" class="sn-plist-row" :class="'st-' + r.status">
                        <small>{{ r.line }}</small>
                        <span>{{ r.name || '—' }}</span>
                        <small>{{ r.phone || r.phone_cell || '—' }}</small>
                     </div>
                  </div>
                  <p v-if="filePreview.preview_truncated" class="sn-note">
                     …va yana {{ filePreview.preview_truncated }} ta qator (ro'yxat qisqartirildi, hammasi qo'shiladi).
                  </p>
               </div>
               <footer class="sn-modal-foot">
                  <button type="button" class="sn-btn sn-btn-quiet" @click="closeImport">Bekor</button>
                  <button v-if="filePreview" type="button" class="sn-btn sn-btn-primary"
                     :disabled="importing || !filePreview.parsed" @click="commitFile(importFor!)">
                     {{ filePreview.parsed }} ta ziyoratchini qo'shish
                  </button>
               </footer>
            </template>

            <!-- One person by hand. Enter adds and the cursor returns to the name; a
                 pasted «NAME <tab> 998901234567» lands in BOTH fields at once. -->
            <template v-else>
               <label class="sn-field">Ф.И.Ш.
                  <input ref="newNameEl" v-model="newName" class="sn-input" placeholder="Familiya Ism"
                     :disabled="importing" @keyup.enter="addManual(importFor!)" @paste="onManualPaste" />
               </label>
               <label class="sn-field">Telefon <small>ixtiyoriy</small>
                  <input v-model="newPhone" class="sn-input" placeholder="+998 …"
                     :disabled="importing" @keyup.enter="addManual(importFor!)" @paste="onManualPaste" />
               </label>
               <p class="sn-note">Ism va telefonni birga qo'ysangiz (Ctrl+V) ikkala maydon o'zi to'ladi.</p>
               <footer class="sn-modal-foot">
                  <button type="button" class="sn-btn sn-btn-quiet" @click="closeImport">Yopish</button>
                  <button type="button" class="sn-btn sn-btn-primary" :disabled="importing || !newName.trim()"
                     @click="addManual(importFor!)">Qo'shish</button>
               </footer>
            </template>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onMounted, onUnmounted, reactive, ref, watch, type FunctionalComponent } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()

// ── icons: a handful of strokes, inline — no registry for a page with its own login ──
const PATHS: Record<string, string> = {
   copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
   edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
   phone: 'M5 4h3.5l2 5-2.5 1.5a11 11 0 0 0 5.5 5.5l1.5-2.5 5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
   back: 'M15 18l-6-6 6-6',
   chevron: 'M9 6l6 6-6 6',
   plus: 'M12 5v14M5 12h14',
   x: 'M6 6l12 12M18 6L6 18',
   trash: 'M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13',
   check: 'M5 12.5l4.5 4.5L19 7.5',
   search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
   upload: 'M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
   alert: 'M12 9v4M12 17h.01M10.3 3.9L2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
   sync: 'M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M20 4v4h-4M4 20v-4h4',
}
const Icon: FunctionalComponent<{ name: string; size?: number }> = (p) =>
   h('svg', {
      width: p.size ?? 16, height: p.size ?? 16, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round',
      'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'sn-ico',
   }, [h('path', { d: PATHS[p.name] || '' })])
Icon.props = ['name', 'size']

const CALL_LABELS: Record<string, string> = {
   kutmoqda: 'Kutmoqda', boldi: "Bo'ldi", javob_bermadi: 'Javob bermadi',
   qayta: "Qayta qo'ng'iroq", bosh_tortdi: 'Bosh tortdi',
}
const NO_PHONE = "telefon yo'q"
const SAVED_NO_DELETE = "So'rovnomasi saqlangan — o'chirilmaydi"
const EMPTY_GROUP = "Bu guruhda ziyoratchi yo'q — «Qo'shish» orqali Excel fayl yoki qo'lda kiriting."
const REASON_PLACEHOLDER = "Ziyoratchi aytgan sabab — o'z so'zlari bilan"

/** A LOW answer is saved only with its reason (owner, 2026-10-09: «если оценщик ставит
 *  низкую оценку, он ещё должен написать комментарий — причину»). Low = 0–6 on the
 *  0–10 form (the red and amber buttons), 1–3 on a survey begun on 1–5, and «Yo'q».
 *  The SAME numbers as kpi.py's SURVEY_LOW_* — the server refuses the save otherwise. */
const LOW_MAX_10 = 6
const LOW_MAX_5 = 3
const LOW_CHOICE = 'yoq'
/** 0–10 on both forms — it was added already as 0–10 (kpi.py `_ALWAYS_TEN`). */
const ALWAYS_TEN = new Set(['q1_umra_quality'])

/** The merged questionnaire (owner, 2026-08-15) — §6.1 plus the added blocks.
 *  Only Q1 feeds the ellikboshi's ball; the rest accumulate for other parties.
 *  Q1 is 35/25/20/20 since 2026-09-22 — the weights live in W below and in kpi.py,
 *  and must match. */
const W = { service: 35, knowledge: 25, again: 20, umra: 20 }
const BLOCKS = [
   { key: 'q1', title: 'Ellikboshi xizmati va bilimi', who: 'KPI ga kiradi', kpi: true, rows: [
      { k: 'q1_service', label: "Muomala va e'tibor", type: 'scale' },
      { k: 'q1_knowledge', label: 'Diniy va marshrut bilimi', type: 'scale' },
      { k: 'q1_again', label: 'Yana shu ellikboshi bilan borasizmi?', type: 'choice',
        choices: [{ v: 'ha', l: 'Ha' }, { v: 'bilmayman', l: 'Bilmayman' }, { v: 'yoq', l: "Yo'q" }] },
      { k: 'q1_umra_quality', label: 'Qayta Umra qilish sifatiga qanday baholaysiz', type: 'scale10' },
   ] },
   // Who SOLD the trip (owner, 2026-10-09) — named from the CRM with the pilgrim, so
   // the row reads as the seller's name, the way the hotel rows read as the hotel's.
   { key: 'q11', title: 'Sotuvchi xizmati', who: "sotuv bo'limi", rows: [
      { k: 'q11_seller', label: 'Sotuvchi', seller: true, type: 'scale' }] },
   // «Otinoyi» IS the ayol maslahatchi the company already has (owner, 2026-08-18:
   // @Zilola_Irfon), the city-agnostic `female_advisor` inquiry tag — not a new role.
   { key: 'q2', title: 'Otinoyi (ayol maslahatchi)', who: 'otinoyi', rows: [
      { k: 'q2_otinoyi', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q3', title: 'Toshkentdagi kuzatuv jamoasi', who: "bo'lim bahosi", rows: [
      { k: 'q3_tashkent', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q4', title: "Guruh adminining Telegram'dagi ishi", who: 'guruh admini', rows: [
      { k: 'q4_admin', label: 'Umumiy baho', type: 'scale' }] },
   // One score per CITY (owner, 2026-09-26) — the two crews are different people.
   // Surveys saved before keep their one `q5_workgroup` answer (see AFF_LABELS).
   { key: 'q5', title: 'Tashkiliy guruh', who: 'tashkiliy guruh', rows: [
      { k: 'q5_workgroup_md', label: 'Madinadagi tashkiliy guruh', type: 'scale' },
      { k: 'q5_workgroup_mk', label: 'Makkadagi tashkiliy guruh', type: 'scale' }] },
   { key: 'q6', title: 'Shifokor xizmati', who: 'shifokorlar', rows: [
      { k: 'q6_doctor_md', label: 'Madinadagi shifokor', type: 'scale' },
      { k: 'q6_doctor_mk', label: 'Makkadagi shifokor', type: 'scale' }] },
   // By HOTEL NAME, not by city (owner, 2026-10-07): `city` says whose hotel the row
   // is, and rowLabel() shows that hotel's name; `label` is only the fallback.
   { key: 'q7', title: 'Mehmonxonalar', who: 'yetkazib beruvchi', rows: [
      { k: 'q7_hotel_md', label: 'Madina', city: 'madina', type: 'scale' },
      { k: 'q7_hotel_mk', label: 'Makka', city: 'makka', type: 'scale' },
      { k: 'q7_hotel_jd', label: 'Jidda', city: 'jidda', type: 'scale' }] },
   { key: 'q8', title: 'Taomlar sifati', who: 'oshxona', rows: [
      { k: 'q8_food_mk', label: 'Makka', city: 'makka', type: 'scale' },
      { k: 'q8_food_md', label: 'Madina', city: 'madina', type: 'scale' }] },
   { key: 'q9', title: 'Aviakompaniya va parvoz', who: 'charter', rows: [
      { k: 'q9_avia', label: 'Umumiy baho', type: 'scale' }] },
   { key: 'q10', title: 'Umra safarini boshqalarga tavsiya qilasizmi?', who: 'kompaniya (NPS)', rows: [
      { k: 'q10_recommend', label: 'Tavsiya', type: 'choice',
        choices: [{ v: 'ha', l: 'Ha' }, { v: 'bilmayman', l: 'Bilmayman' }, { v: 'yoq', l: "Yo'q" }] }] },
] as any[]
const ROWS: any[] = BLOCKS.flatMap((b: any) => b.rows)
const ROW_BY_KEY: Record<string, any> = Object.fromEntries(ROWS.map((r) => [r.k, r]))

const queue = ref<any[]>([])
const current = ref<any>(null)
const answers = reactive<Record<string, any>>({})
const reasons = reactive<Record<string, string>>({})

/** The hotel the open pilgrim stayed in, per city — sent by the server (a SAVED survey
 *  sends the hotels it was asked about). */
function hotelOf(city: string): string {
   return (current.value?.hotels?.[city] || '').trim()
}
function rowLabel(r: any): string {
   if (r.seller) return current.value?.seller?.name || r.label
   return (r.city && hotelOf(r.city)) || r.label
}
function rowHint(r: any): string {
   if (r.seller) return current.value?.seller ? 'sotgan xodim · CRM' : "CRMda sotuvchi ko'rsatilmagan"
   if (r.city && hotelOf(r.city)) return r.label
   return ''
}
/** Jidda only when the pilgrim had a Jidda hotel. Hidden when the other hotels are known
 *  and Jidda is not — the trip had no Jidda stay — unless it was already answered.
 *  With no hotel known at all the row stays, as before. */
function showRow(r: any): boolean {
   if (r.city !== 'jidda' || hotelOf('jidda') || answers[r.k] != null) return true
   return !(hotelOf('makka') || hotelOf('madina'))
}
/** The rows actually asked of THIS pilgrim, in order — progress and the keyboard walk them. */
const ALL_KEYS = computed<string[]>(() => ROWS.filter(showRow).map((r: any) => r.k))
const totalKeys = computed(() => ALL_KEYS.value.length)

const groups = ref<any[]>([])
const search = ref('')
const statusFilter = ref('')
const pickedGroup = ref<number | null>(null)
const problems = ref<any[]>([])
const suggestion = ref('')
const choiceReason = ref('')
const touched = reactive(new Set<string>())
const isSaved = ref(false)
// The scale of the OPEN survey's 'scale' rows. 10 for every survey begun since
// 2026-09-26; 5 only for one begun before — its answers are 1–5 numbers and must be
// read, shown and scored as such. Sent as `answers._scale`, which kpi.py reads.
const scale = ref<5 | 10>(10)
const SCALE_KEYS: string[] = ROWS.filter((r: any) => r.type === 'scale').map((r: any) => r.k)
const savedScore = ref<number | null>(null)
const saving = ref(false)
const draftState = ref('')
const focusKey = ref<string | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)
const newNameEl = ref<HTMLInputElement | null>(null)

// ── the answer scale ────────────────────────────────────────────────────────────────
function isFive(r: any): boolean {
   return r.type === 'scale' && scale.value === 5
}
function scaleValues(r: any): number[] {
   return isFive(r) ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}
/** Red / amber / green. Red and amber together are exactly the answers that need a reason. */
function band(r: any, v: number): 'bad' | 'mid' | 'good' {
   if (isFive(r)) return v <= 2 ? 'bad' : v <= LOW_MAX_5 ? 'mid' : 'good'
   return v <= 4 ? 'bad' : v <= LOW_MAX_10 ? 'mid' : 'good'
}
function choiceBand(v: string): string {
   return v === 'ha' ? 'good' : v === LOW_CHOICE ? 'bad' : 'neutral'
}
function scoreBand(n: number): string {
   return n >= 70 ? 'good' : n >= 50 ? 'mid' : 'bad'
}
/** Whether an answer is low — read from the value, like kpi.py's survey_low_keys, so an
 *  old draft's retired key is judged by the same rule as the server. */
function isLowValue(k: string, v: any): boolean {
   if (k.startsWith('_') || v == null || typeof v === 'boolean') return false
   if (typeof v === 'string') return v === LOW_CHOICE
   if (typeof v !== 'number') return false
   const ten = scale.value === 10 || ALWAYS_TEN.has(k)
   return v <= (ten ? LOW_MAX_10 : LOW_MAX_5)
}
const lowKeys = computed(() => Object.keys(answers).filter((k) => isLowValue(k, answers[k])))
function hasReason(k: string): boolean {
   return !!(reasons[k] || '').trim()
}
function needsReason(k: string): boolean {
   return isLowValue(k, answers[k]) || (isSaved.value && hasReason(k))
}
const missingReasons = computed(() => {
   const order = ALL_KEYS.value
   return lowKeys.value.filter((k) => !hasReason(k))
      .sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999))
})
/** Low answers to a key the form does not show (an old draft's retired question). */
const orphanLow = computed(() => lowKeys.value.filter((k) => !ROW_BY_KEY[k]))

const rowEls: Record<string, HTMLElement> = {}
const reasonEls: Record<string, HTMLTextAreaElement> = {}
function setRowEl(k: string, el: any) {
   if (el) rowEls[k] = el as HTMLElement
   else delete rowEls[k]
}
function setReasonEl(k: string, el: any) {
   if (el) reasonEls[k] = el as HTMLTextAreaElement
   else delete reasonEls[k]
}
function focusReason(k: string) {
   nextTick(() => {
      const el = reasonEls[k]
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.focus({ preventScroll: true })
   })
}
/** Enter in a reason goes back to the questions — the keyboard walk continues from the
 *  next row (Shift+Enter is a new line). */
function reasonDone(k: string) {
   reasonEls[k]?.blur()
   const keys = ALL_KEYS.value
   const i = keys.indexOf(k)
   if (i >= 0) focusKey.value = keys[Math.min(i + 1, keys.length - 1)]
}

// ── the group-first list ────────────────────────────────────────────────────────────
const openGroup = ref<number | null>(null)
const importFor = ref<number | null>(null)
const filePreview = ref<any>(null)
const fileName = ref('')
const fileB64 = ref('')
const importing = ref(false)
// Which door is open. Remembered across groups on purpose — a specialist adding a few
// late names should not have to pick «Qo'lda» every time.
const importMode = ref<'file' | 'manual'>('file')
const newName = ref('')
const newPhone = ref('')

const needle = computed(() => search.value.trim().toLowerCase())
function matches(p: any): boolean {
   const n = needle.value
   return !n || p.full_name.toLowerCase().includes(n) || (p.phone || '').includes(n.replace(/\D/g, '') || n)
}

const openGroupObj = computed(() => groups.value.find((g) => g.chat_id === openGroup.value) || null)

/** Every pilgrim of the open group, unfiltered — the chips count from it. */
const groupAll = computed(() => queue.value.filter((p) => p.chat_id === openGroup.value))
const statusCounts = computed(() => {
   const out: Record<string, number> = {}
   for (const p of groupAll.value) out[p.call_status] = (out[p.call_status] || 0) + 1
   return out
})
/** The open group's list: searched, filtered by call status, saved surveys at the
 *  bottom — the people still to call stay on top. */
const groupPilgrims = computed(() => groupAll.value
   .filter((p) => matches(p) && (!statusFilter.value || p.call_status === statusFilter.value))
   .slice()
   .sort((a, b) => Number(a.survey_status === 'saved') - Number(b.survey_status === 'saved')
      || a.full_name.localeCompare(b.full_name)))

/** The next person to call after the open one — in their group, in the list's order. */
const nextPilgrim = computed(() => {
   const list = queue.value.filter((p) => p.chat_id === current.value?.chat_id)
      .sort((a, b) => Number(a.survey_status === 'saved') - Number(b.survey_status === 'saved')
         || a.full_name.localeCompare(b.full_name))
      .filter((p) => p.survey_status !== 'saved' && p.id !== current.value?.id)
   return list[0] || null
})

/** Groups the search still matches — by their OWN name, or by a pilgrim inside them,
 *  so typing a pilgrim's name finds the group rather than emptying the list. */
const filteredGroups = computed(() => {
   if (!needle.value) return groups.value
   const hit = new Set(queue.value.filter(matches).map((p) => p.chat_id))
   return groups.value.filter((g) => (g.title || '').toLowerCase().includes(needle.value) || hit.has(g.chat_id))
})
/** Pilgrims the search finds across every group — opened straight from the results. */
const searchHits = computed(() => (needle.value.length >= 2 ? queue.value.filter(matches).slice(0, 12) : []))

function dotClass(p: any): string {
   if (p.survey_status === 'saved') return 'done'
   if (p.survey_status === 'draft') return 'draft'
   return 'cs-' + p.call_status
}

/** §10.3 — a group under 50% has its surveys dropped from the ball entirely. */
function coverPct(g: any) {
   return g.pilgrim_count ? Math.round((g.surveyed_count / g.pilgrim_count) * 100) : 0
}
function tripRange(g: any): string {
   if (!g?.trip_start_date) return '—'
   return `${dmy(g.trip_start_date)} — ${g.trip_end_date ? dmy(g.trip_end_date) : '?'}`
}

function openGroupView(chatId: number) {
   openGroup.value = chatId
   statusFilter.value = ''
   search.value = ''
   void syncFromCrm(chatId)
}
function closeGroupView() {
   openGroup.value = null
   statusFilter.value = ''
   closeImport()
}
function openFromSearch(p: any) {
   openGroup.value = p.chat_id
   statusFilter.value = ''
   search.value = ''
   void syncFromCrm(p.chat_id)
   open(p)
}

/** Where each opened group's CRM list stands: loading, not bound to a CRM group, CRM
 *  unreachable, or how many pilgrims the CRM has for it. */
const crmState = reactive<Record<number, any>>({})

/** Fill the group's list from the CRM — on EVERY open, so a late booking or a re-roomed
 *  pilgrim shows up without anybody importing anything. The server merges: a second
 *  run adds nobody, and a corrected name or number is never overwritten. */
async function syncFromCrm(chatId: number) {
   if (crmState[chatId]?.loading) return
   crmState[chatId] = { ...(crmState[chatId] || {}), loading: true }
   try {
      const { data } = await api.post(`/survey/groups/${chatId}/crm-sync`)
      crmState[chatId] = { loading: false, ...data }
      if (data.added || data.adopted || data.updated || data.removed) {
         await Promise.all([loadQueue(), loadGroups()])
         if (current.value) {
            const fresh = queue.value.find((p) => p.id === current.value.id)
            if (fresh) {
               current.value.hotels = fresh.hotels
               current.value.seller = fresh.seller
            }
         }
      }
      if (data.added) toast.success(`CRMdan ${data.added} ta ziyoratchi qo'shildi`)
   } catch {
      crmState[chatId] = { loading: false, linked: true, ok: false }
   }
}

const crmStatus = computed<{ tone: string; text: string } | null>(() => {
   const st = openGroup.value === null ? null : crmState[openGroup.value]
   if (!st) return null
   if (st.loading) return { tone: 'busy', text: "CRMdan ro'yxat olinmoqda…" }
   if (st.linked === false) return { tone: 'warn', text: "Guruh CRMga bog'lanmagan — ro'yxatni qo'lda yoki Excel orqali qo'shing." }
   if (!st.ok && st.crm_total === undefined) return { tone: 'bad', text: "CRMdan ro'yxat olinmadi — guruhni keyinroq qayta oching." }
   return {
      tone: st.ok ? 'ok' : 'warn',
      text: `CRMda ${st.crm_total ?? 0} ta ziyoratchi` + (st.ok ? '' : ' (bir qismi olinmadi)'),
   }
})

function openImport() {
   if (!openGroupObj.value) return
   closeImport()
   importFor.value = openGroupObj.value.chat_id
   if (importMode.value === 'manual') nextTick(() => newNameEl.value?.focus())
}

function closeImport() {
   importFor.value = null
   clearPreview()
   newName.value = ''
   newPhone.value = ''
}

function clearPreview() {
   filePreview.value = null
   fileName.value = ''
   fileB64.value = ''
}

/** Switch doors. The file report is cleared because it belongs to the other tab. The
 *  typed name is kept: switching tabs is not «Bekor». */
function setMode(m: 'file' | 'manual') {
   importMode.value = m
   clearPreview()
   if (m === 'manual') nextTick(() => newNameEl.value?.focus())
}

/** The server's reason, whichever shape it came in: a sentence, or {message, …}. */
function errText(e: any, fallback: string): string {
   const d = e?.response?.data?.detail
   if (typeof d === 'string') return d
   if (d && typeof d.message === 'string') return d.message
   return fallback
}

/** Copy to the clipboard, and say so. The execCommand path is the fallback for an
 *  http:// LAN address, where `navigator.clipboard` is missing. */
async function copyText(text: string, what: string) {
   const value = (text || '').trim()
   if (!value) return
   try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else {
         const ta = document.createElement('textarea')
         ta.value = value
         ta.setAttribute('readonly', '')
         ta.style.position = 'fixed'
         ta.style.opacity = '0'
         document.body.appendChild(ta)
         ta.select()
         document.execCommand('copy')
         ta.remove()
      }
      toast.success(`${what} nusxalandi: ${value}`)
   } catch {
      toast.error('Nusxalanmadi — matnni belgilab Ctrl+C bosing')
   }
}

/** A phone inside a pasted line: the first run of 7+ digits with the usual furniture
 *  (+, spaces, dashes, brackets). Returns [name, phone]. */
function splitNamePhone(text: string): [string, string] {
   const line = (text || '').replace(/\r/g, '').split('\n').map((l) => l.trim()).find(Boolean) || ''
   const m = line.match(/\+?\(?\d[\d\s\-()]{5,}\d/)
   const digits = m ? m[0].replace(/\D/g, '') : ''
   if (!m || digits.length < 7) return [line.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim(), '']
   const name = (line.slice(0, m.index) + ' ' + line.slice(m.index! + m[0].length))
      .replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim()
   return [name, m[0].trim()]
}

/** «NAME <tab> 998901234567» pasted into either by-hand field fills both. Only the first
 *  line is taken — a whole list belongs in the Excel door, which previews what it read. */
function onManualPaste(ev: ClipboardEvent) {
   const text = ev.clipboardData?.getData('text') || ''
   const first = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).find(Boolean) || ''
   // A whole sheet row is not a name and a number, and guessing which two cells are is
   // how a booking date once became a pilgrim's name. Refused, with the fix named.
   if (first.split('\t').filter((f) => f.trim()).length > 2) {
      ev.preventDefault()
      toast.error("Butun qator qo'yildi — faqat Ф.И.Ш. va телефон katakchalarini nusxalang")
      return
   }
   const [name, phone] = splitNamePhone(text)
   if (!name || !phone) return          // nothing to split: let the browser paste
   ev.preventDefault()
   newName.value = name
   newPhone.value = phone
   if (text.trim().includes('\n')) toast.error("Faqat birinchi qator olindi — ro'yxat uchun Excel faylni yuklang")
}

function pickFile() {
   fileEl.value?.click()
}

/** The file → base64 → the server, which reads it and says what it found, writing
 *  nothing. The column rules live on the server, once, in the probed module. */
async function onFile(ev: Event) {
   const input = ev.target as HTMLInputElement
   const file = input.files?.[0]
   input.value = ''   // so choosing the SAME file again still fires @change
   if (!file) return
   importing.value = true
   filePreview.value = null
   fileName.value = file.name
   try {
      fileB64.value = await toBase64(file)
      const { data } = await api.post('/survey/file',
         { chat_id: importFor.value, content_b64: fileB64.value,
           filename: file.name, commit: false })
      filePreview.value = data
      if (!data.parsed) toast.error("Fayldan birorta ism o'qilmadi — varaqni tekshiring")
   } catch (e: any) {
      fileName.value = ''
      fileB64.value = ''
      toast.error(errText(e, "Fayl o'qilmadi"))
   } finally { importing.value = false }
}

/** Base64 without a data: prefix. FileReader, not a loop over the bytes: a 3000-row
 *  workbook is megabytes, and String.fromCharCode over that blows the argument limit. */
function toBase64(file: File): Promise<string> {
   return new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result || '').split(',').pop() || '')
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
   })
}

/** One person, typed in. Stays on the form with the cursor back on the name — the next
 *  one is usually right behind. */
async function addManual(chatId: number) {
   const name = newName.value.trim()
   if (!name || importing.value) return
   importing.value = true
   try {
      const { data } = await api.post('/survey/pilgrims',
         { chat_id: chatId, full_name: name, phone: newPhone.value.trim() || null })
      toast.success(`Qo'shildi: ${data.full_name}`)
      newName.value = ''
      newPhone.value = ''
      await Promise.all([loadQueue(), loadGroups()])
      nextTick(() => newNameEl.value?.focus())
   } catch (e: any) {
      toast.error(errText(e, "Qo'shilmadi"))
   } finally { importing.value = false }
}

/** One pilgrim off the queue. A saved survey cannot go (the ✕ is disabled and the
 *  server refuses too) — its ball is already on the ellikboshi's month. */
async function removePilgrim(p: any) {
   if (!p || p.survey_status === 'saved' || (current.value?.id === p.id && isSaved.value)) return
   const ok = await confirm({
      title: `${p.full_name} — ro'yxatdan o'chirish`,
      message: "Boshlangan qoralama ham o'chadi. Bu amalni ortga qaytarib bo'lmaydi",
      confirmText: "O'chirish",
   })
   if (!ok) return
   try {
      await api.delete(`/survey/pilgrims/${p.id}`)
      if (current.value?.id === p.id) current.value = null
      toast.success("O'chirildi")
      await Promise.all([loadQueue(), loadGroups()])
   } catch (e: any) {
      toast.error(errText(e, "O'chirilmadi"))
   }
}

/** «Tozalash» removes every pilgrim of the group without a saved survey — the whole
 *  group, not the search-filtered view. */
function deletableOf(chatId: number) {
   return queue.value.filter((p) => p.chat_id === chatId && p.survey_status !== 'saved').length
}

/** The group's whole list. The confirm names the numbers the server will act on —
 *  what goes and what stays — so «why is it not empty» is answered before the click. */
async function clearGroup(g: any) {
   const all = queue.value.filter((p) => p.chat_id === g.chat_id)
   const saved = all.filter((p) => p.survey_status === 'saved').length
   const going = all.length - saved
   if (!going) return
   const ok = await confirm({
      title: `«${g.title || g.chat_id}» ro'yxatini tozalash`,
      message: `${going} ta ziyoratchi o'chiriladi`
         + (saved ? `, ${saved} ta saqlangan so'rovnoma qoladi` : '')
         + ". Bu amalni ortga qaytarib bo'lmaydi",
      confirmText: 'Tozalash',
   })
   if (!ok) return
   try {
      const { data } = await api.delete(`/survey/groups/${g.chat_id}/pilgrims`)
      if (current.value?.chat_id === g.chat_id && !isSaved.value) current.value = null
      toast.success(`${data.deleted} ta o'chirildi`
         + (data.kept_saved ? `, ${data.kept_saved} ta saqlangan qoldi` : ''))
      closeImport()
      await Promise.all([loadQueue(), loadGroups()])
   } catch (e: any) {
      toast.error(errText(e, 'Tozalanmadi'))
   }
}

/** The SAME bytes the preview was computed from — never a re-read of the input, which
 *  could by then be a different file. */
async function commitFile(chatId: number) {
   importing.value = true
   try {
      const { data } = await api.post('/survey/file',
         { chat_id: chatId, content_b64: fileB64.value,
           filename: fileName.value, commit: true })
      const parts = [`${data.added} qo'shildi`]
      if (data.duplicates) parts.push(`${data.duplicates} avvaldan bor`)
      if (data.no_phone) parts.push(`${data.no_phone} telefonsiz`)
      if (data.unnamed) parts.push(`${data.unnamed} ismsiz`)
      toast.success(`Import: ${parts.join(', ')}`)
      closeImport()
      await Promise.all([loadQueue(), loadGroups()])
   } catch (e: any) {
      toast.error(errText(e, 'Import xatosi'))
   } finally { importing.value = false }
}
const doneToday = computed(() => queue.value.filter((p) => p.survey_status === 'saved').length)
const groupInfo = computed(() => groups.value.find((g) => g.chat_id === pickedGroup.value) || null)

// Reset per pilgrim: a filter left on from the previous call is a filter nobody chose,
// and a half-typed correction must never follow the specialist to the next person.
const showAllGroups = ref(false)
watch(() => current.value?.id, () => {
   showAllGroups.value = false
   editingName.value = null
   editingPhone.value = null
})

/** The picker's options. Narrowed to the groups that departed on the day Bitrix
 *  recorded — but only while that leaves something to pick. */
const pickableGroups = computed(() => {
   const hint = current.value?.depart_hint
   if (!hint || showAllGroups.value) return groups.value
   const sameDay = groups.value.filter((g) => g.trip_start_date === hint)
   return sameDay.length ? sameDay : groups.value
})

/** 2026-08-15 -> 15.08.2026, the way the office writes a date. */
function dmy(iso: string) {
   const [y, m, d] = (iso || '').split('-')
   return d ? `${d}.${m}.${y}` : iso
}

/** The chosen group's trip has not ended yet — §6 puts the call 1–3 days after the
 *  flight home, so this is a survey about a trip still in progress. */
const notReturnedYet = computed(() => {
   const end = groupInfo.value?.trip_end_date
   return !!end && end > new Date().toISOString().slice(0, 10)
})
/** Led by two different people across the cities — the server sends both names. */
const splitGroup = computed(() => {
   const g = groupInfo.value
   if (!g) return false
   const md = (g.ellikboshi_madina || '').trim().toLowerCase()
   return !!md && md !== (g.ellikboshi_username || '').trim().toLowerCase()
})
const answeredCount = computed(() => ALL_KEYS.value.filter((k) => touched.has(k)).length)

/** Client-side PREVIEW of the §6.2 arithmetic — the saved score is the server's.
 *  Math.round matches kpi.py's `_half_up`: both send .5 up. */
const preview = computed(() => {
   // The same two conversions as kpi.py's _pct5 / _pct10, picked by the survey's scale.
   const p5 = (v: any) => (v == null ? null
      : scale.value === 10 ? Math.min(1, Math.max(0, v / 10)) : (v - 1) / 4)
   const AGAIN: Record<string, number> = { ha: 1, bilmayman: 0.5, yoq: 0 }
   // Drafts autosaved on the old wire carried the ball itself (30/15/0) — read as a
   // share of that 30, exactly as the server does.
   const share = (v: any) => (v == null ? null : typeof v === 'string' ? (AGAIN[v] ?? null) : Math.min(1, Math.max(0, v / 30)))
   const s = p5(answers.q1_service), kn = p5(answers.q1_knowledge)
   const ag = share(answers.q1_again)
   const um = answers.q1_umra_quality == null ? null : Math.min(1, Math.max(0, answers.q1_umra_quality / 10))
   const jarima = Math.min(20, problems.value
      .filter((p) => p.masul === 'ellikboshi')
      .reduce((sum, p) => sum + (({ kichik: 5, orta: 10, jiddiy: 15 } as any)[p.jiddiylik] || 0), 0))
   const part = (v: number | null, w: number) => (v === null ? null : Math.round(v * w))
   const m = part(s, W.service), b = part(kn, W.knowledge)
   const q = part(ag, W.again), u = part(um, W.umra)
   if (m === null || b === null || q === null || u === null)
      return { muomala: m, bilim: b, qayta: q, umra: u, jarima, ell: null }
   return { muomala: m, bilim: b, qayta: q, umra: u, jarima, ell: Math.max(0, m + b + q + u - jarima) }
})

const AFF_LABELS: Record<string, string> = {
   q11_seller: 'Sotuvchi',
   q2_otinoyi: 'Otinoyi', q3_tashkent: 'Toshkent jamoasi', q4_admin: 'Guruh admini',
   q5_workgroup_md: 'Tashkiliy guruh (Madina)', q5_workgroup_mk: 'Tashkiliy guruh (Makka)',
   // Before the split: one score for both cities. Only surveys saved before 26.09 carry it.
   q5_workgroup: 'Tashkiliy guruh (ikkala shahar)',
   q6_doctor_md: 'Shifokor (Madina)', q6_doctor_mk: 'Shifokor (Makka)',
   q7_hotel_md: 'Mehmonxona (Madina)', q7_hotel_mk: 'Mehmonxona (Makka)', q7_hotel_jd: 'Mehmonxona (Jidda)',
   q8_food_mk: 'Taomlar (Makka)', q8_food_md: 'Taomlar (Madina)', q9_avia: 'Aviakompaniya',
}
/** A hotel or food row names the hotel when it is known (owner, 2026-10-07). */
const AFF_CITY: Record<string, [string, string]> = {
   q7_hotel_md: ['Mehmonxona', 'madina'], q7_hotel_mk: ['Mehmonxona', 'makka'],
   q7_hotel_jd: ['Mehmonxona', 'jidda'],
   q8_food_mk: ['Taomlar', 'makka'], q8_food_md: ['Taomlar', 'madina'],
}
function affLabel(k: string, fallback: string): string {
   if (k === 'q11_seller' && current.value?.seller) return `Sotuvchi (${current.value.seller.name})`
   const c = AFF_CITY[k]
   const h = c ? hotelOf(c[1]) : ''
   return h ? `${c![0]} (${h})` : fallback
}
const affected = computed(() => {
   const out: { key: string; label: string; value: string; band: string }[] = []
   for (const [k, l] of Object.entries(AFF_LABELS)) {
      const v = answers[k]
      if (v == null) continue
      const row = ROW_BY_KEY[k] || { type: 'scale' }
      out.push({ key: k, label: affLabel(k, l), value: `${v}/${isFive(row) ? 5 : 10}`, band: band(row, v) })
   }
   for (const [i, p] of problems.value.entries())
      if (p.masul && p.masul !== 'ellikboshi' && p.masul !== 'none')
         out.push({ key: 'p' + i, label: `Muammo → ${p.masul}`, value: p.jiddiylik, band: 'bad' })
   if (answers.q10_recommend != null) {
      const c = ROW_BY_KEY.q10_recommend.choices.find((x: any) => x.v === answers.q10_recommend)
      out.push({ key: 'nps', label: 'Tavsiya (NPS)', value: c?.l || answers.q10_recommend, band: choiceBand(answers.q10_recommend) })
   }
   return out
})

async function loadQueue() {
   queue.value = (await api.get('/survey/queue')).data
}
async function loadGroups() {
   groups.value = (await api.get('/survey/groups')).data
}

function open(p: any) {
   // An answer given in the last 800 ms still waits on the autosave timer — it belongs
   // to the pilgrim being left, so it goes now, before the form is cleared.
   if (draftTimer && current.value && !isSaved.value) { clearTimeout(draftTimer); void pushDraft() }
   current.value = p
   pickedGroup.value = p.chat_id
   isSaved.value = p.survey_status === 'saved'
   savedScore.value = p.ell_score ?? null
   // EVERY key, not just the asked ones: an old draft's retired `q5_workgroup` is not in
   // the questionnaire, and clearing only those would carry it into the next survey.
   for (const k of Object.keys(answers)) delete answers[k]
   for (const k of Object.keys(reasons)) delete reasons[k]
   scale.value = 10
   touched.clear()
   problems.value = []
   suggestion.value = ''
   choiceReason.value = ''
   draftState.value = ''
   focusKey.value = ALL_KEYS.value[0]
   window.scrollTo({ top: 0 })
   // Clearing the form is not an edit: the autosave must not write an empty draft for
   // a pilgrim merely opened.
   nextTick(() => { clearTimeout(draftTimer); draftTimer = null; draftState.value = '' })
   void resumeDraft(p.id)
}

async function resumeDraft(pid: number) {
   try {
      const { data } = await api.get(`/survey/${pid}/draft`)
      if (current.value?.id !== pid || !data) return
      const a = data.answers || {}
      // No marker + a scored row already answered = begun on the old 1–5 form.
      scale.value = a._scale === 10 ? 10 : SCALE_KEYS.some((k) => a[k] != null) ? 5 : 10
      Object.assign(answers, a)
      Object.assign(reasons, data.reasons || {})
      for (const k of Object.keys(a)) touched.add(k)
      problems.value = data.problems || []
      suggestion.value = data.suggestion || ''
      choiceReason.value = data.choice_reason || ''
      // Loading a draft is not an edit: the autosave watcher must not echo it back.
      nextTick(() => { clearTimeout(draftTimer); draftTimer = null; draftState.value = '' })
   } catch { /* no draft yet — a clean form is the right state */ }
}

function setAns(k: string, v: any) {
   answers[k] = v
   touched.add(k)
   const keys = ALL_KEYS.value
   const i = keys.indexOf(k)
   // A low answer: the reason is asked for right away, while the pilgrim is still on
   // the line to give it — and the page goes to the reason, not to the next row.
   const askWhy = isLowValue(k, v) && !hasReason(k)
   const next = keys[Math.min(i + 1, keys.length - 1)]
   skipRowScroll = askWhy && next !== focusKey.value
   focusKey.value = next
   if (askWhy) focusReason(k)
}

/** Number keys answer the highlighted row, ↓/Enter and ↑ move — the operator is on a
 *  live call and must never need the mouse. On a choice row (and a scored row of an
 *  old 1–5 survey) keys 1–5 answer and 0/− skip.
 *
 *  On a 0–10 row the number row reads 1…9 then 0 = 10, the way the keys sit; only «−»
 *  skips there. «0» must not mean «javob bermadi»: 0 is the harshest answer, and a skip
 *  and a zero are different facts — one keeps the survey out of the mean, the other
 *  scores it at nothing. */
function onKey(e: KeyboardEvent) {
   if (!current.value || isSaved.value || importFor.value !== null) return
   const tag = (e.target as HTMLElement)?.tagName
   if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
   const k = focusKey.value
   if (!k) return
   const row: any = ROW_BY_KEY[k]
   if (!row) return
   const ten = row.type === 'scale10' || (row.type === 'scale' && scale.value === 10)
   if (ten && e.key >= '0' && e.key <= '9') {
      setAns(k, e.key === '0' ? 10 : Number(e.key)); e.preventDefault()
   } else if (ten && e.key === '-') {
      setAns(k, null); e.preventDefault()
   } else if (e.key >= '1' && e.key <= '5') {
      if (row.type === 'scale') setAns(k, Number(e.key))
      else if (Number(e.key) <= row.choices.length) setAns(k, row.choices[Number(e.key) - 1].v)
      e.preventDefault()
   } else if (e.key === '0' || e.key === '-') {
      setAns(k, null); e.preventDefault()
   } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      const keys = ALL_KEYS.value
      focusKey.value = keys[Math.min(keys.indexOf(k) + 1, keys.length - 1)]; e.preventDefault()
   } else if (e.key === 'ArrowUp') {
      const keys = ALL_KEYS.value
      focusKey.value = keys[Math.max(keys.indexOf(k) - 1, 0)]; e.preventDefault()
   }
}
// The highlighted row follows the keyboard down the page.
let skipRowScroll = false
watch(focusKey, (k) => {
   const skip = skipRowScroll
   skipRowScroll = false
   if (!k || skip) return
   nextTick(() => rowEls[k]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
})

// ── autosave: a dropped call must not lose ten answered questions ────────────
let draftTimer: any = null
watch([answers, reasons, problems, suggestion, choiceReason], () => {
   if (!current.value || isSaved.value) return
   draftState.value = 'saqlanmoqda…'
   clearTimeout(draftTimer)
   draftTimer = setTimeout(() => { void pushDraft() }, 800)
}, { deep: true })

async function pushDraft() {
   draftTimer = null
   if (!current.value) return
   const id = current.value.id
   try {
      await api.put(`/survey/${id}/draft`, {
         answers: { ...answers, _scale: scale.value }, problems: problems.value,
         suggestion: suggestion.value || null, choice_reason: choiceReason.value || null,
         reasons: Object.fromEntries(Object.entries(reasons).filter(([, v]) => (v || '').trim())),
      })
      if (current.value?.id === id) draftState.value = 'qoralama saqlandi'
   } catch {
      if (current.value?.id === id) draftState.value = 'qoralama saqlanmadi!'
   }
}

// null = not editing. A separate ref per field: fixing a name and fixing a number are
// different corrections and must not clear each other.
const editingName = ref<string | null>(null)
const editingPhone = ref<string | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)

function startEditName() {
   editingName.value = current.value?.full_name ?? ''
   nextTick(() => nameInput.value?.select())
}
function startEditPhone() {
   editingPhone.value = current.value?.phone ?? ''
}

/** Save a corrected field, or put it back. An UNCHANGED value is not a write — blur
 *  fires whenever focus moves. */
async function commitField(field: 'full_name' | 'phone', value: string | null,
                           done: () => void) {
   const p = current.value
   if (!p || value === null) return done()
   const next = value.trim()
   if (!next || next === (p as any)[field]) return done()
   try {
      const { data } = await api.put(`/survey/pilgrims/${p.id}`, { [field]: next })
      // Trust the SERVER's echo: it canonicalises the phone, and the screen must show
      // the number that will actually be dialled.
      p.full_name = data.full_name
      p.phone = data.phone
      done()
      await loadQueue()
   } catch (e: any) {
      // Left in edit mode on purpose: the correction is still on screen to fix.
      toast.error(errText(e, 'Saqlanmadi'))
   }
}
const commitName = () => commitField('full_name', editingName.value, () => { editingName.value = null })
const commitPhone = () => commitField('phone', editingPhone.value, () => { editingPhone.value = null })

/** Move this pilgrim to another group. Never to NO group — a pilgrim outside a group has
 *  no trip, no ellikboshi and nowhere in this panel to be seen. */
async function assignGroup() {
   if (!current.value || !pickedGroup.value) return
   try {
      await api.put(`/survey/pilgrims/${current.value.id}`, { chat_id: pickedGroup.value })
      current.value.chat_id = pickedGroup.value
      await loadQueue()
   } catch (e: any) {
      pickedGroup.value = current.value.chat_id ?? null
      toast.error(errText(e, "Guruh o'zgartirilmadi"))
   }
}

async function setStatus(k: string) {
   if (!current.value) return
   try {
      await api.put(`/survey/pilgrims/${current.value.id}`, { call_status: k })
      current.value.call_status = k
      await loadQueue()
   } catch (e: any) {
      toast.error(errText(e, "Holat saqlanmadi"))
   }
}

async function save() {
   if (!current.value) return
   // The reasons first — the server refuses the save without them anyway, and here the
   // specialist is taken to the first one still empty.
   if (missingReasons.value.length) {
      toast.error(`${missingReasons.value.length} ta past bahoga sabab yozing`)
      focusReason(missingReasons.value[0])
      return
   }
   saving.value = true
   try {
      // The server scores the DRAFT it holds. An answer given in the last 800 ms is
      // still waiting on the autosave timer — send it first, or it is scored without.
      if (draftTimer) { clearTimeout(draftTimer); await pushDraft() }
      const { data } = await api.post(`/survey/${current.value.id}/save`)
      isSaved.value = true
      savedScore.value = data.ell_score
      // The server marks the call done at save; the screen says the same.
      current.value.survey_status = 'saved'
      current.value.call_status = 'boldi'
      draftState.value = ''
      toast.success(data.ell_score === null
         ? "Saqlandi — Q1 to'liq emas, ellikboshi o'rtachasiga kirmaydi"
         : `Saqlandi — ${data.ell_score} ball → ${data.ellikboshi_username}`)
      await Promise.all([loadQueue(), loadGroups()])
   } catch (e: any) {
      const missing = e?.response?.data?.detail?.missing_reasons
      if (Array.isArray(missing) && missing.length) focusReason(missing[0])
      toast.error(errText(e, 'Saqlanmadi'))
   } finally { saving.value = false }
}

function logout() {
   auth.logout()
   router.push('/login')
}

function onEsc(e: KeyboardEvent) {
   if (e.key === 'Escape' && importFor.value !== null) closeImport()
}

onMounted(() => {
   void loadQueue(); void loadGroups()
   window.addEventListener('keydown', onKey)
   window.addEventListener('keydown', onEsc)
})
onUnmounted(() => {
   window.removeEventListener('keydown', onKey)
   window.removeEventListener('keydown', onEsc)
})
</script>

<style scoped>
/* ── tokens ── ETIHAD green and gold, on a warm paper ground. Colour that MEANS
   something is the answer band (red / amber / green) and nothing else. */
.sn-app {
   --bg: #f3f1eb;
   --card: #ffffff;
   --line: #e5e0d4;
   --line-soft: #eeeae0;
   --ink: #16241e;
   --ink-2: #47524c;
   --muted: #7a7567;
   --brand: #0f3d2e;
   --brand-2: #17573f;
   --brand-tint: #eaf2ee;
   --gold: #c9a14a;
   --gold-tint: #f7efdc;
   --bad: #c2362a;
   --bad-tint: #fcebe8;
   --mid: #c47a0c;
   --mid-tint: #fdf2df;
   --good: #1d7a51;
   --good-tint: #e6f3ec;
   --r-card: 16px;
   --r-ctl: 10px;
   --shadow: 0 1px 2px rgba(22, 36, 30, .05), 0 1px 1px rgba(22, 36, 30, .03);
   min-height: 100vh; background: var(--bg); color: var(--ink); font-size: 14px; line-height: 1.45;
}
/* Tailwind's reset makes every svg a block; these sit inside text. */
.sn-ico { flex-shrink: 0; display: inline-block; vertical-align: middle; }
.hidden { display: none; }

/* ── top bar ── */
.sn-top { position: sticky; top: 0; z-index: 20; height: 56px; padding: 0 20px; background: var(--brand);
   color: #fff; display: flex; align-items: center; gap: 16px; }
.sn-brand { display: flex; align-items: baseline; gap: 10px; }
.sn-brand-mark { font-size: 12px; font-weight: 800; letter-spacing: .18em; color: var(--gold); }
.sn-brand-name { font-size: 18px; font-weight: 700; letter-spacing: .01em; }
.sn-brand-sub { font-size: 13px; color: rgba(255, 255, 255, .62); }
.sn-topright { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.sn-topstat { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255, 255, 255, .85);
   background: rgba(255, 255, 255, .08); padding: 5px 10px; border-radius: 999px; }
.sn-topbtn { font: inherit; font-size: 13px; color: #fff; background: transparent; border: 1px solid rgba(255, 255, 255, .28);
   border-radius: 8px; padding: 5px 12px; cursor: pointer; }
.sn-topbtn:hover { background: rgba(255, 255, 255, .1); }

/* ── layout ── */
.sn-body { display: grid; grid-template-columns: 320px minmax(0, 1fr) 290px; gap: 16px; padding: 16px 20px 24px;
   align-items: start; max-width: 1640px; margin: 0 auto; }
.sn-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-card); box-shadow: var(--shadow); }
.sn-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.sn-muted { color: var(--muted); }
.sn-note { font-size: 12px; color: var(--muted); margin: 10px 0 0; }

/* ── sidebar ── */
.sn-side { position: sticky; top: 72px; max-height: calc(100vh - 88px); display: flex; flex-direction: column;
   background: var(--card); border: 1px solid var(--line); border-radius: var(--r-card); box-shadow: var(--shadow);
   overflow: hidden; }
.sn-search { display: flex; align-items: center; gap: 8px; margin: 12px 12px 4px; padding: 0 10px; height: 38px;
   border: 1px solid var(--line); border-radius: var(--r-ctl); background: #faf9f6; color: var(--muted); }
.sn-search:focus-within { border-color: var(--brand); background: #fff; box-shadow: 0 0 0 3px var(--brand-tint); }
.sn-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; color: var(--ink); }
.sn-side-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px 6px; }
.sn-side-count { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.sn-subhead { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted);
   padding: 10px 6px 4px; }
.sn-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 8px 10px; }
.sn-empty-note { font-size: 13px; color: var(--muted); padding: 14px 8px; text-align: center; }

.sn-gcard { width: 100%; display: flex; flex-direction: column; gap: 4px; text-align: left; font: inherit; color: inherit;
   background: none; border: 0; border-radius: 12px; padding: 10px 10px 11px; cursor: pointer; }
.sn-gcard + .sn-gcard { border-top: 1px solid var(--line-soft); border-top-left-radius: 0; border-top-right-radius: 0; }
.sn-gcard:hover { background: #f7f5f0; border-radius: 12px; }
.sn-gcard:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
.sn-gcard-top { display: flex; align-items: center; gap: 6px; }
.sn-gtitle { flex: 1; min-width: 0; font-weight: 650; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sn-chev { color: #b8b2a3; }
.sn-gmeta { font-size: 12px; color: var(--muted); }

/* Coverage: the bar carries a tick at 50% — the §10.3 line — and turns green past it. */
.sn-cover { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.sn-cover-bar { position: relative; flex: 1; height: 5px; border-radius: 3px; background: var(--line-soft); overflow: hidden; }
.sn-cover-bar i { position: absolute; inset: 0 auto 0 0; background: var(--gold); border-radius: 3px; transition: width .3s; }
.sn-cover-bar em { position: absolute; left: 50%; top: -1px; bottom: -1px; width: 1.5px; background: rgba(22, 36, 30, .28); }
.sn-cover.ok .sn-cover-bar i { background: var(--good); }
.sn-cover-num { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.sn-cover.ok .sn-cover-num { color: var(--good); font-weight: 650; }
.sn-cover-lg .sn-cover-bar { height: 6px; }

.sn-hit { width: 100%; display: flex; align-items: center; gap: 10px; text-align: left; font: inherit; color: inherit;
   background: none; border: 0; border-radius: 10px; padding: 7px 8px; cursor: pointer; }
.sn-hit:hover { background: #f7f5f0; }
.sn-hit-main { min-width: 0; display: flex; flex-direction: column; }
.sn-hit-main b { font-weight: 600; font-size: 13.5px; }
.sn-hit-main small { font-size: 12px; color: var(--muted); }

/* level 2 */
.sn-ghead { padding: 6px 16px 12px; border-bottom: 1px solid var(--line-soft); display: flex; flex-direction: column; gap: 6px; }
.sn-back { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 13px;
   font-weight: 600; color: var(--brand); background: none; border: 0; padding: 4px 6px 4px 0; cursor: pointer; }
.sn-back:hover { color: var(--brand-2); text-decoration: underline; }
.sn-back-mobile { display: none; }
.sn-ghead-title { font-size: 17px; font-weight: 700; margin: 0; line-height: 1.25; }
.sn-crm { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 9px; border-radius: 8px;
   background: #f6f5f1; color: var(--ink-2); }
.sn-crm.st-ok { background: var(--good-tint); color: var(--good); }
.sn-crm.st-warn { background: var(--mid-tint); color: #8a5408; }
.sn-crm.st-bad { background: var(--bad-tint); color: var(--bad); }
.sn-spin { animation: sn-spin 1s linear infinite; }
@keyframes sn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sn-spin { animation: none; } }
.sn-gtools { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }

.sn-chips { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 14px 4px; }
.sn-chip { font: inherit; font-size: 12px; font-weight: 600; color: var(--ink-2); background: #f6f5f1; border: 1px solid transparent;
   border-radius: 999px; padding: 4px 10px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.sn-chip em { font-style: normal; color: var(--muted); font-variant-numeric: tabular-nums; }
.sn-chip:hover { border-color: var(--line); }
.sn-chip.on { background: var(--brand); color: #fff; }
.sn-chip.on em { color: rgba(255, 255, 255, .75); }

.sn-prow { display: flex; align-items: center; border-radius: 10px; }
.sn-prow:hover { background: #f7f5f0; }
.sn-prow.on { background: var(--brand-tint); }
.sn-prow-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 8px 4px 8px 8px; cursor: pointer;
   user-select: text; border-radius: 10px; }
.sn-prow-main:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
.sn-prow-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sn-prow-text b { font-weight: 600; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sn-prow-text small { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.sn-prow.saved .sn-prow-text b { color: var(--ink-2); }
.sn-warn-text { color: #a25a0a !important; }
.sn-pstatus { font-size: 11px; font-weight: 600; color: var(--muted); white-space: nowrap; }
.sn-prow.saved .sn-pstatus { color: var(--good); }
.sn-pstatus.cs-qayta { color: #8a5408; }
.sn-prow-x { opacity: 0; }
.sn-prow:hover .sn-prow-x, .sn-prow-x:focus-visible { opacity: 1; }
.sn-prow-x:disabled { opacity: 0 !important; }

/* Status dot: grey = to call, amber = call back / draft, green = saved, muted = refused / no answer. */
.sn-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: #cfc9bb; }
.sn-dot.done { background: var(--good); }
.sn-dot.draft, .sn-dot.cs-qayta { background: var(--gold); }
.sn-dot.cs-javob_bermadi, .sn-dot.cs-bosh_tortdi { background: #9c968a; }

/* ── generic controls ── */
.sn-btn { font: inherit; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center;
   gap: 6px; height: 34px; padding: 0 14px; border-radius: var(--r-ctl); border: 1px solid var(--line); background: #fff;
   color: var(--ink); cursor: pointer; transition: background-color .12s, border-color .12s; white-space: nowrap; }
.sn-btn:hover:not(:disabled) { border-color: #cfc8b8; background: #faf9f6; }
.sn-btn:disabled { opacity: .5; cursor: default; }
.sn-btn-primary { background: var(--brand); border-color: var(--brand); color: #fff; }
.sn-btn-primary:hover:not(:disabled) { background: var(--brand-2); border-color: var(--brand-2); }
.sn-btn-soft { background: var(--brand-tint); border-color: transparent; color: var(--brand); }
.sn-btn-soft:hover:not(:disabled) { background: #dcebe3; border-color: transparent; }
.sn-btn-quiet { background: transparent; border-color: transparent; color: var(--muted); }
.sn-btn-quiet:hover:not(:disabled) { background: #f3f1ea; border-color: transparent; color: var(--ink); }
.sn-danger-hover:hover:not(:disabled) { color: var(--bad) !important; background: var(--bad-tint) !important; }
.sn-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex-shrink: 0;
   border: 0; border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer; }
.sn-iconbtn:hover:not(:disabled) { background: #f1efe8; color: var(--ink); }
.sn-iconbtn:disabled { cursor: default; }
.sn-mini { font: inherit; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;
   color: var(--ink-2); background: #f6f5f1; border: 0; border-radius: 7px; padding: 4px 8px; cursor: pointer;
   white-space: nowrap; }
.sn-mini:hover { background: #eceae2; color: var(--ink); }
.sn-link { font: inherit; font-size: 12px; background: none; border: 0; padding: 0; color: var(--muted);
   text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.sn-link:hover { color: var(--brand); }
.sn-link-danger:hover { color: var(--bad); }
.sn-input, .sn-select { width: 100%; font: inherit; color: var(--ink); padding: 8px 10px; border: 1px solid var(--line);
   border-radius: var(--r-ctl); background: #fff; }
.sn-input:focus, .sn-select:focus, .sn-reason textarea:focus { outline: 0; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-tint); }
.sn-input:disabled, .sn-select:disabled { background: #f7f6f2; color: var(--ink-2); }
textarea.sn-input { resize: vertical; min-height: 44px; }

/* ── main ── */
.sn-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.sn-person { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.sn-person-top { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
.sn-person-name { min-width: 0; flex: 1; }
.sn-person-name h1 { font-size: 22px; font-weight: 750; letter-spacing: -.01em; margin: 0 0 6px; line-height: 1.2; }
.sn-editable { cursor: text; }
.sn-pen { margin-left: 8px; color: #cbc4b4; vertical-align: -1px; transition: color .12s; }
.sn-editable:hover .sn-pen { color: var(--brand); }
.sn-h1input { font: inherit; font-size: 20px; font-weight: 700; width: 100%; border: 1px solid var(--brand); border-radius: 8px;
   padding: 3px 8px; margin-bottom: 6px; }
.sn-copyrow { display: flex; gap: 6px; flex-wrap: wrap; }
.sn-phone { display: flex; align-items: center; gap: 2px; }
.sn-phone-link { display: inline-flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; color: var(--brand);
   text-decoration: none; font-variant-numeric: tabular-nums; padding: 6px 12px; border-radius: 10px; background: var(--brand-tint); margin-right: 4px; }
.sn-phone-link:hover { background: #dcebe3; }
.sn-phone-none { font-size: 14px; font-weight: 600; color: #a25a0a; background: var(--mid-tint); padding: 6px 12px; border-radius: 10px; margin-right: 4px; }
.sn-phoneinput { width: 13rem; }

.sn-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 16px; margin: 0; padding: 12px 0 0;
   border-top: 1px solid var(--line-soft); }
.sn-fact { min-width: 0; }
.sn-fact-wide { grid-column: 1 / -1; }
.sn-fact dt { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
.sn-fact dd { margin: 0; font-size: 13.5px; font-weight: 550; overflow-wrap: anywhere; }
.sn-fact dd small { font-weight: 500; color: var(--muted); font-size: 11.5px; }
.sn-fact-wide dd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sn-fact-wide .sn-select { width: auto; min-width: 0; max-width: 100%; flex: 0 1 460px; padding: 6px 10px; }

.sn-banner { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 10px 12px; border-radius: 12px; }
.sn-banner-warn { background: var(--mid-tint); color: #7a4b07; }
.sn-banner-ok { background: var(--good-tint); color: #145c3c; }
.sn-banner-btn { margin-left: auto; height: 30px; }

.sn-callrow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.sn-callrow-del { margin-left: auto; }
.sn-seg { display: inline-flex; flex-wrap: wrap; background: #f3f1ea; border-radius: 11px; padding: 3px; gap: 2px; }
.sn-seg button { font: inherit; font-size: 13px; font-weight: 600; color: var(--ink-2); background: transparent; border: 0;
   border-radius: 8px; padding: 6px 12px; cursor: pointer; transition: background-color .12s, color .12s; }
.sn-seg button:hover:not(:disabled):not(.on) { background: rgba(255, 255, 255, .7); color: var(--ink); }
.sn-seg button.on { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, .08); }
.sn-seg button.on.cs-boldi { background: var(--good); color: #fff; }
.sn-seg button.on.cs-qayta { background: var(--gold); color: #fff; }
.sn-seg button:disabled { opacity: .45; cursor: default; }

/* legend */
.sn-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; font-size: 12px; color: var(--muted); padding: 0 4px; }
.sn-legend kbd { font: inherit; font-size: 11px; font-weight: 700; color: var(--ink-2); background: #fff; border: 1px solid var(--line);
   border-bottom-width: 2px; border-radius: 5px; padding: 0 5px; margin: 0 1px; }
.sn-legend-low { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
.sn-legend-low i { width: 22px; height: 8px; border-radius: 3px; background: linear-gradient(90deg, var(--bad) 0 60%, var(--mid) 60%); }

/* question cards */
.sn-qcard { padding: 14px 18px 16px; }
.sn-qhead { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.sn-qnum { width: 24px; height: 24px; border-radius: 7px; background: var(--gold-tint); color: #8d6a1c; font-size: 12px; font-weight: 800;
   display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.sn-qtitle { font-size: 15px; font-weight: 700; margin: 0; flex: 1; min-width: 0; }
.sn-tag { font-size: 11px; font-weight: 600; color: var(--muted); background: #f4f2ec; border-radius: 999px; padding: 3px 9px; white-space: nowrap; }
.sn-tag-kpi { color: var(--good); background: var(--good-tint); }

.sn-row { margin: 0 -10px; padding: 8px 10px; border-radius: 12px; position: relative; transition: background-color .12s; }
.sn-row + .sn-row { margin-top: 2px; }
.sn-row.focus { background: #faf7ef; }
.sn-row.focus::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 2px; background: var(--gold); }
.sn-row-main { display: flex; align-items: center; gap: 12px 16px; flex-wrap: wrap; }
.sn-row-label { flex: 1 1 220px; min-width: 0; font-size: 14px; font-weight: 550; }
.sn-row-label small { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin-top: 1px; }
.sn-row-ctrl { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* The answer strip: one connected control; the chosen value takes its band colour. */
.sn-strip { display: inline-flex; background: var(--line); gap: 1px; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.sn-strip button { font: inherit; font-size: 13px; font-weight: 650; min-width: 34px; height: 34px; padding: 0 8px; border: 0;
   background: #fff; color: var(--ink-2); cursor: pointer; font-variant-numeric: tabular-nums; transition: background-color .1s, color .1s; }
.sn-strip-10 button { min-width: 32px; padding: 0 4px; }
.sn-strip button:hover:not(:disabled):not(.sel) { background: #f5f3ed; color: var(--ink); }
.sn-strip button:disabled { cursor: default; }
.sn-strip button.sel { color: #fff; }
.sn-strip button.sel.bad { background: var(--bad); }
.sn-strip button.sel.mid { background: var(--mid); }
.sn-strip button.sel.good { background: var(--good); }
.sn-strip button.sel.neutral { background: var(--brand); }
.sn-strip-choice button { min-width: 64px; padding: 0 14px; }
.sn-skip { font: inherit; font-weight: 700; width: 34px; height: 34px; border: 1px dashed #cfc8b8; border-radius: 10px; background: transparent;
   color: var(--muted); cursor: pointer; }
.sn-skip:hover:not(:disabled) { border-style: solid; color: var(--ink); }
.sn-skip.sel { background: #8e897c; border-color: #8e897c; border-style: solid; color: #fff; }
.sn-skip:disabled { cursor: default; }

/* The reason under a low answer: red while empty, calm once written. */
.sn-reason { margin-top: 8px; padding: 10px 12px; border-radius: 10px; background: #faf8f3; border: 1px solid var(--line-soft);
   border-left: 3px solid var(--mid); display: flex; flex-direction: column; gap: 6px; }
.sn-reason.missing { background: var(--bad-tint); border-color: #f4cdc7; border-left-color: var(--bad); }
.sn-reason label { font-size: 12.5px; font-weight: 650; color: var(--ink-2); display: flex; align-items: center; gap: 8px; }
.sn-req { font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--bad); }
.sn-reason:not(.missing) .sn-req { color: var(--muted); }
.sn-reason textarea { width: 100%; font: inherit; font-size: 13.5px; color: var(--ink); padding: 8px 10px; border: 1px solid var(--line);
   border-radius: 8px; background: #fff; resize: vertical; min-height: 40px; }
.sn-reason textarea:disabled { background: transparent; border-color: transparent; padding: 0; resize: none; min-height: 0; }

/* problems */
.sn-prob { border: 1px solid var(--line-soft); border-radius: 12px; padding: 12px; margin: 8px 0 10px; background: #fcfbf8; }
.sn-prob-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 8px; }
.sn-prob-grid label { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
   display: flex; flex-direction: column; gap: 4px; }
.sn-prob-grid .sn-select { text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 13.5px; padding: 6px 8px; }
.sn-prob-text { display: flex; gap: 6px; align-items: center; }
.sn-qcard > .sn-btn-soft { margin-top: 6px; }

/* save bar */
.sn-savebar { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
   padding: 10px 12px 10px 18px; background: rgba(255, 255, 255, .96); backdrop-filter: blur(6px);
   border: 1px solid var(--line); border-radius: var(--r-card); box-shadow: 0 8px 24px rgba(22, 36, 30, .1); }
.sn-progress { display: flex; align-items: center; gap: 10px; min-width: 150px; }
.sn-progress-num { font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
.sn-progress-num b { color: var(--ink); }
.sn-progress-bar { width: 90px; height: 5px; border-radius: 3px; background: var(--line-soft); overflow: hidden; }
.sn-progress-bar i { display: block; height: 100%; background: var(--brand); border-radius: 3px; transition: width .25s; }
.sn-missing { font: inherit; font-size: 13px; font-weight: 650; display: inline-flex; align-items: center; gap: 6px; color: var(--bad);
   background: var(--bad-tint); border: 0; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.sn-missing:hover { text-decoration: underline; }
.sn-draft { font-size: 12px; color: var(--muted); }
.sn-draft.bad { color: var(--bad); font-weight: 600; }
.sn-savebar-end { margin-left: auto; display: flex; align-items: center; gap: 14px; }
.sn-savebar-ell { font-size: 13px; color: var(--muted); display: none; white-space: nowrap; }
.sn-savebar-ell b { color: var(--ink); font-variant-numeric: tabular-nums; }
.sn-btn-lg { height: 38px; padding: 0 18px; font-size: 14px; }

/* empty main */
.sn-main-empty { align-self: stretch; }
.sn-welcome { padding: 40px 36px; max-width: 520px; margin: 40px auto; text-align: left; }
.sn-welcome h2 { font-size: 20px; margin: 0 0 14px; }
.sn-welcome ol { margin: 0 0 14px; padding-left: 20px; list-style: decimal; display: flex; flex-direction: column; gap: 8px; color: var(--ink-2); }
.sn-welcome b { color: var(--ink); }

/* ── summary aside ── */
.sn-sum { position: sticky; top: 72px; display: flex; flex-direction: column; gap: 12px; }
.sn-sum .sn-card { padding: 16px; }
.sn-bignum { font-size: 40px; font-weight: 800; line-height: 1; margin: 8px 0 0; font-variant-numeric: tabular-nums; color: var(--ink); }
.sn-bignum small { font-size: 14px; color: var(--muted); font-weight: 600; margin-left: 2px; }
.sn-bignum.good { color: var(--good); } .sn-bignum.mid { color: var(--mid); } .sn-bignum.bad { color: var(--bad); }
.sn-bar { height: 6px; border-radius: 3px; background: var(--line-soft); overflow: hidden; margin: 10px 0 8px; }
.sn-bar i { display: block; height: 100%; border-radius: 3px; background: var(--brand); transition: width .3s; }
.sn-bar.good i { background: var(--good); } .sn-bar.mid i { background: var(--mid); } .sn-bar.bad i { background: var(--bad); }
.sn-brk { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; padding: 6px 0; border-top: 1px solid var(--line-soft); }
.sn-brk span:first-child { color: var(--ink-2); }
.sn-brk span:last-child { font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sn-brk.neg span:last-child { color: var(--bad); }
.sn-aff { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid var(--line-soft); font-size: 13px; }
.sn-sum .sn-eyebrow + .sn-aff { border-top: 0; margin-top: 4px; }
.sn-aff-label { min-width: 0; color: var(--ink-2); overflow-wrap: anywhere; }
.sn-aff-val { font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sn-aff-val.good { background: var(--good-tint); color: var(--good); }
.sn-aff-val.mid { background: var(--mid-tint); color: #8a5408; }
.sn-aff-val.bad { background: var(--bad-tint); color: var(--bad); }
.sn-aff-val.neutral { background: #f1efe8; color: var(--ink-2); }

/* ── import dialog ── */
.sn-modal { position: fixed; inset: 0; z-index: 50; background: rgba(15, 28, 22, .38); display: flex; align-items: flex-start;
   justify-content: center; padding: 8vh 16px 16px; overflow-y: auto; }
.sn-modal-card { width: 100%; max-width: 520px; background: #fff; border-radius: 18px; padding: 18px 20px 16px;
   box-shadow: 0 24px 60px rgba(15, 28, 22, .25); display: flex; flex-direction: column; gap: 12px; }
.sn-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.sn-modal-head h2 { font-size: 17px; margin: 0; }
.sn-modal-head p { margin: 2px 0 0; font-size: 13px; }
.sn-tabs { display: inline-flex; background: #f3f1ea; border-radius: 11px; padding: 3px; gap: 2px; align-self: flex-start; }
.sn-tabs button { font: inherit; font-size: 13px; font-weight: 600; color: var(--ink-2); background: transparent; border: 0; border-radius: 8px;
   padding: 6px 14px; cursor: pointer; }
.sn-tabs button.on { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, .08); }
.sn-drop { font: inherit; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 22px 16px; border: 1.5px dashed #cfc8b8;
   border-radius: 14px; background: #fbfaf7; color: var(--ink-2); cursor: pointer; text-align: center; }
.sn-drop:hover:not(:disabled) { border-color: var(--brand); background: var(--brand-tint); color: var(--brand); }
.sn-drop small { font-size: 12px; color: var(--muted); }
.sn-report { display: flex; flex-direction: column; gap: 6px; }
.sn-report-counts { display: flex; flex-wrap: wrap; gap: 6px; }
.sn-report-counts span { font-size: 12.5px; padding: 3px 9px; border-radius: 999px; background: var(--good-tint); color: var(--good); }
.sn-report-counts span.warn { background: var(--mid-tint); color: #8a5408; }
.sn-report-counts span.bad { background: var(--bad-tint); color: var(--bad); }
.sn-plist { max-height: 240px; overflow-y: auto; border: 1px solid var(--line-soft); border-radius: 10px; }
.sn-plist-row { display: grid; grid-template-columns: 30px 1fr auto; gap: 8px; padding: 5px 10px; border-bottom: 1px solid var(--line-soft);
   align-items: baseline; font-size: 13px; }
.sn-plist-row:last-child { border-bottom: 0; }
.sn-plist-row small { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
/* Every non-ok row is tinted, so a shifted paste shows as a block of colour. */
.sn-plist-row.st-no_phone { background: var(--mid-tint); }
.sn-plist-row.st-bad_phone, .sn-plist-row.st-no_name, .sn-plist-row.st-short_row { background: var(--bad-tint); }
.sn-plist-row.st-header { opacity: .5; }
.sn-field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 700; color: var(--ink-2); }
.sn-field small { font-weight: 500; color: var(--muted); }
.sn-field .sn-input { font-weight: 400; font-size: 14px; }
.sn-modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }

/* ── narrower screens ── */
/* Below 1360 the summary column goes; the save bar keeps the one number from it. */
@media (max-width: 1359px) {
   .sn-body { grid-template-columns: 300px minmax(0, 1fr); }
   .sn-sum { display: none; }
   .sn-savebar-ell { display: inline; }
}
@media (max-width: 1000px) {
   .sn-brand-sub { display: none; }
   .sn-body { grid-template-columns: 1fr; padding: 12px; }
   .sn-side { position: static; max-height: none; }
   .sn-scroll { max-height: none; }
   /* One screen at a time: the list, or the pilgrim with a way back to it. */
   .sn-body.has-current .sn-side { display: none; }
   .sn-back-mobile { display: inline-flex; }
   .sn-facts { grid-template-columns: 1fr 1fr; }
   .sn-prob-grid { grid-template-columns: 1fr; }
   .sn-legend-low { margin-left: 0; }
}
@media (max-width: 560px) {
   .sn-top { padding: 0 12px; }
   .sn-topstat { display: none; }
   .sn-person { padding: 14px; }
   .sn-qcard { padding: 12px 14px 14px; }
   .sn-facts { grid-template-columns: 1fr; }
   .sn-strip-10 button { min-width: 0; flex: 1; padding: 0; }
   .sn-strip-10 { display: flex; width: 100%; }
   .sn-row-ctrl { width: 100%; }
   .sn-row-ctrl .sn-strip-10 { flex: 1; }
   .sn-savebar { gap: 8px; padding: 8px 8px 8px 12px; }
   .sn-savebar-ell, .sn-progress-bar { display: none !important; }
   .sn-progress { min-width: 0; }
}
</style>

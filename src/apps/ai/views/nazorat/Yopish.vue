<template>
   <div class="space-y-3">
      <!-- §13 — the month is closed on the 1st of the following month, and what is
           written down is what everybody is paid. Until this screen existed the freeze
           was an endpoint nobody could reach: the arithmetic was ready, the button was
           not (found 2026-08-20). -->

      <!-- WHICH MONTH. Twelve back is enough for any correction anyone will make, and a
           month that is already closed says so on its own chip, so the reader never has
           to open one to find out. -->
      <div class="no-bar flex gap-2 overflow-x-auto -mx-5 px-5 py-0.5 lg:mx-0 lg:px-0">
         <button v-for="m in months" :key="m.period" class="fchip shrink-0"
            :class="period === m.period ? 'is-on' : ''" @click="period = m.period">
            {{ m.label }}
            <span v-if="m.revision" class="fchip-n">r{{ m.revision }}</span>
         </button>
      </div>

      <!-- THE STATE OF THIS MONTH, in one card: is it closed, on which revision, by whom
           — and the one button that changes it. -->
      <section class="card p-5 space-y-3">
         <div class="flex items-baseline gap-2.5">
            <h3 class="n-h">{{ monthLabel(period) }}</h3>
            <span class="ml-auto badge" :class="current ? 'badge-indigo' : 'badge-amber'">
               {{ current ? `Yopilgan · reviziya ${current.revision}` : 'Yopilmagan' }}
            </span>
         </div>

         <p v-if="current" class="text-[13.5px] text-[color:var(--n-muted)]">
            {{ fmtDateTime(current.frozen_at) }} · {{ current.frozen_by || '—' }} ·
            {{ current.rows }} kishi · {{ money(current.payout_total) }} so'm
         </p>
         <p v-else-if="!monthOver" class="text-[13.5px] text-[color:var(--n-muted)]">
            Oy hali tugamagan. Yopish keyingi oyning 1-sanasidan boshlab mumkin —
            tugamagan oyni yopish qolgan kunlar rad etadigan oylikni yozib qo'yish
            bo'lardi.
         </p>
         <p v-else class="text-[13.5px] text-[color:var(--n-muted)]">
            Bu oy hali yozib qo'yilmagan. Yopilgunicha har bir raqam jonli hisobdan
            o'qiladi va kartochka o'zgarsa o'zi ham o'zgaradi.
         </p>

         <!-- A re-freeze is a CORRECTION and the server refuses it without a reason, so
              the reason is asked here rather than after a rejected save. -->
         <input v-if="current" v-model="comment" type="text" maxlength="200"
            placeholder="Qayta yopish sababi — majburiy"
            class="w-full px-2.5 py-2 rounded-lg border border-[color:var(--n-line,rgba(0,0,0,0.15))] bg-transparent text-[13.5px]" />

         <div class="flex flex-wrap gap-2">
            <button class="btn-primary text-[13.5px]"
               :disabled="busy || !monthOver || (!!current && !comment.trim())"
               @click="freeze">
               {{ busy ? 'Yozilmoqda…' : current ? 'Qayta yopish' : 'Oyni yopish' }}
            </button>
            <button v-if="current" class="btn-ghost text-[13.5px]" :disabled="busy"
               @click="download()">
               Buxgalteriya fayli (CSV)
            </button>
         </div>

         <p v-if="current" class="text-[12.5px] text-[color:var(--n-faint)]">
            Qayta yopish hech narsani o'chirmaydi: yangi reviziya yoziladi, eskisi
            qanday bo'lsa shundayligicha qoladi — chunki odamlarga aynan o'sha raqam
            bo'yicha to'langan.
         </p>
      </section>

      <!-- THE HISTORY. Every revision of every month, newest first — with the reason,
           which is the whole point of keeping them. -->
      <section class="card overflow-hidden">
         <div class="px-5 pt-4 pb-2">
            <h3 class="n-h">Yopish tarixi</h3>
         </div>
         <div v-if="s.snapshotsLoading" class="px-5 pb-5 text-[13.5px] text-[color:var(--n-muted)]">
            Yuklanmoqda…
         </div>
         <div v-else-if="!s.snapshots.length"
            class="px-5 pb-6 text-[13.5px] text-[color:var(--n-muted)]">
            Hali birorta oy yopilmagan.
         </div>
         <div v-else class="divide-y divide-gray-100">
            <button v-for="r in s.snapshots" :key="r.period + '-' + r.revision" type="button"
               class="row-tap w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
               @click="openRevision(r)">
               <span class="min-w-0 flex-1">
                  <span class="text-[15px] font-semibold tracking-[-0.015em]">
                     {{ monthLabel(r.period) }} · r{{ r.revision }}
                  </span>
                  <span class="block text-[12.5px] text-[color:var(--n-muted)] truncate">
                     {{ fmtDateTime(r.frozen_at) }} · {{ r.frozen_by || '—' }}
                     <template v-if="r.comment"> · {{ r.comment }}</template>
                  </span>
               </span>
               <span class="text-[13px] text-[color:var(--n-muted)] shrink-0 tabular-nums">
                  {{ r.rows }} kishi
               </span>
               <font-awesome-icon
                  :icon="openKey === r.period + '-' + r.revision ? 'chevron-down' : 'chevron-right'"
                  class="w-3 h-3 text-[color:var(--n-faint)] shrink-0" />
            </button>
         </div>

         <!-- One revision's rows: the payslips exactly as they were written down. Read
              from the SNAPSHOT, never recomputed — that is what a frozen month is. -->
         <div v-if="openKey" class="border-t border-gray-100 px-5 py-4">
            <div v-if="rowsLoading" class="text-[13.5px] text-[color:var(--n-muted)]">
               Yuklanmoqda…
            </div>
            <template v-else>
               <div class="overflow-x-auto -mx-5 px-5">
                  <table class="w-full text-[13px] tabular-nums">
                     <thead class="text-[color:var(--n-muted)] text-left">
                        <tr>
                           <th class="font-medium pb-1.5 pr-3">Kim</th>
                           <th class="font-medium pb-1.5 pr-3 text-right">Ball</th>
                           <th class="font-medium pb-1.5 pr-3 text-right">Fiks</th>
                           <th class="font-medium pb-1.5 pr-3 text-right">KPI</th>
                           <th class="font-medium pb-1.5 text-right">Oylik</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="w in rows" :key="w.id" class="border-t border-gray-100">
                           <td class="py-1.5 pr-3">
                              <span class="font-medium">{{ w.name || w.username || '—' }}</span>
                              <span v-if="w.best" title="Oyning ellikboshisi"> ★</span>
                              <span class="block text-[12px] text-[color:var(--n-faint)]">
                                 {{ w.category_title || '—' }}
                              </span>
                           </td>
                           <td class="py-1.5 pr-3 text-right">{{ w.quality_rating ?? '—' }}</td>
                           <td class="py-1.5 pr-3 text-right">{{ money(w.fiks) }}</td>
                           <td class="py-1.5 pr-3 text-right"
                              :class="(w.kpi_amount || 0) < 0 ? 'text-red-600' : ''">
                              {{ w.kpi_amount === null ? '—' : money(w.kpi_amount) }}
                           </td>
                           <td class="py-1.5 text-right font-semibold">{{ money(w.payout_total) }}</td>
                        </tr>
                     </tbody>
                  </table>
               </div>
               <button class="btn-ghost mt-3 text-[13px]" @click="download(openPeriod, openRev)">
                  Shu reviziyani CSV qilib olish
               </button>
            </template>
         </div>
      </section>
   </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNazoratStore, type SnapshotRevision } from '../../stores/nazorat'
import { fmtDateTime } from './shared'
import { useToast } from '../../../../composables/useToast'

const s = useNazoratStore()
const toast = useToast()

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul',
   'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

function monthLabel(p: string): string {
   const [y, m] = (p || '').split('-')
   return `${UZ_MONTHS[Number(m) - 1] || m} ${y}`
}

function money(v: number | null | undefined): string {
   if (v === null || v === undefined) return '—'
   return new Intl.NumberFormat('ru-RU').format(v)
}

/** The last twelve months, newest first — «which month am I closing» has to be a list,
 *  not a date field: a typed «2026-13» is a rejected save, and a typed «2026-06» when
 *  you meant «2026-07» is a correction to somebody's pay. */
const months = computed(() => {
   const now = new Date()
   const out: { period: string; label: string; revision: number | null }[] = []
   for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const rev = s.snapshots.filter((r) => r.period === period)
         .reduce((mx, r) => Math.max(mx, r.revision), 0)
      out.push({ period, label: monthLabel(period), revision: rev || null })
   }
   return out
})

/** Defaults to the month that is actually due for closing — the previous one — because
 *  that is what somebody opening this screen on the 1st came to do. */
function prevPeriod(): string {
   const d = new Date()
   d.setDate(1)
   d.setMonth(d.getMonth() - 1)
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const period = ref(prevPeriod())
const comment = ref('')
const busy = ref(false)

/** The revision in force for the selected month, or null if it was never closed. */
const current = computed<SnapshotRevision | null>(() =>
   s.snapshots.filter((r) => r.period === period.value)
      .sort((a, b) => b.revision - a.revision)[0] || null)

/** Is the month over? The same test the server makes — it refuses an unfinished month
 *  outright — so the button is disabled with the reason on screen instead of being
 *  pressed into a 409. */
const monthOver = computed(() => {
   const [y, m] = period.value.split('-').map(Number)
   return new Date() >= new Date(y, m, 1)
})

watch(period, () => {
   comment.value = ''
   openKey.value = ''
})

async function freeze() {
   busy.value = true
   const res = await s.freezeMonth(period.value, comment.value.trim() || undefined)
   busy.value = false
   if (!res.ok) return toast.error(res.error || 'Yopilmadi')
   comment.value = ''
   toast.success(`${monthLabel(period.value)} yopildi — reviziya ${res.revision}, ${res.rows} kishi`)
}

// The revision whose rows are open, and the rows themselves.
const openKey = ref('')
const openPeriod = ref('')
const openRev = ref<number | undefined>(undefined)
const rows = ref<any[]>([])
const rowsLoading = ref(false)

async function openRevision(r: SnapshotRevision) {
   const key = `${r.period}-${r.revision}`
   if (openKey.value === key) {
      openKey.value = ''
      return
   }
   openKey.value = key
   openPeriod.value = r.period
   openRev.value = r.revision
   rowsLoading.value = true
   try {
      const data = await s.loadSnapshotRows(r.period, r.revision)
      rows.value = data.rows || []
   } catch {
      rows.value = []
      toast.error('Reviziya o\'qilmadi')
   } finally {
      rowsLoading.value = false
   }
}

async function download(p?: string, rev?: number) {
   try {
      await s.exportSnapshot(p || period.value, rev)
   } catch {
      toast.error('Fayl yuklanmadi')
   }
}

onMounted(() => { void s.loadSnapshots() })
</script>

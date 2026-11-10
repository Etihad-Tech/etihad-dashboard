import { computed, ref, type Ref } from 'vue'

// Ticking rows for one action on many (owner, 2026-11-10: «comfortable select»): a tick
// toggles one row, Shift + tick ticks every row between it and the last one ticked, a
// group's own tick (a day, «all shown») ticks or clears that whole group. The order is
// the order the rows are SHOWN in, so a range is what the eye sees between two ticks.
export function useSelection<K extends string | number>(shown: Ref<K[]>) {
  const picked = ref(new Set<K>()) as Ref<Set<K>>
  let anchor: K | null = null

  function toggle(id: K, ev?: MouseEvent | KeyboardEvent) {
    const next = new Set(picked.value)
    if (ev?.shiftKey && anchor !== null) {
      const order = shown.value
      const a = order.indexOf(anchor)
      const b = order.indexOf(id)
      if (a !== -1 && b !== -1) {
        const on = !picked.value.has(id)
        for (const k of order.slice(Math.min(a, b), Math.max(a, b) + 1)) {
          if (on) next.add(k)
          else next.delete(k)
        }
        picked.value = next
        anchor = id
        return
      }
    }
    if (next.has(id)) next.delete(id)
    else next.add(id)
    picked.value = next
    anchor = id
  }

  /** Tick every id of a group, or clear them all when they already are ticked. */
  function toggleGroup(ids: K[]) {
    const next = new Set(picked.value)
    const all = ids.length > 0 && ids.every(k => next.has(k))
    for (const k of ids) {
      if (all) next.delete(k)
      else next.add(k)
    }
    picked.value = next
  }

  const groupState = (ids: K[]): 'all' | 'some' | 'none' => {
    const n = ids.filter(k => picked.value.has(k)).length
    return n === 0 ? 'none' : n === ids.length ? 'all' : 'some'
  }

  function clear() {
    picked.value = new Set()
    anchor = null
  }

  /** Keep only ids still shown (after a filter change or a reload). */
  function prune() {
    const keep = new Set(shown.value)
    const next = new Set([...picked.value].filter(k => keep.has(k)))
    if (next.size !== picked.value.size) picked.value = next
  }

  const ids = computed(() => shown.value.filter(k => picked.value.has(k)))
  const count = computed(() => ids.value.length)
  const has = (id: K) => picked.value.has(id)

  return { toggle, toggleGroup, groupState, clear, prune, ids, count, has }
}

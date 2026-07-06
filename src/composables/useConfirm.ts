import { reactive, readonly } from 'vue'

export interface ConfirmOptions {
  /** Heading, e.g. "Savolni o'chirish". */
  title?: string
  /** Sub-text under the heading. */
  message?: string
  /** Label of the confirming (red) button. */
  confirmText?: string
  /** Label of the dismissing button. */
  cancelText?: string
}

interface ConfirmState extends Required<ConfirmOptions> {
  visible: boolean
}

// A single, module-level dialog state shared by every caller. One global
// <ConfirmDialog/> (mounted in App.vue) renders it, so any page can just await
// a confirmation instead of hand-rolling its own modal + refs:
//
//   const { confirm } = useConfirm()
//   if (!(await confirm({ title: "Savolni o'chirish" }))) return
//   await api.delete(...)
//
// Defaults are the destructive-delete wording the dashboard already used, so a
// bare confirm() reads as "O'chirish / Bu amalni ortga qaytarib bo'lmaydi".
const state = reactive<ConfirmState>({
  visible: false,
  title: "O'chirish",
  message: "Bu amalni ortga qaytarib bo'lmaydi",
  confirmText: "O'chirish",
  cancelText: 'Bekor qilish',
})

let resolver: ((value: boolean) => void) | null = null

function confirm(opts: ConfirmOptions = {}): Promise<boolean> {
  // If a prompt is somehow already open, treat it as cancelled before reopening.
  resolver?.(false)
  state.title = opts.title ?? "O'chirish"
  state.message = opts.message ?? "Bu amalni ortga qaytarib bo'lmaydi"
  state.confirmText = opts.confirmText ?? "O'chirish"
  state.cancelText = opts.cancelText ?? 'Bekor qilish'
  state.visible = true
  return new Promise<boolean>(resolve => { resolver = resolve })
}

export function useConfirm() {
  return { confirm }
}

// --- internal wiring for the host component only ---
export const confirmState = readonly(state)
export function _settleConfirm(value: boolean) {
  if (!state.visible) return
  state.visible = false
  const resolve = resolver
  resolver = null
  resolve?.(value)
}

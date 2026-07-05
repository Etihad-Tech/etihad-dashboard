import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  text: string
  type: ToastType
}

// Module-level toast stack, rendered by one global <ToastHost/> (App.vue). Any
// page gives feedback after a CRUD action without wiring up its own UI:
//
//   const toast = useToast()
//   toast.success('Saqlandi')
//   toast.error('Xatolik yuz berdi')
const toasts = reactive<Toast[]>([])
let seq = 0

function push(text: string, type: ToastType, ms = 3000): number {
  const id = ++seq
  toasts.push({ id, text, type })
  window.setTimeout(() => dismissToast(id), ms)
  return id
}

export function dismissToast(id: number) {
  const i = toasts.findIndex(t => t.id === id)
  if (i !== -1) toasts.splice(i, 1)
}

export function useToast() {
  return {
    success: (text: string) => push(text, 'success'),
    error: (text: string) => push(text, 'error'),
    info: (text: string) => push(text, 'info'),
  }
}

// --- internal wiring for the host component only ---
export const toastList = toasts

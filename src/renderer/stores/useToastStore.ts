import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>(set => ({
  toasts: [],
  addToast: toast => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }

    set(state => ({ toasts: [...state.toasts, newToast] }))

    if (toast.duration !== Infinity) {
      setTimeout(() => {
        set(state => ({
          toasts: state.toasts.filter(t => t.id !== id),
        }))
      }, toast.duration || 3000)
    }
  },
  dismissToast: id =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}))

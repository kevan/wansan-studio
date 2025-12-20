import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  dismissToast: (id: string) => void
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error?: string | ((err: any) => string)
    }
  ) => Promise<T>
}

export const useToastStore = create<ToastState>((set, get) => ({
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
    return id
  },
  dismissToast: id =>
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  promise: async (promiseOrFunction, messages) => {
    const id = get().addToast({
      title: messages.loading,
      type: 'info',
      duration: Infinity,
    })

    try {
      const promise =
        typeof promiseOrFunction === 'function'
          ? promiseOrFunction()
          : promiseOrFunction
      const result = await promise
      get().dismissToast(id)
      
      const successTitle =
        typeof messages.success === 'function'
          ? messages.success(result)
          : messages.success
      
      get().addToast({
        title: successTitle,
        type: 'success',
        duration: 2000,
      })
      
      return result
    } catch (error) {
      get().dismissToast(id)
      
      let errorTitle = String(error)
      if (messages.error) {
        errorTitle =
          typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error
      }
      
      get().addToast({
        title: errorTitle,
        type: 'error',
      })
      throw error
    }
  },
}))

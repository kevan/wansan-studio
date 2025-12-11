import { useCallback } from 'react'
import { useToastStore, type ToastType } from '@/stores/useToastStore'

type ToastInput = {
  title: string
  description?: string
  duration?: number
  type?: ToastType
}

export function useToast() {
  const addToast = useToastStore(state => state.addToast)
  const dismissToast = useToastStore(state => state.dismissToast)

  const toast = useCallback(
    (input: ToastInput) =>
      addToast({
        title: input.title,
        description: input.description,
        duration: input.duration,
        type: input.type ?? 'info',
      }),
    [addToast]
  )

  return {
    toast,
    dismiss: dismissToast,
  }
}

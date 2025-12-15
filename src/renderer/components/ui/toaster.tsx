import { useMemo } from 'react'
import { X, CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useToastStore } from '@/stores/useToastStore'

const iconMap = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <AlertCircle className="h-4 w-4 text-rose-500" />,
} as const

export function Toaster() {
  const toasts = useToastStore(state => state.toasts)
  const dismissToast = useToastStore(state => state.dismissToast)

  const visibleToasts = useMemo(() => [...toasts].reverse(), [toasts])

  if (visibleToasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end justify-end px-4 py-6 sm:p-6">
      <div className="flex w-full flex-col items-end space-y-3">
        {visibleToasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 bg-white/95 transition-all duration-200',
              'border-zinc-200 shadow-zinc-200/70'
            )}
            role="alert"
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="flex-shrink-0 pt-0.5">{iconMap[toast.type]}</div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-zinc-900">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-1 text-xs text-zinc-600">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

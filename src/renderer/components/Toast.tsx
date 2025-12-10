import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore, Toast as ToastType } from '../stores/useToastStore'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
}

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismissToast } = useToastStore()

  return (
    <div
      className={`
        pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/50 dark:border-zinc-800 shadow-xl backdrop-blur-md
        transform transition-all duration-300 ease-in-out
        animate-card-enter mb-3
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{icons[toast.type]}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {toast.title}
            </p>
            {toast.description && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {toast.description}
              </p>
            )}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-lg bg-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => dismissToast(toast.id)}
            >
              <span className="sr-only">Close</span>
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex flex-col items-center justify-start px-4 py-6 sm:p-6 z-[99999]"
    >
      <div className="flex w-full flex-col items-center space-y-4">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { useLogStore } from '../../stores/useLogStore' // Adjust path

export function GlobalErrorHandler() {
  const addLog = useLogStore(s => s.addLog)

  useEffect(() => {
    // 1. JS Errors
    const handleError = (event: ErrorEvent) => {
      void addLog({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
      })
    }

    // 2. Promise Rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      void addLog({
        type: 'error',
        message: `Unhandled Rejection: ${event.reason?.message || event.reason}`,
        stack: event.reason?.stack,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [addLog]) // addLog should be in dependency array

  return null
}

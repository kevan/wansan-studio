import { useEffect } from 'react'
import { useProjectStore } from '../stores/useProjectStore'

export function useAutoCleanup() {
  const cleanup = useProjectStore(s => s.cleanupZombieFiles)

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Trigger cleanup synchronously
      cleanup()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [cleanup])
}

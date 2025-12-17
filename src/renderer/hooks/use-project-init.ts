import { useEffect } from 'react'
import { useProjectStore } from '../stores/useProjectStore'

export function useProjectInit() {
  const sessions = useProjectStore(state => state.sessions)
  const createSession = useProjectStore(state => state.createSession)

  useEffect(() => {
    // Initialize default session if none exists
    if (sessions.length === 0) {
      console.log('[ProjectInit] Creating default session')
      createSession()
    }
  }, [sessions.length, createSession])
}

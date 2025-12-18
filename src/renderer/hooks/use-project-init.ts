import { useEffect, useRef } from 'react'
import { useProjectStore } from '../stores/useProjectStore'

export function useProjectInit() {
  const sessions = useProjectStore(state => state.sessions)
  const createSession = useProjectStore(state => state.createSession)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Initialize default session if none exists
    if (sessions.length === 0 && !initializedRef.current) {
      console.log('[ProjectInit] Creating default session')
      initializedRef.current = true
      createSession()
    }
  }, [sessions.length, createSession])
}

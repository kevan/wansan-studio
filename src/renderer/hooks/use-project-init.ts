import { useEffect, useRef } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useProjectIO } from './useProjectIO'

import { useSettingsStore } from '../stores/useSettingsStore'

export function useProjectInit() {
  const sessions = useProjectStore(state => state.sessions)
  const currentProjectPath = useProjectStore(state => state.currentProjectPath)
  const setProjectPath = useProjectStore(state => state.setProjectPath)
  const isProjectLoaded = useProjectStore(state => state.isProjectLoaded)
  const createSession = useProjectStore(state => state.createSession)
  const removeRecentProject = useSettingsStore(
    state => state.removeRecentProject
  )
  const { openProject } = useProjectIO()

  const initializedRef = useRef(false)
  const bootRef = useRef(false)

  // 1. Auto-open project if path exists but not loaded (e.g. refresh)
  useEffect(() => {
    if (currentProjectPath && !isProjectLoaded && !bootRef.current) {
      console.log(
        '[ProjectInit] Auto-opening existing project:',
        currentProjectPath
      )
      bootRef.current = true
      openProject(currentProjectPath).catch(err => {
        console.error('[ProjectInit] Failed to auto-open project:', err)
        bootRef.current = false

        // Handle deleted/moved projects on reload
        const isMissing =
          err.message.includes('not found') ||
          err.message.includes('ENOENT') ||
          err.message.includes('Invalid project bundle')

        if (isMissing) {
          console.warn('[ProjectInit] Project invalid, clearing state.')
          setProjectPath(null)
          removeRecentProject(currentProjectPath)
        }
      })
    }
  }, [
    currentProjectPath,
    isProjectLoaded,
    openProject,
    setProjectPath,
    removeRecentProject,
  ])

  // 2. Initialize default session
  useEffect(() => {
    if (!currentProjectPath || !isProjectLoaded) return

    // Initialize default session if none exists
    if (sessions.length === 0 && !initializedRef.current) {
      console.log('[ProjectInit] Creating default session')
      initializedRef.current = true
      createSession()
    }
  }, [sessions.length, createSession, currentProjectPath, isProjectLoaded])
}

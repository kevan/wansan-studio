import { useEffect } from 'react'
import { useProjectStore } from '../stores/useProjectStore'

export function useStoreMigration() {
  useEffect(() => {
    const legacyRaw = localStorage.getItem('wansan-files')
    if (!legacyRaw) return

    try {
      const legacyStorage = JSON.parse(legacyRaw)
      const legacyState = legacyStorage.state

      if (legacyState && legacyState.files && legacyState.files.length > 0) {
        const projectStore = useProjectStore.getState()
        // Only migrate if project store has no files (fresh or empty)
        // This prevents overwriting new data with old data if user already started using v2
        if (projectStore.files.length === 0) {
          console.log(
            '[Migration] Migrating files from wansan-files to wansan-project-v2'
          )
          useProjectStore.setState({
            files: legacyState.files,
            relations: legacyState.relations || [],
            suggestedPrompts: legacyState.suggestedPrompts || [],
          })

          // Backup and clear legacy
          localStorage.setItem('wansan-files-backup', legacyRaw)
          localStorage.removeItem('wansan-files')
          
          console.log('[Migration] Complete. Legacy storage backed up.')
        }
      }
    } catch (e) {
      console.error('[Migration] Failed', e)
    }
  }, [])
}

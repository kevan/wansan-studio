import { useEffect, useRef } from 'react'
import { useProjectStore, selectAllRelations } from '@/stores/useProjectStore'
import { DuckDBViewManager } from '@/lib/duckdb-view-manager'

export function useDataRehydrate() {
  const isProjectLoaded = useProjectStore(s => s.isProjectLoaded)
  const hasRunRef = useRef(false)

  useEffect(() => {
    // Only run if project is fully loaded
    if (hasRunRef.current || !isProjectLoaded) return

    hasRunRef.current = true

    const syncViews = async () => {
      console.log('[Rehydrate] Starting Logical View Sync...')

      // We must get the latest state
      const latestState = useProjectStore.getState()
      const currentFiles = latestState.files
      const currentRelations = selectAllRelations(latestState)

      const readyFiles = currentFiles.filter(f => f.status === 'ready')
      let syncedCount = 0

      for (const file of readyFiles) {
        // Only rebuild if we have metrics OR relations involving this file as source
        const hasRelations = (file.relations || []).length > 0
        const hasMetrics = file.smartMetrics && file.smartMetrics.length > 0

        // Always rebuild views for ready files to ensure "v_" tables exist for metrics/logic
        // Even if no metrics yet, establishing the base view is cheap and safe.
        if (hasMetrics || hasRelations) {
          try {
            await DuckDBViewManager.rebuildView(
              file,
              currentFiles,
              currentRelations
            )
            syncedCount++
          } catch (error) {
            console.error(
              `[Rehydrate] View sync failed for ${file.tableName}`,
              error
            )
          }
        }
      }

      console.log(`[Rehydrate] View Sync finished. Synced ${syncedCount} views.`)
    }

    syncViews().catch(e => {
      console.error('[Rehydrate] Fatal error during view sync:', e)
    })
  }, [isProjectLoaded])
}

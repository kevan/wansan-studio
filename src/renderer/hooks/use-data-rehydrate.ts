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

      const latestState = useProjectStore.getState()
      const currentFiles = latestState.files
      const currentRelations = selectAllRelations(latestState)

      // [V1.7] Physical Reconciliation: Cleanup orphaned resources
      try {
        const dbTablesRes = await window.electronAPI.runSQL(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE'"
        )
        if (dbTablesRes.success && dbTablesRes.data) {
          const physicalTables = dbTablesRes.data.data.map((r: any) => r.table_name)
          const validBaseTables = new Set(currentFiles.map(f => f.tableName))
          
          const orphans = physicalTables.filter(t => {
            // Rules for Orphan Detection:
            // 1. Not in validBaseTables
            // 2. Not a sidecar table of a valid base table
            const isKnownBase = validBaseTables.has(t)
            const isSidecarOfKnown = Array.from(validBaseTables).some(bt => t === `${bt}_ext_ai`)
            return !isKnownBase && !isSidecarOfKnown
          })

          if (orphans.length > 0) {
            console.log(`[Rehydrate] Found ${orphans.length} orphaned tables. Cleaning up...`, orphans)
            for (const table of orphans) {
              await window.electronAPI.deleteTable(table)
              await window.electronAPI.runSQL(`DROP VIEW IF EXISTS "v_${table}"`)
            }
          }
        }
      } catch (e) {
        console.warn('[Rehydrate] Cleanup failed', e)
      }

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

import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { getSidecarTableName, getLogicalViewName } from '@shared/naming-utils'

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
            const isSidecarOfKnown = Array.from(validBaseTables).some(bt => t === getSidecarTableName(bt))
            return !isKnownBase && !isSidecarOfKnown
          })

          if (orphans.length > 0) {
            console.log(`[Rehydrate] Found ${orphans.length} orphaned tables. Cleaning up...`, orphans)
            for (const table of orphans) {
              await window.electronAPI.deleteTable(table)
              await window.electronAPI.runSQL(`DROP VIEW IF EXISTS "${getLogicalViewName(table)}"`)
            }
          }
        }
      } catch (e) {
        console.warn('[Rehydrate] Cleanup failed', e)
      }

      const readyFiles = currentFiles.filter(f => f.status === 'ready')
      let syncedCount = 0

      for (const file of readyFiles) {
        // [V1.7.5] Use authoritative metadata refresh instead of just simple rebuildView
        // This ensures AI fields are detected from sidecars and sourceType is restored.
        try {
          await useProjectStore.getState().refreshFileMetadata(file.id)
          syncedCount++
        } catch (error) {
          console.error(
            `[Rehydrate] Metadata refresh failed for ${file.tableName}`,
            error
          )
        }
      }

      console.log(`[Rehydrate] Rehydration finished. Synced ${syncedCount} tables.`)
    }

    syncViews().catch(e => {
      console.error('[Rehydrate] Fatal error during view sync:', e)
    })
  }, [isProjectLoaded])
}

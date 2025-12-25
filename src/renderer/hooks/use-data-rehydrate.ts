import { useEffect, useRef, useState } from 'react'
import { useReIngestFile } from './useIPC'
import { useFileStore } from '@/stores/useFileStore'
import { useToastStore } from '@/stores/useToastStore'
import { DuckDBViewManager } from '@/lib/duckdb-view-manager'
import { useTranslation } from 'react-i18next'

export function useDataRehydrate() {
  const { t } = useTranslation('common')
  const files = useFileStore(state => state.files)
  const relations = useFileStore(state => state.relations)
  const markAsStale = useFileStore(state => state.markAsStale)
  const reloadFile = useFileStore(state => state.reloadFile)
  const updateFile = useFileStore(state => state.updateFile)
  const setRestoring = useFileStore(state => state.setRestoring)
  const markFileMissing = useFileStore(state => state.markFileMissing)
  const addToast = useToastStore(state => state.addToast)
  const { mutateAsync: reIngestFile } = useReIngestFile()

  const [hydrated, setHydrated] = useState(false)
  const hasRunRef = useRef(false)
  const initialFilesRef = useRef<typeof files>([])

  useEffect(() => {
    console.log('[Rehydrate] Init hook, checking hydration...')

    // Check if already hydrated
    if (useFileStore.persist?.hasHydrated?.()) {
      console.log('[Rehydrate] Store already hydrated')
      initialFilesRef.current = useFileStore.getState().files
      setHydrated(true)
    }

    const unsub = useFileStore.persist?.onFinishHydration?.(() => {
      console.log('[Rehydrate] Hydration finished event received')
      initialFilesRef.current = useFileStore.getState().files
      setHydrated(true)
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!hydrated || hasRunRef.current) return

    // Use current state to get latest files
    const filesToRestore = useFileStore
      .getState()
      .files.filter(f => f.status === 'ready' && f.tableName)

    if (filesToRestore.length === 0) {
      setRestoring(false)
      return
    }

    hasRunRef.current = true
    setRestoring(true)
    let cancelled = false

    const syncDatabase = async () => {
      let restoredCount = 0
      let verifiedCount = 0
      let failCount = 0

      console.log(
        `[Rehydrate] Verifying persistence for ${filesToRestore.length} files`
      )

      // 1. Verify Physical Tables (Persistence Check)
      await Promise.all(
        filesToRestore.map(async file => {
          if (cancelled) return

          try {
            // Check if table exists in Native DuckDB
            const checkRes = await window.electronAPI.runSQL(
              `SELECT table_name FROM information_schema.tables WHERE table_name = '${file.tableName}' AND table_schema = 'main'`
            )

            const tableExists =
              checkRes.success && checkRes.data && checkRes.data.data.length > 0

            if (tableExists) {
              console.log(
                `[Rehydrate] Table verified (Persistence Hit): ${file.tableName}`
              )
              verifiedCount++
            } else {
              // Persistence Miss: Table missing in DB but exists in Store.
              // This happens if DB file was deleted or corrupted, or first run after migration.
              console.warn(
                `[Rehydrate] Persistence Miss: Table ${file.tableName} not found. Attempting restoration from source...`
              )

              const result = await reIngestFile({
                fileId: file.id,
                filePath: file.path,
                tableName: file.tableName,
                sheetName: file.sheetName,
              })
              
              if (cancelled) return
              reloadFile(file.id, result)
              restoredCount++
              console.log(`[Rehydrate] Restored from source: ${file.tableName}`)
            }
          } catch (error) {
            if (cancelled) return
            failCount++

            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error'

            if (
              errorMessage.includes('FILE_NOT_FOUND') ||
              errorMessage.includes('ENOENT')
            ) {
              markFileMissing(file.id)
              console.warn(`[Rehydrate] Source file missing: ${file.path}`)
            } else {
              markAsStale([file.id])
              updateFile(file.id, {
                status: 'error',
                error: errorMessage,
              })
              console.error(
                `[Rehydrate] Restoration failed for ${file.tableName}:`,
                error
              )
            }
          }
        })
      )

      if (cancelled) return

      // 2. Rebuild Views (Smart Metrics) - Always ensure View definitions are consistent with Store
      const currentFiles = useFileStore.getState().files
      const currentRelations = useFileStore.getState().relations
      const filesWithMetrics = currentFiles.filter(
        f => f.status === 'ready'
      )

      for (const file of filesWithMetrics) {
        // Only rebuild if we have metrics OR relations involving this file
        const hasRelations = currentRelations.some(r => r.fileAId === file.id || r.fileBId === file.id);
        const hasMetrics = file.smartMetrics && file.smartMetrics.length > 0;

        if (hasMetrics || hasRelations) {
             try {
                // Rebuild View (CREATE OR REPLACE VIEW)
                // This is fast and ensures logical schema is synced
                await DuckDBViewManager.rebuildView(
                    file,
                    currentFiles,
                    currentRelations
                )
             } catch (error) {
                 console.error(`[Rehydrate] View sync failed for ${file.tableName}`, error);
             }
        }
      }

      console.log('[Rehydrate] Sync process finished', { verified: verifiedCount, restored: restoredCount, failed: failCount })
      setRestoring(false)
      
      if (failCount > 0) {
        addToast({
          title: t('rehydrate.restore_with_issues'),
          description: t('rehydrate.restore_summary', {
            success: verifiedCount + restoredCount,
            fail: failCount,
          }),
          type: 'warning',
          duration: 4000,
        })
      }
    }

    syncDatabase().catch(e => {
      console.error('[Rehydrate] Fatal error in sync sequence:', e)
      setRestoring(false)
    })

    return () => {
      cancelled = true
      setRestoring(false)
    }
  }, [
    addToast,
    hydrated,
    markAsStale,
    markFileMissing,
    reIngestFile,
    reloadFile,
    setRestoring,
    updateFile,
    t
  ])
}

import { useEffect, useRef, useState, useMemo } from 'react'
import { useReIngestFile } from './useIPC'
import { useProjectStore, selectAllRelations } from '@/stores/useProjectStore'
import { useToastStore } from '@/stores/useToastStore'
import { DuckDBViewManager } from '@/lib/duckdb-view-manager'
import { useTranslation } from 'react-i18next'

export function useDataRehydrate() {
  const { t } = useTranslation('common')
  const markAsStale = useProjectStore(state => state.markAsStale)
  const reloadFile = useProjectStore(state => state.reloadFile)
  const updateFile = useProjectStore(state => state.updateFile)
  const setRestoring = useProjectStore(state => state.setRestoring)
  const markFileMissing = useProjectStore(state => state.markFileMissing)
  const addToast = useToastStore(state => state.addToast)
  const { mutateAsync: reIngestFile } = useReIngestFile()
  const isProjectLoaded = useProjectStore(s => s.isProjectLoaded)

  const [hydrated, setHydrated] = useState(false)
  const hasRunRef = useRef(false)

  // ... (persist hydration effect) ...

  useEffect(() => {
    // Only run if store is hydrated AND project is fully loaded
    if (!hydrated || hasRunRef.current || !isProjectLoaded) return

    // 1. Identify files that need physical verification
    const filesToRestore = useProjectStore
      .getState()
      .files.filter(f => f.status === 'ready' && f.tableName)

    if (filesToRestore.length === 0) {
      return
    }

    hasRunRef.current = true
    // Don't setRestoring(true) yet. We do it only if we find missing tables.
    let cancelled = false

    const syncDatabase = async () => {
      let restoredCount = 0
      let verifiedCount = 0
      let failCount = 0

      console.log(
        `[Rehydrate] Verifying persistence for ${filesToRestore.length} files`
      )

      // A. Verify Physical Tables (Persistence Check)
      await Promise.all(
        filesToRestore.map(async file => {
          if (cancelled) return

          try {
            const checkRes = await window.electronAPI.runSQL(
              `SELECT table_name FROM information_schema.tables WHERE table_name = '${file.tableName}' AND table_schema = 'main'`
            )

            const tableExists =
              checkRes.success && checkRes.data && checkRes.data.data.length > 0

            if (tableExists) {
              verifiedCount++
            } else {
              // Persistence Miss: Table missing in DB but exists in Store.
              console.warn(
                `[Rehydrate] Persistence Miss: Table ${file.tableName} not found. Restoring...`
              )
              
              // Now we show the loading UI because we are actually restoring
              setRestoring(true)

              const result = await reIngestFile({
                fileId: file.id,
                filePath: file.path,
                tableName: file.tableName,
                sheetName: file.sheetName,
                columns: file.columns,
              })

              if (cancelled) return
              reloadFile(file.id, result)
              restoredCount++
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
            } else {
              markAsStale([file.id])
              updateFile(file.id, { status: 'error', error: errorMessage })
            }
          }
        })
      )

      if (cancelled) return

      // B. Rebuild Views (Logical Layer)
      // We must get the latest state AFTER physical restore is done
      const latestState = useProjectStore.getState()
      const currentFiles = latestState.files
      const currentRelations = selectAllRelations(latestState)

      const readyFiles = currentFiles.filter(f => f.status === 'ready')

      for (const file of readyFiles) {
        // Only rebuild if we have metrics OR relations involving this file as source
        const hasRelations = (file.relations || []).length > 0
        const hasMetrics = file.smartMetrics && file.smartMetrics.length > 0

        if (hasMetrics || hasRelations) {
          try {
            await DuckDBViewManager.rebuildView(
              file,
              currentFiles,
              currentRelations
            )
          } catch (error) {
            console.error(
              `[Rehydrate] View sync failed for ${file.tableName}`,
              error
            )
          }
        }
      }

      console.log('[Rehydrate] Sync finished', {
        verified: verifiedCount,
        restored: restoredCount,
        failed: failCount,
      })
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
      console.error('[Rehydrate] Fatal error:', e)
      setRestoring(false)
    })

    return () => {
      cancelled = true
      setRestoring(false)
    }
  }, [
    hydrated,
    markAsStale,
    markFileMissing,
    reIngestFile,
    reloadFile,
    setRestoring,
    updateFile,
    addToast,
    t,
  ])
}

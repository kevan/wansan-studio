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
  const dismissToast = useToastStore(state => state.dismissToast)
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
    console.log('[Rehydrate] Check run condition:', {
      hydrated,
      hasRun: hasRunRef.current,
      fileCount: initialFilesRef.current.length,
    })
    if (!hydrated || hasRunRef.current) return

    // Use current state to get latest files
    const filesToRestore = useFileStore
      .getState()
      .files.filter(f => f.status === 'ready' && f.tableName)

    console.log(
      `[Rehydrate] Ready to restore. Files to restore: ${filesToRestore.length}`
    )

    if (filesToRestore.length === 0) {
      setRestoring(false)
      return
    }

    hasRunRef.current = true
    setRestoring(true)
    let cancelled = false

    // const toastId = addToast({
    //   title: 'Restoring session data...',
    //   type: 'info',
    //   duration: Infinity,
    // })

    const restore = async () => {
      let successCount = 0
      let failCount = 0

      console.log(
        `[Rehydrate] Starting restoration for ${filesToRestore.length} files`
      )

      // 1. Restore Physical Tables
      await Promise.all(
        filesToRestore.map(async file => {
          try {
            console.log(
              `[Rehydrate] Restoring physical table: ${file.tableName} from ${file.path}`
            )
            const result = await reIngestFile({
              fileId: file.id,
              filePath: file.path,
              tableName: file.tableName,
              sheetName: file.sheetName,
            })
            if (cancelled) return
            reloadFile(file.id, result)
            successCount++
            console.log(`[Rehydrate] Successfully restored: ${file.tableName}`)
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
              console.warn(`[Rehydrate] File missing: ${file.path}`)
            } else {
              markAsStale([file.id])
              updateFile(file.id, {
                status: 'error',
                error: errorMessage,
              })
              console.error(
                `[Rehydrate] Physical table restoration failed for ${file.tableName}:`,
                error
              )
            }

            addToast({
              title: t('rehydrate.restore_failed'),
              description: `${file.name}: ${errorMessage}`,
              type: 'error',
              duration: 5000,
            })
          }
        })
      )

      if (cancelled) {
        console.log('[Rehydrate] Restoration cancelled')
        return
      }

      // 2. Rebuild Views (Smart Metrics) - Must happen AFTER all physical tables are ready
      const currentFiles = useFileStore.getState().files
      const currentRelations = useFileStore.getState().relations
      const filesWithMetrics = currentFiles.filter(
        f => f.status === 'ready' && f.smartMetrics && f.smartMetrics.length > 0
      )

      console.log(
        `[Rehydrate] Physical restoration complete. Found ${filesWithMetrics.length} files with Smart Metrics to rebuild.`
      )

      for (const file of filesWithMetrics) {
        try {
          console.log(
            `[Rehydrate] Rebuilding view for ${file.tableName} (Metrics: ${file.smartMetrics?.length})`
          )
          // 1. Rebuild View and get latest type map
          const typeMap = await DuckDBViewManager.rebuildView(
            file,
            currentFiles,
            currentRelations
          )

          // 2. Update metrics with inferred types if they changed
          if (file.smartMetrics && typeMap.size > 0) {
            let hasTypeChanges = false
            const updatedMetrics = file.smartMetrics.map(m => {
              const inferredType = typeMap.get(m.name)
              if (inferredType && inferredType !== m.type) {
                hasTypeChanges = true
                return { ...m, type: inferredType as any }
              }
              return m
            })

            if (hasTypeChanges) {
              console.log(
                `[Rehydrate] Syncing metric types for ${file.tableName}`
              )
              updateFile(file.id, { smartMetrics: updatedMetrics })
            }
          }

          console.log(
            `[Rehydrate] View successfully rebuilt: v_${file.tableName}`
          )
        } catch (error) {
          console.error(
            `[Rehydrate] Failed to rebuild view for ${file.tableName}:`,
            error
          )
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'

          updateFile(file.id, {
            status: 'error',
            error: `Semantic layer error: ${errorMessage}`,
          })

          addToast({
            title: t('rehydrate.view_rebuild_failed'),
            description: `${file.name}: ${errorMessage}`,
            type: 'error',
            duration: 5000,
          })
        }
      }

      console.log('[Rehydrate] Restoration process finished')
      setRestoring(false)
      // dismissToast(toastId)
      if (failCount > 0) {
        addToast({
          title: t('rehydrate.restore_with_issues'),
          description: t('rehydrate.restore_summary', {
            success: successCount,
            fail: failCount,
          }),
          type: 'warning',
          duration: 4000,
        })
      } else if (successCount > 0) {
        addToast({
          title: t('rehydrate.restore_success'),
          type: 'success',
          duration: 2000,
        })
      }
    }

    restore().catch(e => {
      console.error('[Rehydrate] Fatal error in restore sequence:', e)
      setRestoring(false)
    })

    return () => {
      cancelled = true
      // Don't log "cancelled" here unless we are sure it's an abnormal termination
      setRestoring(false)
      // dismissToast(toastId)
    }
  }, [
    addToast,
    dismissToast,
    hydrated,
    markAsStale,
    markFileMissing,
    reIngestFile,
    reloadFile,
    setRestoring,
    updateFile,
  ])
}

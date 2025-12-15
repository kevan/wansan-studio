import { useEffect, useRef, useState } from 'react'
import { useReIngestFile } from './useIPC'
import { useFileStore } from '@/stores/useFileStore'
import { useToastStore } from '@/stores/useToastStore'

export function useDataRehydrate() {
  const files = useFileStore(state => state.files)
  const markAsStale = useFileStore(state => state.markAsStale)
  const reloadFile = useFileStore(state => state.reloadFile)
  const updateFile = useFileStore(state => state.updateFile)
  const setRestoring = useFileStore(state => state.setRestoring)
  const markFileMissing = useFileStore(state => state.markFileMissing)
  const addToast = useToastStore(state => state.addToast)
  const dismissToast = useToastStore(state => state.dismissToast)
  const { mutateAsync: reIngestFile } = useReIngestFile()

  const [hydrated, setHydrated] = useState(
    () => useFileStore.persist?.hasHydrated?.() ?? false
  )
  const hasRunRef = useRef(false)
  const initialFilesRef = useRef<typeof files>([])

  useEffect(() => {
    if (useFileStore.persist?.hasHydrated?.()) {
      initialFilesRef.current = useFileStore.getState().files
    }
    const unsub = useFileStore.persist?.onFinishHydration?.(() => {
      initialFilesRef.current = useFileStore.getState().files
      setHydrated(true)
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!hydrated || hasRunRef.current) return

    const filesToRestore = initialFilesRef.current.filter(
      f => f.status === 'ready' && f.tableName
    )
    if (filesToRestore.length === 0) return

    hasRunRef.current = true
    setRestoring(true)
    let cancelled = false

    const toastId = addToast({
      title: 'Restoring session data...',
      type: 'info',
      duration: Infinity,
    })

    const restore = async () => {
      let successCount = 0
      let failCount = 0

      await Promise.all(
        filesToRestore.map(async file => {
          try {
            const result = await reIngestFile({
              filePath: file.path,
              tableName: file.tableName,
            })
            if (cancelled) return
            reloadFile(file.id, result)
            successCount++
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
              console.warn(`File missing during rehydration: ${file.path}`)
            } else {
              markAsStale([file.id])
              updateFile(file.id, {
                status: 'error',
                error: errorMessage,
              })
              console.error('Auto rehydrate failed:', {
                file: file.path,
                tableName: file.tableName,
                error,
              })
            }

            addToast({
              title: 'Restore failed',
              description: `${file.name}: ${errorMessage}`,
              type: 'error',
              duration: 5000,
            })
          }
        })
      )

      if (cancelled) return
      setRestoring(false)
      dismissToast(toastId)
      if (failCount > 0) {
        addToast({
          title: 'Session restored with issues',
          description: `Restored ${successCount} file(s). ${failCount} failed.`,
          type: 'warning',
          duration: 4000,
        })
      } else if (successCount > 0) {
        addToast({
          title: 'Session restored',
          type: 'success',
          duration: 2000,
        })
      } else {
        // No files to restore; keep silent
      }
    }

    restore().catch(() => {
      setRestoring(false)
    })

    return () => {
      cancelled = true
      setRestoring(false)
      dismissToast(toastId)
    }
  }, [
    addToast,
    dismissToast,
    files,
    hydrated,
    markAsStale,
    markFileMissing,
    reIngestFile,
    reloadFile,
    setRestoring,
    updateFile,
  ])
}

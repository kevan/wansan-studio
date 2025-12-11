import { useEffect, useRef, useState } from 'react'
import { useReIngestFile } from './useIPC'
import { useFileStore } from '@/stores/useFileStore'
import { useToastStore } from '@/stores/useToastStore'

export function useDataRehydrate() {
  const files = useFileStore(state => state.files)
  const markAsStale = useFileStore(state => state.markAsStale)
  const reloadFile = useFileStore(state => state.reloadFile)
  const updateFile = useFileStore(state => state.updateFile)
  const addToast = useToastStore(state => state.addToast)
  const dismissToast = useToastStore(state => state.dismissToast)
  const { mutateAsync: reIngestFile } = useReIngestFile()

  const [hydrated, setHydrated] = useState(
    () => useFileStore.persist?.hasHydrated?.() ?? false
  )
  const hasRunRef = useRef(false)

  useEffect(() => {
    const unsub = useFileStore.persist?.onFinishHydration?.(() => {
      setHydrated(true)
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!hydrated || hasRunRef.current || files.length === 0) return
    hasRunRef.current = true
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
        files.map(async file => {
          if (file.status === 'missing') {
            failCount++
            return
          }
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
            markAsStale([file.id])
            updateFile(file.id, {
              status: 'missing',
              error:
                error instanceof Error
                  ? error.message
                  : 'File missing or unreadable during restore',
            })
            addToast({
              title: 'Restore failed',
              description: `${file.name}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
              type: 'error',
              duration: 5000,
            })
          }
        })
      )

      if (cancelled) return
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
      // Errors handled individually above
    })

    return () => {
      cancelled = true
      dismissToast(toastId)
    }
  }, [addToast, dismissToast, files, hydrated, markAsStale, reIngestFile, reloadFile])
}

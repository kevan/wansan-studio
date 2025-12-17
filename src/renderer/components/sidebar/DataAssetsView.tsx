import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useFileStore } from '../../stores/useFileStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useParseFile } from '../../hooks/useIPC'
import { DataTreeManager } from '../data-tree'
import { useAutoLink } from '../../hooks/useAutoLink'
import { useFileSync } from '../../hooks/useFileSync'
import { Button } from '../ui/button'
import { useToastStore } from '../../stores/useToastStore'
import { useTranslation } from 'react-i18next'

const MAX_SIZE = 100 * 1024 * 1024 // 100MB

export function DataAssetsView() {
  const { addFile, updateFile } = useFileStore()
  const settings = useSettingsStore()
  const [isImporting, setIsImporting] = useState(false)
  const parseFileMutation = useParseFile()
  const { checkAutoLink } = useAutoLink()
  const addToast = useToastStore(state => state.addToast)
  const { t } = useTranslation('common')

  // Enable automatic file synchronization checks
  useFileSync()

  // 处理多文件导入
  const handleImportClick = async () => {
    console.log('handleImportClick: Started')
    if (!window.electronAPI) {
      alert(t('sidebar.electron_api_unavailable'))
      return
    }

    try {
      setIsImporting(true)
      const result = await window.electronAPI.selectFiles()
      console.log('handleImportClick: selectFiles result', result)

      if (result.success && result.data && result.data.length > 0) {
        console.log('handleImportClick: Files selected', result.data.length)

        const oversizedFiles = result.data.filter(f => f.size > MAX_SIZE)
        if (oversizedFiles.length > 0) {
          addToast({
            title: t('sidebar.file_too_large_title'),
            description: t('sidebar.file_too_large_desc', {
              files: oversizedFiles
                .map(f => f.path.split('/').pop())
                .join(', '),
            }),
            type: 'warning',
            duration: 5000,
          })
        }

        const validFiles = result.data.filter(f => f.size <= MAX_SIZE)

        for (const fileData of validFiles) {
          const filePath = fileData.path
          const fileName = filePath.split('/').pop() || 'unknown'
          console.log('handleImportClick: Processing file', fileName)

          let fileId: string | null = null
          try {
            // 添加文件到 store (Placeholder)
            fileId = addFile({
              name: fileName,
              path: filePath,
              tableName: '',
              status: 'uploading',
              columns: [],
              sheetName: undefined,
              size: fileData.size,
            })

            updateFile(fileId, { status: 'processing' })
            const parseResults = await parseFileMutation.mutateAsync(filePath)
            console.log(
              'handleImportClick: Parsed file',
              fileName,
              parseResults
            )

            const results = Array.isArray(parseResults)
              ? parseResults
              : [parseResults]
            let placeholderUsed = false

            // [NEW LIMIT CHECK: MULTI-SHEET]
            if (!settings.isActivated && results.length > 1) {
              addToast({
                title: t('sidebar.trial_limit_multi_sheet_title'),
                description: t('sidebar.trial_limit_multi_sheet_desc'),
                type: 'warning',
              })
              // Remove the placeholder file if already added, to clean up UI
              if (fileId) {
                useFileStore.getState().removeFile(fileId) // This needs the store ref
              }
              continue // Skip this file and proceed to next
            }

            for (const res of results) {
              // Check for duplicates (excluding the placeholder itself)
              const isDuplicate = useFileStore
                .getState()
                .files.some(
                  f =>
                    f.id !== fileId &&
                    f.path === filePath &&
                    f.sheetName === res.sheetName
                )

              if (isDuplicate) {
                console.warn(
                  `Skipping duplicate sheet: ${res.sheetName || 'default'}`
                )
                continue
              }

              // 从 preview 数据中提取每列的样本值
              const columns = (res.schema?.columns || []).map(
                (
                  col: { name: string; type: string; nullable: boolean },
                  colIndex: number
                ) => {
                  // preview 可能是 [[header...], [row1...], ...] 或 [{col: val}, ...]
                  const preview = res.preview || []
                  const sampleValues: string[] = []

                  // 如果是对象数组格式 (CSV 解析结果)
                  if (
                    preview.length > 0 &&
                    typeof preview[0] === 'object' &&
                    !Array.isArray(preview[0])
                  ) {
                    for (const row of preview.slice(0, 5)) {
                      const val = row[col.name]
                      if (
                        val !== null &&
                        val !== undefined &&
                        val !== '' &&
                        sampleValues.length < 3
                      ) {
                        sampleValues.push(String(val))
                      }
                    }
                  } else if (Array.isArray(preview[0])) {
                    // 如果是二维数组格式 (Excel 解析结果)，跳过第一行（表头）
                    for (const row of preview.slice(1, 6)) {
                      const val = row[colIndex]
                      if (
                        val !== null &&
                        val !== undefined &&
                        val !== '' &&
                        sampleValues.length < 3
                      ) {
                        sampleValues.push(String(val))
                      }
                    }
                  }

                  return {
                    ...col,
                    sampleValues,
                  }
                }
              )

              const fileData = {
                name: res.sheetName
                  ? `${fileName} - ${res.sheetName}`
                  : fileName,
                status: 'ready' as const,
                tableName: res.tableName,
                sheetName: res.sheetName,
                columns,
                rowCount: res.rowCount,
              }

              if (!placeholderUsed) {
                updateFile(fileId, fileData)
                placeholderUsed = true
              } else {
                try {
                  addFile({
                    ...fileData,
                    path: filePath,
                  })
                } catch (e) {
                  console.warn('Failed to add sheet', e)
                }
              }
            }

            if (!placeholderUsed && fileId) {
              // All sheets were duplicates or no sheets found
              // If results were empty, it's an error?
              if (results.length === 0) {
                updateFile(fileId, { status: 'error', error: 'No data found' })
              } else {
                // All duplicates
                useFileStore.getState().removeFile(fileId)
                addToast({
                  title: t('sidebar.duplicate_file_skipped_title'),
                  description: t('sidebar.duplicate_file_skipped_desc', {
                    fileName,
                  }),
                  type: 'warning',
                  duration: 4000,
                })
              }
            }
          } catch (error) {
            console.error(
              'handleImportClick: Error processing file',
              fileName,
              error
            )
            const message =
              error instanceof Error ? error.message : t('sidebar.parse_failed')

            if (
              error instanceof Error &&
              error.message.toLowerCase().includes('already imported')
            ) {
              addToast({
                title: t('sidebar.duplicate_file_skipped_title'),
                description: t('sidebar.duplicate_file_skipped_desc', {
                  fileName,
                }),
                type: 'warning',
                duration: 4000,
              })
            } else {
              addToast({
                title: t('sidebar.import_failed_title'),
                description: `${fileName}: ${message}`,
                type: 'error',
                duration: 4000,
              })
            }

            // If file was created before error, mark it as failed
            if (fileId) {
              updateFile(fileId, {
                status: 'error',
                error: message,
              })
            }

            continue
          }
        }

        // Trigger auto-link analysis after all files are processed
        const currentFiles = useFileStore.getState().files
        console.log(
          'Processed files. Triggering auto-link with:',
          currentFiles.length,
          'files'
        )
        checkAutoLink(currentFiles)
      } else {
        console.log('handleImportClick: No files selected or failed')
      }
    } catch (error) {
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pb-4 pt-4 border-b border-zinc-200 space-y-2">
        <Button
          onClick={handleImportClick}
          disabled={isImporting}
          className="w-full h-9 bg-black hover:bg-zinc-800 text-white shadow-sm justify-start px-3"
        >
          {isImporting ? (
            <svg
              className="w-4 h-4 animate-spin mr-2"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {isImporting ? t('importing') : t('import_data')}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden px-2 min-h-0">
        <DataTreeManager className="no-drag" />
      </div>
    </div>
  )
}

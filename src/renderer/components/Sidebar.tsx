import { useState } from 'react'
import { Plus, Crown, Lock, Sparkles, Settings } from 'lucide-react'
import { useFileStore } from '../stores/useFileStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useParseFile } from '../hooks/useIPC'
import { DataTreeManager } from './data-tree'
import { useAutoLink } from '../hooks/useAutoLink'
import { useFileSync } from '../hooks/useFileSync'
import { Button } from './ui/button'
import { useToastStore } from '../stores/useToastStore'
import { useTranslation } from 'react-i18next'
import { SettingsDialog } from './settings/SettingsDialog'
import { cn } from '@/utils/cn'

interface SidebarProps {
  onImportData?: () => void
}

export function Sidebar(_props: SidebarProps) {
  const { files, addFile, updateFile, setView } = useFileStore()
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
        for (const filePath of result.data) {
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
            })

            updateFile(fileId, { status: 'processing' })
            const parseResults = await parseFileMutation.mutateAsync(filePath)
            console.log(
              'handleImportClick: Parsed file',
              fileName,
              parseResults
            )
            
            const results = Array.isArray(parseResults) ? parseResults : [parseResults]
            let placeholderUsed = false

            for (const res of results) {
                 // Check for duplicates (excluding the placeholder itself)
                 const isDuplicate = useFileStore.getState().files.some(f => 
                     f.id !== fileId && 
                     f.path === filePath && 
                     f.sheetName === res.sheetName
                 )

                 if (isDuplicate) {
                     console.warn(`Skipping duplicate sheet: ${res.sheetName || 'default'}`)
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
                  name: res.sheetName ? `${fileName} - ${res.sheetName}` : fileName,
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
                           path: filePath
                       })
                   } catch (e) {
                       console.warn("Failed to add sheet", e)
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
                        description: t('sidebar.duplicate_file_skipped_desc', { fileName }),
                        type: 'warning',
                        duration: 4000
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
    <aside className="wansan-sidebar">
      {/* macOS 拖动区域 */}
      {/*<div className="drag-region h-8 flex-shrink-0" />*/}

      {/* 顶部: 项目名 + 导入按钮 */}
      <div className="px-4 pb-4 pt-4 border-b border-zinc-200 space-y-2">
        {/* Import Data 按钮 */}
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

      {/* 数据树 */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* DataTreeManager - 填满剩余空间 */}
        <div className="flex-1 overflow-hidden px-2 min-h-0">
          <DataTreeManager className="no-drag" />
        </div>
      </div>

      {/* 底部: 设置 */}
      <div className="p-2 mt-auto border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-1">
        {/* STATUS CARD (CLEAN STYLE) */}
        <div
          onClick={() =>
            document.dispatchEvent(
              new CustomEvent('open-settings', { detail: 'general' })
            )
          }
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border group',
            // Common Base
            'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700',
            // Conditional Tint
            !settings.isActivated && "hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
          )}
        >
          {settings.isActivated ? (
            <>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-50 border border-yellow-100">
                <Crown className="w-4 h-4 text-yellow-600 fill-yellow-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-700">
                  {t('sidebar.pro_active')}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {t('sidebar.license_active')}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-100 group-hover:scale-105 transition-all">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-indigo-700">
                  {t('sidebar.trial_mode')}
                </span>
                <span className="text-[10px] text-zinc-400 group-hover:text-indigo-500/80">
                  {t('sidebar.unlock_full_access')}
                </span>
              </div>
            </>
          )}
        </div>

        {/* SETTINGS LINK */}
        <SettingsDialog
          trigger={
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-zinc-500 hover:text-foreground h-8 mt-1"
              onClick={() =>
                document.dispatchEvent(
                  new CustomEvent('open-settings', { detail: 'ai' })
                )
              }
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs">{t('settings')}</span>
            </Button>
          }
        />
      </div>
    </aside>
  )
}

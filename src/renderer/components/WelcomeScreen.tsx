import React, { useState } from 'react'
import { useParseFile, useSelectFiles } from '../hooks/useIPC'
import { useFileStore } from '../stores/useFileStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useAutoLink } from '../hooks/useAutoLink'
import { loadDemoData } from '../lib/demo-data'
import { useToastStore } from '../stores/useToastStore'
import { Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { useTranslation } from 'react-i18next'
import { useProGate } from '@/hooks/use-pro-gate'

interface WelcomeScreenProps {
  onDataImported?: (tableName: string) => void
}

export function WelcomeScreen({ onDataImported }: WelcomeScreenProps) {
  const parseFileMutation = useParseFile()
  const selectFilesMutation = useSelectFiles()
  const { addFile, updateFile } = useFileStore()
  const { checkAutoLink } = useAutoLink()
  const { addToast } = useToastStore()
  const { t } = useTranslation('chat')
  const { isActivated, checkGate, gateNode } = useProGate()
  const [isDragging, setIsDragging] = useState(false)
  const [processingCount, setProcessingCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)

  const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json']
  const maxSize = isActivated ? 200 * 1024 * 1024 : 50 * 1024 * 1024 // 200MB vs 50MB

  // 处理单个文件
  const processFile = async (
    filePath: string,
    fileName: string,
    fileSize?: number
  ) => {
    // 添加文件到 store（状态: uploading）
    const fileId = addFile({
      name: fileName,
      path: filePath,
      tableName: '',
      status: 'uploading',
      size: fileSize,
      columns: [],
    })

    // Switch to active file immediately
    useProjectStore.getState().setActiveFile(fileId)

    try {
      // 更新状态为 processing
      updateFile(fileId, { status: 'processing' })

      // 解析文件
      const result = await parseFileMutation.mutateAsync(filePath)
      const parseResults = Array.isArray(result) ? result : [result]

      if (parseResults.length === 0) {
        throw new Error('No data found in file')
      }

      // Handle the first result (update the placeholder file we created)
      const firstResult = parseResults[0]
      updateFile(fileId, {
        status: 'ready',
        tableName: firstResult.tableName,
        sheetName: firstResult.sheetName,
        columns: firstResult.schema?.columns || [],
        rowCount: firstResult.rowCount,
      })

      // Handle additional results (e.g. extra sheets)
      for (let i = 1; i < parseResults.length; i++) {
        const res = parseResults[i]
        try {
          addFile({
            name: fileName,
            path: filePath,
            tableName: res.tableName,
            sheetName: res.sheetName,
            status: 'ready',
            size: fileSize,
            columns: res.schema?.columns || [],
            rowCount: res.rowCount,
          })
        } catch (e) {
          console.warn('Skipping duplicate or invalid sheet:', res.sheetName, e)
        }
      }

      onDataImported?.(firstResult.tableName)
      return true
    } catch (error) {
      // 更新状态为 error
      updateFile(fileId, {
        status: 'error',
        error: error instanceof Error ? error.message : t('sidebar.parse_failed'),
      })
      console.error('File processing error:', error)
      return false
    }
  }

  // 批量处理文件
  const processFiles = async (
    files: { path: string; name: string; size?: number }[]
  ) => {
    setTotalCount(files.length)
    setProcessingCount(0)

    for (const file of files) {
      await processFile(file.path, file.name, file.size)
      setProcessingCount(prev => prev + 1)
    }

    setTotalCount(0)
    setProcessingCount(0)

    // Trigger auto-link analysis after batch processing
    const currentFiles = useFileStore.getState().files
    console.log(
      'WelcomeScreen: Batch processed. Triggering auto-link with:',
      currentFiles.length,
      'files'
    )
    checkAutoLink(currentFiles)
    
    // Switch to Schema View
    useProjectStore.getState().setView('schema')
  }

  const handleFileSelect = async () => {
    const currentFiles = useProjectStore.getState().files
    if (!isActivated && currentFiles.length >= 1) {
      checkGate(t('import_data', { ns: 'common' }), () => {})
      return
    }

    try {
      const result = await selectFilesMutation.mutateAsync()
      if (result && result.length > 0) {
        // Transform to match processFiles signature
        const filesToProcess = result.map(fileData => ({
          path: fileData.path,
          name: fileData.path.split('/').pop() || 'unknown',
          size: fileData.size,
        }))

        const oversizedFiles = filesToProcess.filter(f => f.size > maxSize)
        const validSizeFiles = filesToProcess.filter(f => f.size <= maxSize)

        if (oversizedFiles.length > 0) {
          addToast({
            title: t('file_too_large_title'),
            description: t('file_too_large_desc', {
              limit: isActivated ? '200MB' : '50MB',
              files: oversizedFiles.map(f => f.name).join(', '),
            }),
            type: 'warning',
          })
        }

        await processFiles(validSizeFiles)
      }
    } catch (error) {
      console.error('File selection error:', error)
      alert(
        `文件选择失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const currentFiles = useProjectStore.getState().files
    if (!isActivated && currentFiles.length >= 1) {
      checkGate(t('import_data', { ns: 'common' }), () => {})
      return
    }

    const droppedFiles = Array.from(e.dataTransfer.files)
    console.log('handleDrop', droppedFiles)

    const oversizedFiles = droppedFiles.filter(f => f.size > maxSize)
    const validSizeFiles = droppedFiles.filter(f => f.size <= maxSize)

    if (oversizedFiles.length > 0) {
      addToast({
        title: t('file_too_large_title'),
        description: t('file_too_large_desc', {
          limit: isActivated ? '200MB' : '50MB',
          files: oversizedFiles.map(f => f.name).join(', '),
        }),
        type: 'warning',
      })
    }

    // 过滤支持的文件类型
    const validFiles = validSizeFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      return allowedExtensions.includes(ext)
    })

    if (validFiles.length === 0) {
      alert(t('unsupported_file_type'))
      return
    }

    // 批量处理文件
    await processFiles(
      validFiles.map(f => ({
        path: window.electronAPI.getPathForFile(f),
        name: f.name,
        size: f.size,
      }))
    )
  }

  const isProcessing = totalCount > 0

  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true)
    try {
      // 从 i18n 获取 demo 提示词
      const demoPrompts = t('demo_prompts', { returnObjects: true }) as string[]
      const result = await loadDemoData(demoPrompts)
      if (result.success) {
        addToast({
          title: t('demo_success_title'),
          description: t('demo_success_msg'),
          type: 'success',
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Load demo data error:', error)
      addToast({
        title: t('demo_error_title'),
        description:
          error instanceof Error
            ? error.message
            : t('unknown_error', 'Unknown error'),
        type: 'error',
      })
    } finally {
      setIsLoadingDemo(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      {gateNode}
      {/* Drop Zone - 核心空态界面 */}
      <div
        className={`wansan-drop-zone w-full max-w-2xl text-center animate-card-enter ${
          isDragging ? 'active' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={isProcessing ? undefined : handleFileSelect}
      >
        {/* 批量处理状态 */}
        {isProcessing ? (
          <div className="py-8">
            <div className="w-16 h-16 mx-auto mb-6 wansan-spinner"></div>
            <p className="text-lg font-medium text-zinc-700 mb-2">
              {t('processing_files_count', {
                current: processingCount + 1,
                total: totalCount,
              })}
            </p>
            <p className="text-sm text-zinc-500">{t('cleaning_cells')}</p>
            {/* 进度条 */}
            <div className="w-48 mx-auto mt-4 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${(processingCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-zinc-100 rounded-2xl flex items-center justify-center">
              <svg
                className={`w-10 h-10 transition-colors ${isDragging ? 'text-indigo-600' : 'text-zinc-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            {/* 主文案 */}
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">
              {t('file_drag_title')}
            </h2>
            <p className="text-zinc-500 mb-4">{t('file_drag_subtitle')}</p>

            {/* 支持的格式 */}
            <div className="flex items-center justify-center gap-3 text-xs text-zinc-400">
              <span className="px-2 py-1 bg-zinc-100 rounded">.xlsx</span>
              <span className="px-2 py-1 bg-zinc-100 rounded">.xls</span>
              <span className="px-2 py-1 bg-zinc-100 rounded">.csv</span>
            </div>

            {/* Load Demo Data Section */}
            <div className="mt-8 pt-6 border-t border-zinc-100">
              <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
                <div className="flex items-center gap-2 w-full">
                  <Separator className="flex-1" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">
                    {t('demo_or_start_with', 'or start with')}
                  </span>
                  <Separator className="flex-1" />
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2 bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700 hover:text-zinc-900"
                  onClick={e => {
                    e.stopPropagation()
                    handleLoadDemoData()
                  }}
                  disabled={isLoadingDemo}
                >
                  {isLoadingDemo ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                      {t('demo_loading')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      {t('demo_load_button')}
                    </>
                  )}
                </Button>

                <p className="text-xs text-zinc-400 text-center">
                  {t('demo_hint')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
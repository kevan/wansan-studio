import React, { useState } from 'react'
import { useParseFile, useSelectFiles } from '../hooks/useIPC'
import { useFileStore } from '../stores/useFileStore'
import { useAutoLink } from '../hooks/useAutoLink'

interface WelcomeScreenProps {
  onDataImported?: (tableName: string) => void
}

export function WelcomeScreen({ onDataImported }: WelcomeScreenProps) {
  const parseFileMutation = useParseFile()
  const selectFilesMutation = useSelectFiles()
  const { addFile, updateFile } = useFileStore()
  const { checkAutoLink } = useAutoLink()
  const [isDragging, setIsDragging] = useState(false)
  const [processingCount, setProcessingCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const allowedExtensions = ['.xlsx', '.xls', '.csv']

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

    try {
      // 更新状态为 processing
      updateFile(fileId, { status: 'processing' })

      // 解析文件
      const parseResult = await parseFileMutation.mutateAsync(filePath)

      // 更新文件信息
      updateFile(fileId, {
        status: 'ready',
        tableName: parseResult.tableName,
        columns: parseResult.schema?.columns || [],
        rowCount: parseResult.rowCount,
      })

      onDataImported?.(parseResult.tableName)
      return true
    } catch (error) {
      // 更新状态为 error
      updateFile(fileId, {
        status: 'error',
        error: error instanceof Error ? error.message : '解析失败',
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
    console.log('WelcomeScreen: Batch processed. Triggering auto-link with:', currentFiles.length, 'files')
    checkAutoLink(currentFiles)
  }

  const handleFileSelect = async () => {
    try {
      const result = await selectFilesMutation.mutateAsync()
      if (result && result.length > 0) {
        // Transform to match processFiles signature
        const filesToProcess = result.map(filePath => ({
          path: filePath,
          name: filePath.split('/').pop() || 'unknown'
        }))
        
        await processFiles(filesToProcess)
      }
    } catch (error) {
      console.error('File selection error:', error)
      alert(`文件选择失败: ${error instanceof Error ? error.message : '未知错误'}`)
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

    const droppedFiles = Array.from(e.dataTransfer.files)

    // 过滤支持的文件类型
    const validFiles = droppedFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      return allowedExtensions.includes(ext)
    })

    if (validFiles.length === 0) {
      alert('不支持的文件类型，请选择 Excel (.xlsx, .xls) 或 CSV (.csv) 文件')
      return
    }

    // 批量处理文件
    await processFiles(
      validFiles.map(f => ({
        path: f.path,
        name: f.name,
        size: f.size,
      }))
    )
  }

  const isProcessing = totalCount > 0

  return (
    <div className="flex-1 flex items-center justify-center p-8">
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
              正在处理 {processingCount + 1}/{totalCount} 个文件...
            </p>
            <p className="text-sm text-zinc-500">Cleaning merged cells...</p>
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
              拖拽 Excel/CSV 文件到此处
            </h2>
            <p className="text-zinc-500 mb-4">
              支持批量拖拽多个文件，或点击选择
            </p>

            {/* 支持的格式 */}
            <div className="flex items-center justify-center gap-3 text-xs text-zinc-400">
              <span className="px-2 py-1 bg-zinc-100 rounded">.xlsx</span>
              <span className="px-2 py-1 bg-zinc-100 rounded">.xls</span>
              <span className="px-2 py-1 bg-zinc-100 rounded">.csv</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

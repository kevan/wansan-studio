import React from 'react'
import { useParseFile } from '../hooks/useIPC'

interface WelcomeScreenProps {
  onDataImported: (tableName: string) => void
}

export function WelcomeScreen({ onDataImported }: WelcomeScreenProps) {
  const parseFileMutation = useParseFile()

  const handleFileSelect = async () => {
    try {
      // 检查是否有 electronAPI
      if (!window.electronAPI) {
        alert('Electron API 不可用，请在 Electron 环境中运行')
        return
      }

      const result = await window.electronAPI.selectFile()
      if (result.success && result.data) {
        // 解析文件
        const parseResult = await parseFileMutation.mutateAsync(result.data)
        onDataImported(parseResult.tableName)
      }
    } catch (error) {
      console.error('File selection error:', error)
      alert(`文件选择失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    const file = files[0]

    if (!file) return

    // 检查文件类型
    const allowedTypes = ['.xlsx', '.xls', '.csv']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExt)) {
      alert('不支持的文件类型，请选择 Excel (.xlsx, .xls) 或 CSV (.csv) 文件')
      return
    }

    try {
      // 解析文件
      const parseResult = await parseFileMutation.mutateAsync(file.path)
      onDataImported(parseResult.tableName)
    } catch (error) {
      console.error('File drop error:', error)
      alert(`文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
      {/* 欢迎信息 */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          欢迎使用 Wansan Studio
        </h2>
        <p className="text-lg text-gray-600 mb-2">
          本地优先的智能商业报表工具
        </p>
        <p className="text-sm text-gray-500">
          数据聚宝，日进斗金 - 让您的数据产生价值
        </p>
      </div>

      {/* 文件上传区域 */}
      <div
        className="w-full max-w-md p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            导入您的数据文件
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            拖拽文件到此处或点击选择文件
          </p>
          <p className="text-xs text-gray-400">
            支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式
          </p>
        </div>
      </div>

      {/* 加载状态 */}
      {parseFileMutation.isPending && (
        <div className="mt-4 flex items-center space-x-2 text-primary-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          <span>正在处理文件...</span>
        </div>
      )}

      {/* 功能特性 */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h4 className="font-medium text-gray-900">数据隐私</h4>
          <p className="text-sm text-gray-500">本地处理，数据不出域</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="font-medium text-gray-900">极速处理</h4>
          <p className="text-sm text-gray-500">本地算力，秒级响应</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h4 className="font-medium text-gray-900">智能分析</h4>
          <p className="text-sm text-gray-500">AI 驱动的数据洞察</p>
        </div>
      </div>
    </div>
  )
}

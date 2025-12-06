import React, { useState } from 'react'
import { useFileStore, FileAsset, FileStatus } from '../stores/useFileStore'
import { useParseFile } from '../hooks/useIPC'

interface SidebarProps {
  onImportData?: () => void
}

export function Sidebar({ onImportData }: SidebarProps) {
  const {
    projectName,
    setProjectName,
    files,
    relations,
    activeFileId,
    setActiveFile,
    removeFile,
    addFile,
    updateFile,
  } = useFileStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(projectName)
  const [isImporting, setIsImporting] = useState(false)
  const parseFileMutation = useParseFile()

  const handleNameSubmit = () => {
    if (editName.trim()) {
      setProjectName(editName.trim())
    }
    setIsEditingName(false)
  }

  // 处理多文件导入
  const handleImportClick = async () => {
    if (!window.electronAPI) {
      alert('Electron API 不可用')
      return
    }

    try {
      setIsImporting(true)
      const result = await window.electronAPI.selectFiles()

      if (result.success && result.data && result.data.length > 0) {
        for (const filePath of result.data) {
          const fileName = filePath.split('/').pop() || 'unknown'

          // 添加文件到 store
          const fileId = addFile({
            name: fileName,
            path: filePath,
            tableName: '',
            status: 'uploading',
            columns: [],
          })

          try {
            updateFile(fileId, { status: 'processing' })
            const parseResult = await parseFileMutation.mutateAsync(filePath)

            updateFile(fileId, {
              status: 'ready',
              tableName: parseResult.tableName,
              columns: parseResult.schema?.columns || [],
              rowCount: parseResult.rowCount,
            })
          } catch (error) {
            updateFile(fileId, {
              status: 'error',
              error: error instanceof Error ? error.message : '解析失败',
            })
          }
        }
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
      <div className="drag-region h-8 flex-shrink-0" />

      {/* 顶部: 项目名 + 导入按钮 */}
      <div className="px-4 pb-4 border-b border-zinc-200">
        {/* 项目名称 - 可编辑 */}
        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
            className="w-full text-base font-semibold text-zinc-900 bg-white border border-zinc-300 rounded px-2 py-1 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 no-drag"
            autoFocus
          />
        ) : (
          <h1
            className="text-base font-semibold text-zinc-900 mb-3 cursor-pointer hover:text-indigo-600 transition-colors no-drag"
            onClick={() => {
              setEditName(projectName)
              setIsEditingName(true)
            }}
            title="点击重命名项目"
          >
            {projectName}
          </h1>
        )}

        {/* Import Data 按钮 */}
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="wansan-button wansan-button-primary w-full no-drag disabled:opacity-50"
        >
          {isImporting ? (
            <svg
              className="w-4 h-4 animate-spin"
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
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}
          {isImporting ? '导入中...' : 'Import Data'}
        </button>
      </div>

      {/* 文件列表区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {files.length > 0 ? (
          <div className="space-y-4">
            {/* 数据源标题 */}
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Data Sources ({files.length})
            </h3>

            {/* 文件卡片列表 */}
            <div className="space-y-2">
              {files.map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  isActive={file.id === activeFileId}
                  onSelect={() => setActiveFile(file.id)}
                  onRemove={() => removeFile(file.id)}
                />
              ))}
            </div>

            {/* 关联视图 */}
            {relations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                  Relations
                </h3>
                <div className="space-y-2">
                  {relations.map(rel => {
                    const fileA = files.find(f => f.id === rel.fileAId)
                    const fileB = files.find(f => f.id === rel.fileBId)
                    if (!fileA || !fileB) return null
                    return (
                      <div
                        key={rel.id}
                        className="text-xs text-zinc-500 bg-zinc-100 rounded px-2 py-1.5"
                      >
                        <span className="text-zinc-700">{fileA.name}</span>
                        <span className="mx-1">—</span>
                        <span className="text-indigo-600">({rel.columnA})</span>
                        <span className="mx-1">🔗</span>
                        <span className="text-indigo-600">({rel.columnB})</span>
                        <span className="mx-1">—</span>
                        <span className="text-zinc-700">{fileB.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 空状态 */
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-zinc-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-zinc-400"
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
            <p className="text-sm text-zinc-500">导入数据开始分析</p>
            <p className="text-xs text-zinc-400 mt-1">支持 Excel / CSV</p>
          </div>
        )}
      </div>

      {/* 底部: 设置 */}
      <div className="p-4 border-t border-zinc-200">
        <button className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors no-drag">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  )
}

// 状态指示灯颜色
const statusColors: Record<FileStatus, string> = {
  uploading: 'bg-yellow-400',
  processing: 'bg-yellow-400 animate-pulse',
  ready: 'bg-green-500',
  error: 'bg-red-500',
}

// 文件图标
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return '📄'
  if (ext === 'xlsx' || ext === 'xls') return '📊'
  return '📁'
}

// 格式化文件大小
function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// 文件卡片组件
interface FileCardProps {
  file: FileAsset
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
}

function FileCard({ file, isActive, onSelect, onRemove }: FileCardProps) {
  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-white shadow-sm' : 'hover:bg-zinc-100'
      }`}
      onClick={onSelect}
    >
      {/* 状态指示灯 */}
      <div
        className={`w-2 h-2 rounded-full ${statusColors[file.status]}`}
        title={file.status}
      />

      {/* 文件图标 + 名称 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm">{getFileIcon(file.name)}</span>
          <span className="text-sm text-zinc-900 truncate">{file.name}</span>
        </div>
        {file.size && (
          <p className="text-xs text-zinc-400">{formatSize(file.size)}</p>
        )}
        {file.error && (
          <p className="text-xs text-red-500 truncate">{file.error}</p>
        )}
      </div>

      {/* 删除按钮 */}
      <button
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-200 transition-all"
        onClick={e => {
          e.stopPropagation()
          onRemove()
        }}
        title="移除文件"
      >
        <svg
          className="w-4 h-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  )
}

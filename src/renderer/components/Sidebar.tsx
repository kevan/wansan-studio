import { useState } from 'react'
import { useFileStore } from '../stores/useFileStore'
import { useParseFile } from '../hooks/useIPC'
import { DataTreeManager } from './data-tree'

interface SidebarProps {
  onImportData?: () => void
}

export function Sidebar(_props: SidebarProps) {
  const { projectName, setProjectName, files, addFile, updateFile } =
    useFileStore()
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

            // 从 preview 数据中提取每列的样本值
            const columns = (parseResult.schema?.columns || []).map(
              (
                col: { name: string; type: string; nullable: boolean },
                colIndex: number
              ) => {
                // preview 可能是 [[header...], [row1...], ...] 或 [{col: val}, ...]
                const preview = parseResult.preview || []
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

            updateFile(fileId, {
              status: 'ready',
              tableName: parseResult.tableName,
              columns,
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

      {/* 数据树 */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* 数据源标题 */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Data Sources {files.length > 0 && `(${files.length})`}
          </h3>
        </div>

        {/* DataTreeManager - 填满剩余空间 */}
        <div className="flex-1 overflow-hidden px-2 min-h-0">
          <DataTreeManager className="no-drag" />
        </div>
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

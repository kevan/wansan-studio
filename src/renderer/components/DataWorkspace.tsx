import React, { useState, useEffect } from 'react'
import { useFileStore } from '../stores/useFileStore'
import { useRunSQL } from '../hooks/useIPC'
import { DataTable } from './DataTable'

interface DataWorkspaceNewProps {
  onReset: () => void
}

export function DataWorkspace({ onReset }: DataWorkspaceNewProps) {
  const { files, relations, activeFileId, setActiveFile, setShowSchemaConfirm } = useFileStore()
  const runSQLMutation = useRunSQL()

  const [currentData, setCurrentData] = useState<any[]>([])
  const [currentColumns, setCurrentColumns] = useState<any[]>([])
  const [sqlInput, setSqlInput] = useState('')
  const [naturalInput, setNaturalInput] = useState('')

  const readyFiles = files.filter(f => f.status === 'ready')
  const currentFile = readyFiles.find(f => f.id === activeFileId) || readyFiles[0]

  // 加载当前选中表的数据
  useEffect(() => {
    if (currentFile?.tableName) {
      handleRunQuery(`SELECT * FROM ${currentFile.tableName} LIMIT 100`)
    }
  }, [currentFile?.tableName])

  const handleRunQuery = async (sql: string) => {
    try {
      const result = await runSQLMutation.mutateAsync(sql)
      setCurrentData(result)

      if (result.length > 0) {
        const columns = Object.keys(result[0]).map(key => ({
          accessorKey: key,
          header: key,
          cell: ({ getValue }: any) => {
            const value = getValue()
            return value !== null && value !== undefined ? String(value) : ''
          }
        }))
        setCurrentColumns(columns)
      }
    } catch (error) {
      console.error('Query error:', error)
      alert(`查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleSqlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sqlInput.trim()) {
      handleRunQuery(sqlInput.trim())
    }
  }

  // 生成可用表的列表
  const tableList = readyFiles.map(f => f.tableName).join(', ')

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-zinc-900">数据工作区</h2>
          <div className="flex gap-2">
            {readyFiles.map(file => (
              <button
                key={file.id}
                onClick={() => setActiveFile(file.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  file.id === currentFile?.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSchemaConfirm(true)}
            className="wansan-button wansan-button-secondary"
          >
            查看 Schema
          </button>
          <button onClick={onReset} className="wansan-button wansan-button-secondary">
            重新开始
          </button>
        </div>
      </div>

      {/* SQL 输入区 */}
      <div className="mb-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
        <form onSubmit={handleSqlSubmit} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder={`输入 SQL 查询... (可用表: ${tableList})`}
              className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={runSQLMutation.isPending}
            className="wansan-button wansan-button-primary"
          >
            {runSQLMutation.isPending ? '执行中...' : '执行'}
          </button>
        </form>

        {/* 快捷查询示例 */}
        {relations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-200">
            <p className="text-xs text-zinc-500 mb-2">💡 试试 Join 查询:</p>
            <button
              onClick={() => {
                const rel = relations[0]
                const fileA = files.find(f => f.id === rel.fileAId)
                const fileB = files.find(f => f.id === rel.fileBId)
                if (fileA && fileB) {
                  const sql = `SELECT * FROM ${fileA.tableName} a JOIN ${fileB.tableName} b ON a.${rel.columnA} = b.${rel.columnB} LIMIT 100`
                  setSqlInput(sql)
                }
              }}
              className="text-xs text-indigo-600 hover:underline"
            >
              自动生成 Join 语句
            </button>
          </div>
        )}
      </div>

      {/* 数据表格 */}
      <div className="flex-1 overflow-auto">
        {currentData.length > 0 && currentColumns.length > 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700">
                查询结果: {currentData.length} 行
              </span>
            </div>
            <DataTable data={currentData} columns={currentColumns} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <p>输入 SQL 查询以查看数据</p>
          </div>
        )}
      </div>
    </div>
  )
}


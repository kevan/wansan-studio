import React, { useState } from 'react'
import { useGetSchema, useRunSQL } from '../hooks/useIPC'
import { DataTable } from './DataTable'
import { QueryPanel } from './QueryPanel'

interface DataWorkspaceProps {
  tableName: string
  onReset: () => void
}

export function DataWorkspace({ tableName, onReset }: DataWorkspaceProps) {
  const [currentData, setCurrentData] = useState<any[]>([])
  const [currentColumns, setCurrentColumns] = useState<any[]>([])
  
  const { data: schema, isLoading: schemaLoading } = useGetSchema(tableName)
  const runSQLMutation = useRunSQL()

  // 初始加载数据
  React.useEffect(() => {
    if (schema && !schemaLoading) {
      handleRunQuery(`SELECT * FROM ${tableName} LIMIT 100`)
    }
  }, [schema, schemaLoading, tableName])

  const handleRunQuery = async (sql: string) => {
    try {
      const result = await runSQLMutation.mutateAsync(sql)
      setCurrentData(result)
      
      // 根据结果生成列定义
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
      console.error('Query execution error:', error)
      alert(`查询执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  if (schemaLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-primary-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span>正在加载数据结构...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            数据工作区
          </h2>
          <span className="px-2 py-1 bg-primary-100 text-primary-800 text-sm rounded">
            {tableName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="wansan-button-secondary"
            onClick={onReset}
          >
            重新导入
          </button>
          <button className="wansan-button-primary">
            导出报表
          </button>
        </div>
      </div>

      {/* 查询面板 */}
      <QueryPanel 
        schema={schema}
        onRunQuery={handleRunQuery}
        isLoading={runSQLMutation.isPending}
      />

      {/* 数据表格 */}
      {currentData.length > 0 && currentColumns.length > 0 && (
        <div className="wansan-card">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">查询结果</h3>
            <p className="text-sm text-gray-500">
              显示 {currentData.length} 条记录
            </p>
          </div>
          <DataTable 
            data={currentData} 
            columns={currentColumns}
          />
        </div>
      )}

      {/* 空状态 */}
      {currentData.length === 0 && !runSQLMutation.isPending && (
        <div className="wansan-card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            暂无查询结果
          </h3>
          <p className="text-gray-500">
            请在上方查询面板中输入 SQL 语句或自然语言描述
          </p>
        </div>
      )}
    </div>
  )
}

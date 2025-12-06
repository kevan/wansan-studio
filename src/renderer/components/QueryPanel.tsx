import React, { useState } from 'react'
import { useGenerateSQL } from '../hooks/useIPC'

interface QueryPanelProps {
  schema: any
  onRunQuery: (sql: string) => void
  isLoading: boolean
}

export function QueryPanel({ schema, onRunQuery, isLoading }: QueryPanelProps) {
  const [queryMode, setQueryMode] = useState<'natural' | 'sql'>('natural')
  const [naturalQuery, setNaturalQuery] = useState('')
  const [sqlQuery, setSqlQuery] = useState('')
  
  const generateSQLMutation = useGenerateSQL()

  const handleNaturalQuery = async () => {
    if (!naturalQuery.trim()) {
      alert('请输入查询描述')
      return
    }

    try {
      const generatedSQL = await generateSQLMutation.mutateAsync({
        prompt: naturalQuery,
        schema
      })
      setSqlQuery(generatedSQL)
      setQueryMode('sql')
    } catch (error) {
      console.error('Generate SQL error:', error)
      alert(`SQL 生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleRunSQL = () => {
    if (!sqlQuery.trim()) {
      alert('请输入 SQL 语句')
      return
    }
    onRunQuery(sqlQuery)
  }

  return (
    <div className="wansan-card">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">数据查询</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                queryMode === 'natural'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setQueryMode('natural')}
            >
              自然语言
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                queryMode === 'sql'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setQueryMode('sql')}
            >
              SQL 查询
            </button>
          </div>
        </div>

        {queryMode === 'natural' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述您想要查询的内容
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="例如：显示销售额最高的前10个产品"
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <button
                className="wansan-button-primary"
                onClick={handleNaturalQuery}
                disabled={generateSQLMutation.isPending || !naturalQuery.trim()}
              >
                {generateSQLMutation.isPending ? '生成中...' : '生成 SQL'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SQL 查询语句
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                rows={4}
                placeholder="SELECT * FROM table_name WHERE ..."
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <button
                className="wansan-button-primary"
                onClick={handleRunSQL}
                disabled={isLoading || !sqlQuery.trim()}
              >
                {isLoading ? '执行中...' : '执行查询'}
              </button>
              <button
                className="wansan-button-secondary"
                onClick={() => setSqlQuery('')}
              >
                清空
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 表结构信息 */}
      {schema && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">表结构信息</h4>
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-sm">
              <span className="font-medium">表名:</span> {schema.tableName}
            </div>
            <div className="mt-2">
              <span className="text-sm font-medium">字段:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {schema.columns?.map((col: any, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    <span className="font-medium">{col.name}</span>
                    <span className="ml-1 text-gray-500">({col.type})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

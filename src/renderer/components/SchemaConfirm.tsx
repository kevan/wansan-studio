import React, { useState } from 'react'
import { useFileStore, FileAsset, ColumnSchema } from '../stores/useFileStore'

interface SchemaConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

export function SchemaConfirm({ onConfirm, onCancel }: SchemaConfirmProps) {
  const { files, activeFileId, setActiveFile, toggleKeyColumn, relations } =
    useFileStore()
  const readyFiles = files.filter(f => f.status === 'ready')

  // 如果没有 ready 的文件，不显示
  if (readyFiles.length === 0) return null

  // 确保有选中的文件
  const currentFileId =
    activeFileId && readyFiles.find(f => f.id === activeFileId)
      ? activeFileId
      : readyFiles[0]?.id

  const currentFile = readyFiles.find(f => f.id === currentFileId)

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* 顶部标题区 - 固定 */}
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">
          确认数据结构
        </h2>
        <p className="text-sm text-zinc-500">
          检查字段类型，并标记关联键（🔑）以便多表 Join 分析
        </p>
      </div>

      {/* Tabs 切换多个文件 - 固定 */}
      {readyFiles.length > 1 && (
        <div className="flex-shrink-0 flex gap-1 mb-4 border-b border-zinc-200">
          {readyFiles.map(file => (
            <button
              key={file.id}
              onClick={() => setActiveFile(file.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                file.id === currentFileId
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {file.name}
              {file.columns.some(c => c.isKey) && (
                <span className="ml-1">🔑</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 当前文件的 Schema 表格 - 可滚动区域 */}
      {currentFile && (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {/* 文件信息头 */}
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <span className="font-medium text-zinc-900">
                  {currentFile.name}
                </span>
                <span className="ml-2 text-sm text-zinc-500">
                  {currentFile.rowCount?.toLocaleString()} 行 ·{' '}
                  {currentFile.columns.length} 列
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                表名: {currentFile.tableName}
              </span>
            </div>

            {/* 列表格 */}
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">Key</th>
                  <th className="px-4 py-3">字段名</th>
                  <th className="px-4 py-3 w-32">类型</th>
                  <th className="px-4 py-3 w-24">可空</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {currentFile.columns.map((col, idx) => (
                  <ColumnRow
                    key={col.name}
                    column={col}
                    fileId={currentFile.id}
                    onToggleKey={() =>
                      toggleKeyColumn(currentFile.id, col.name)
                    }
                    isLinked={relations.some(
                      r =>
                        (r.fileAId === currentFile.id &&
                          r.columnA === col.name) ||
                        (r.fileBId === currentFile.id && r.columnB === col.name)
                    )}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 底部操作按钮 - 固定在底部 */}
      <div className="flex-shrink-0 flex items-center justify-between mt-6 pt-4 border-t border-zinc-200 bg-zinc-50">
        <div className="text-sm text-zinc-500">
          {readyFiles.length} 个数据源已就绪
          {relations.length > 0 && (
            <span className="ml-2 text-indigo-600">
              · {relations.length} 个自动检测的关联
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="wansan-button wansan-button-secondary"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="wansan-button wansan-button-primary"
          >
            开始分析
          </button>
        </div>
      </div>
    </div>
  )
}

// 列行组件
interface ColumnRowProps {
  column: ColumnSchema
  fileId: string
  onToggleKey: () => void
  isLinked: boolean
}

function ColumnRow({ column, onToggleKey, isLinked }: ColumnRowProps) {
  return (
    <tr className="hover:bg-zinc-50 transition-colors">
      <td className="px-4 py-3">
        <button
          onClick={onToggleKey}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            column.isKey
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
          }`}
          title={column.isKey ? '取消关联键' : '设为关联键'}
        >
          🔑
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-zinc-900">{column.name}</span>
        {isLinked && (
          <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
            🔗 已关联
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-zinc-600 bg-zinc-100 px-2 py-1 rounded">
          {column.type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs ${column.nullable ? 'text-zinc-400' : 'text-zinc-600'}`}
        >
          {column.nullable ? 'Yes' : 'No'}
        </span>
      </td>
    </tr>
  )
}

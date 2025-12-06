/**
 * TreeNode - 树节点渲染组件
 * 根据节点类型渲染不同的图标和样式
 */

import type { NodeRendererProps } from 'react-arborist'
import {
  FileSpreadsheet,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Link2,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Key,
} from 'lucide-react'
import { TreeNodeData, ColumnDisplayType } from './tree-utils'

// 根据列类型获取图标
function getColumnIcon(columnType: ColumnDisplayType) {
  switch (columnType) {
    case 'number':
      return <Hash className="w-4 h-4 text-amber-500" />
    case 'string':
      return <Type className="w-4 h-4 text-zinc-400" />
    case 'date':
      return <Calendar className="w-4 h-4 text-blue-500" />
    case 'boolean':
      return <ToggleLeft className="w-4 h-4 text-purple-500" />
    default:
      return <HelpCircle className="w-4 h-4 text-zinc-300" />
  }
}

// 根据文件扩展名获取图标颜色
function getFileIconColor(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return 'text-blue-500'
  if (ext === 'xlsx' || ext === 'xls') return 'text-green-600'
  return 'text-zinc-500'
}

interface TreeNodeProps extends NodeRendererProps<TreeNodeData> {}

export function TreeNode({ node, style, dragHandle }: TreeNodeProps) {
  const data = node.data
  const isSelected = node.isSelected
  const isOpen = node.isOpen

  // 处理点击事件
  const handleClick = (e: React.MouseEvent) => {
    node.handleClick(e)
  }

  // 处理展开/折叠
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    node.toggle()
  }

  // 渲染展开/折叠图标
  const renderToggle = () => {
    if (node.isLeaf) {
      return <span className="w-4" /> // 占位符
    }
    return (
      <button
        onClick={handleToggle}
        className="w-4 h-4 flex items-center justify-center hover:bg-zinc-200 rounded"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-500" />
        )}
      </button>
    )
  }

  // 渲染节点图标
  const renderIcon = () => {
    switch (data.type) {
      case 'file':
        return (
          <FileSpreadsheet
            className={`w-4 h-4 ${getFileIconColor(data.fileName || data.name)}`}
          />
        )
      case 'column':
        return getColumnIcon(data.columnType || 'unknown')
      case 'group':
        return isOpen ? (
          <FolderOpen className="w-4 h-4 text-zinc-500" />
        ) : (
          <Folder className="w-4 h-4 text-zinc-500" />
        )
      case 'relation':
        return <Link2 className="w-4 h-4 text-indigo-500" />
      default:
        return null
    }
  }

  // 渲染 Key 标记
  const renderKeyBadge = () => {
    if (data.type === 'column' && data.isKey) {
      return <Key className="w-3 h-3 text-amber-500 ml-1" />
    }
    return null
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer
        text-sm select-none transition-colors
        ${
          isSelected
            ? 'bg-zinc-200 text-zinc-900'
            : 'hover:bg-zinc-100 text-zinc-700'
        }
      `}
      onClick={handleClick}
    >
      {renderToggle()}
      {renderIcon()}
      <span className="truncate flex-1">{data.name}</span>
      {renderKeyBadge()}
    </div>
  )
}

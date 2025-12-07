/**
 * DataTreeManager - 数据树管理器主组件
 * 使用 react-arborist 实现的高性能树形视图
 */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import { useFileStore } from '../../stores/useFileStore'
import { buildTreeData, TreeNodeData, parseNodeId } from './tree-utils'
import { TreeNode } from './TreeNode'

interface DataTreeManagerProps {
  width?: number | 'fill'
  height?: number | 'fill'
  className?: string
}

export function DataTreeManager({
  width = 'fill',
  height = 'fill',
  className = '',
}: DataTreeManagerProps) {
  const treeRef = useRef<TreeApi<TreeNodeData>>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 260, height: 400 })

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: width === 'fill' ? rect.width : width,
          height: height === 'fill' ? rect.height : height,
        })
      }
    }

    // 初始计算
    updateDimensions()

    // 使用 ResizeObserver 监听尺寸变化
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [width, height])

  // 从 Store 获取数据
  const { 
    files, 
    relations, 
    activeFileId, 
    setActiveFile,
    selectedNode,
    setSelectedNode
  } = useFileStore()

  // 将 Store 数据转换为树数据
  const treeData = useMemo(() => {
    return buildTreeData(files, relations)
  }, [files, relations])

  // 计算选中的节点 ID (双向绑定)
  const selectionId = useMemo(() => {
    // 优先使用详细的 selectedNode
    if (selectedNode) {
      if (selectedNode.type === 'file') return `file:${selectedNode.id}`
      if (selectedNode.type === 'column' && selectedNode.fileId && selectedNode.columnName) {
        return `col:${selectedNode.fileId}:${selectedNode.columnName}`
      }
      if (selectedNode.type === 'relation') return `rel:${selectedNode.id}`
    }

    // 回退到 activeFileId (为了向后兼容)
    if (activeFileId) return `file:${activeFileId}`
    
    return undefined
  }, [selectedNode, activeFileId])

  // 处理节点选择
  const handleSelect = useCallback(
    (nodes: TreeNodeData[]) => {
      if (nodes.length === 0) {
        // 不要轻易清除 activeFileId，除非用户明确取消选择（Tree 行为通常是点击空白不取消，除非多选）
        // 但这里如果 arborist 传回空数组，说明取消了选择
        // setSelectedNode(null) 
        return
      }

      const nodeData = nodes[0]
      const parsed = parseNodeId(nodeData.id)

      if (parsed.type === 'file') {
        setActiveFile(parsed.id)
        setSelectedNode({ id: parsed.id, type: 'file' })
      } 
      else if (parsed.type === 'column' && parsed.parentId) {
        // 选中列时，同时也激活对应的文件
        setActiveFile(parsed.parentId)
        setSelectedNode({ 
          id: parsed.id, // columnName
          type: 'column', 
          fileId: parsed.parentId, 
          columnName: parsed.id 
        })
      } 
      else if (parsed.type === 'relation') {
        // 选中关联关系
        setSelectedNode({ 
          id: parsed.id, 
          type: 'relation', 
          relationId: parsed.id 
        })
        // 关联关系可能不需要激活特定文件，或者可以激活 sourceFile
        // setActiveFile(null) // 或者保持当前不变
      }
      else if (parsed.type === 'folder') {
        // 文件夹选择通常只做展开/折叠，不做业务逻辑
        // 但为了视觉一致性，可以记录
      }
    },
    [setActiveFile, setSelectedNode]
  )

  // 禁用拖拽移动（暂不实现）
  const handleMove = useCallback(() => {
    return
  }, [])

  // 禁止所有拖拽（第一阶段不实现拖拽关联）
  const disableDrag = true
  const disableDrop = true

  // 计算实际尺寸
  const treeWidth = width === 'fill' ? dimensions.width : width
  const treeHeight = height === 'fill' ? dimensions.height : height

  return (
    <div ref={containerRef} className={`data-tree-manager h-full ${className}`}>
      {treeData.length > 0 && treeHeight > 0 ? (
        <Tree<TreeNodeData>
          ref={treeRef}
          data={treeData}
          width={treeWidth}
          height={treeHeight}
          indent={16}
          rowHeight={28}
          paddingTop={4}
          paddingBottom={4}
          openByDefault={true} 
          selection={selectionId}
          disableMultiSelection={true}
          disableDrag={disableDrag}
          disableDrop={disableDrop}
          onSelect={nodes => handleSelect(nodes.map(n => n.data))}
          onMove={handleMove}
          idAccessor={d => d.id}
          childrenAccessor={d => d.children || null}
          // 确保 folder 也能被选中（如果需要）
          // folderSelection={false} 
        >
          {TreeNode}
        </Tree>
      ) : treeData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
             {/* Simple Icon placeholder */}
             <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
          </div>
          <p className="text-sm font-medium text-zinc-900">暂无数据源</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
            请在上方点击 "导入文件" 开始使用
          </p>
        </div>
      ) : null}
    </div>
  )
}

// 导出类型
export type { TreeNodeData } from './tree-utils'
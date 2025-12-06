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
  const { files, relations, activeFileId, setActiveFile } = useFileStore()

  // 将 Store 数据转换为树数据
  const treeData = useMemo(() => {
    return buildTreeData(files, relations)
  }, [files, relations])

  // 计算选中的节点 ID
  const selectedNodeId = useMemo(() => {
    if (!activeFileId) return undefined
    return `file_${activeFileId}`
  }, [activeFileId])

  // 处理节点选择
  const handleSelect = useCallback(
    (nodes: TreeNodeData[]) => {
      if (nodes.length === 0) {
        setActiveFile(null)
        return
      }

      const selectedNode = nodes[0]
      const parsed = parseNodeId(selectedNode.id)

      if (parsed.type === 'file') {
        setActiveFile(parsed.id)
      } else if (parsed.type === 'column' && parsed.parentId) {
        setActiveFile(parsed.parentId)
      }
    },
    [setActiveFile]
  )

  // 禁用拖拽移动（暂不实现）
  const handleMove = useCallback(() => {
    // 不执行任何操作，防止节点移动
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
          selection={selectedNodeId}
          disableMultiSelection={true}
          disableDrag={disableDrag}
          disableDrop={disableDrop}
          onSelect={nodes => handleSelect(nodes.map(n => n.data))}
          onMove={handleMove}
          idAccessor={d => d.id}
          childrenAccessor={d => d.children || null}
        >
          {TreeNode}
        </Tree>
      ) : treeData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500">暂无数据源</p>
          <p className="text-xs text-zinc-400 mt-1">导入文件后将在此显示</p>
        </div>
      ) : null}
    </div>
  )
}

// 导出类型和工具函数
export type { TreeNodeData } from './tree-utils'
export { parseNodeId, buildTreeData } from './tree-utils'
export { TreeNode } from './TreeNode'

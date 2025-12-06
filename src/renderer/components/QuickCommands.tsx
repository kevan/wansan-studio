import React from 'react'

export interface QuickCommand {
  id: string
  label: string
  icon: string
  query: string
  category: 'analysis' | 'visualization' | 'summary' | 'comparison'
  description?: string
}

// 预设的快捷指令
export const defaultQuickCommands: QuickCommand[] = [
  // 分析类
  {
    id: 'sales-trend',
    label: '销售趋势',
    icon: '📈',
    query: '显示销售额的时间趋势图',
    category: 'analysis',
    description: '分析销售数据的时间变化趋势'
  },
  {
    id: 'top-10',
    label: 'TOP 10',
    icon: '🏆',
    query: '显示销售额前10名的数据',
    category: 'analysis',
    description: '找出表现最好的前10项'
  },
  {
    id: 'monthly-summary',
    label: '月度汇总',
    icon: '📊',
    query: '按月汇总所有数据',
    category: 'summary',
    description: '生成月度数据汇总报表'
  },
  
  // 可视化类
  {
    id: 'pie-chart',
    label: '占比分析',
    icon: '🥧',
    query: '用饼图显示各类别的占比',
    category: 'visualization',
    description: '展示不同类别的比例关系'
  },
  {
    id: 'bar-chart',
    label: '对比图表',
    icon: '📊',
    query: '用柱状图对比不同项目',
    category: 'visualization',
    description: '直观对比各项数据大小'
  },
  
  // 对比类
  {
    id: 'year-over-year',
    label: '同比分析',
    icon: '📅',
    query: '对比去年同期数据',
    category: 'comparison',
    description: '分析年度数据变化'
  },
  {
    id: 'growth-rate',
    label: '增长率',
    icon: '📈',
    query: '计算各项数据的增长率',
    category: 'comparison',
    description: '分析数据增长情况'
  }
]

interface QuickCommandChipProps {
  command: QuickCommand
  onClick: (command: QuickCommand) => void
  disabled?: boolean
  className?: string
}

export function QuickCommandChip({ 
  command, 
  onClick, 
  disabled = false, 
  className = "" 
}: QuickCommandChipProps) {
  const categoryColors = {
    analysis: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    visualization: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    summary: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    comparison: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
  }

  return (
    <button
      onClick={() => onClick(command)}
      disabled={disabled}
      title={command.description}
      className={`
        inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
        border transition-colors duration-200
        ${disabled 
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
          : categoryColors[command.category]
        }
        ${className}
      `}
    >
      <span className="text-base">{command.icon}</span>
      <span>{command.label}</span>
    </button>
  )
}

interface QuickCommandsProps {
  commands?: QuickCommand[]
  onCommandClick: (command: QuickCommand) => void
  disabled?: boolean
  className?: string
  maxVisible?: number
}

export function QuickCommands({ 
  commands = defaultQuickCommands,
  onCommandClick,
  disabled = false,
  className = "",
  maxVisible = 6
}: QuickCommandsProps) {
  const visibleCommands = commands.slice(0, maxVisible)
  const hasMore = commands.length > maxVisible

  return (
    <div className={`${className}`}>
      <div className="flex flex-wrap gap-2">
        {visibleCommands.map((command) => (
          <QuickCommandChip
            key={command.id}
            command={command}
            onClick={onCommandClick}
            disabled={disabled}
          />
        ))}
        
        {hasMore && (
          <button
            disabled={disabled}
            className={`
              inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium
              border border-gray-200 transition-colors duration-200
              ${disabled 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <span>更多</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

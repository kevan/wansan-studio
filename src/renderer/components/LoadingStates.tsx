import React from 'react'

export type LoadingType = 'cleaning' | 'thinking' | 'crunching' | 'fixing'

interface LoadingStateProps {
  type: LoadingType
  message?: string
  className?: string
}

const loadingConfig = {
  cleaning: {
    icon: '🧹',
    defaultMessage: 'Cleaning Data...',
    description: '正在清洗和处理您的数据',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  thinking: {
    icon: '🤔',
    defaultMessage: 'Thinking...',
    description: 'AI 正在分析您的需求',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  crunching: {
    icon: '⚡',
    defaultMessage: 'Crunching Numbers...',
    description: '正在执行数据查询和计算',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  fixing: {
    icon: '🔧',
    defaultMessage: 'Auto-fixing SQL...',
    description: '检测到查询错误，正在自动修复',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
}

export function LoadingState({ type, message, className = "" }: LoadingStateProps) {
  const config = loadingConfig[type]
  const displayMessage = message || config.defaultMessage

  return (
    <div className={`
      flex items-center justify-center p-8 rounded-lg border-2 border-dashed
      ${config.bgColor} ${config.borderColor} ${className}
    `}>
      <div className="text-center">
        {/* 动画图标 */}
        <div className="text-4xl mb-4 animate-bounce">
          {config.icon}
        </div>
        
        {/* 主要消息 */}
        <div className={`text-lg font-medium mb-2 ${config.color}`}>
          {displayMessage}
        </div>
        
        {/* 描述文本 */}
        <div className="text-sm text-gray-600">
          {config.description}
        </div>
        
        {/* 加载动画点 */}
        <div className="flex justify-center mt-4 space-x-1">
          <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`}></div>
          <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`} style={{ animationDelay: '0.2s' }}></div>
          <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`} style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  )
}

// 骨架屏组件
export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-4">
        {/* 标题骨架 */}
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        
        {/* 内容骨架 */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        
        {/* 图表骨架 */}
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

// 内联加载指示器
interface InlineLoadingProps {
  type: LoadingType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function InlineLoading({ type, size = 'md', className = "" }: InlineLoadingProps) {
  const config = loadingConfig[type]
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }
  
  return (
    <div className={`flex items-center gap-2 ${config.color} ${sizeClasses[size]} ${className}`}>
      <div className="animate-spin">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <span>{config.defaultMessage}</span>
    </div>
  )
}

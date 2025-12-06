import React, { useState, useRef, useEffect } from 'react'

interface MagicInputProps {
  onSubmit: (query: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MagicInput({ 
  onSubmit, 
  disabled = false, 
  placeholder = "用自然语言描述你想要的报表...",
  className = ""
}: MagicInputProps) {
  const [query, setQuery] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整文本框高度
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [query])

  const handleSubmit = () => {
    if (query.trim() && !disabled) {
      onSubmit(query.trim())
      setQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="flex items-end gap-3 p-4">
        {/* 输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none border-0 outline-none text-gray-900 placeholder-gray-500 text-sm leading-6 min-h-[24px] max-h-[120px] overflow-y-auto"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#e5e7eb transparent'
            }}
          />
        </div>

        {/* 发送按钮 */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !query.trim()}
          className={`
            flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors
            ${disabled || !query.trim() 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700'
            }
          `}
          title="发送 (Enter)"
        >
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
        </button>
      </div>

      {/* 提示文本 */}
      <div className="px-4 pb-3 text-xs text-gray-400">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  )
}

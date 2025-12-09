import React, { useState, useRef, useEffect } from 'react'

export interface AutocompleteOption {
  id: string
  label: string
  value: string
  type: 'column' | 'function' | 'keyword'
  description?: string
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  options: AutocompleteOption[]
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function AutocompleteInput({
  value,
  onChange,
  onSubmit,
  options,
  disabled = false,
  placeholder = '输入查询...',
  className = '',
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>(
    []
  )
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isComposing, setIsComposing] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 过滤选项
  useEffect(() => {
    if (!value.trim()) {
      setFilteredOptions([])
      setIsOpen(false)
      return
    }

    // 获取当前光标位置的词
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const words = textBeforeCursor.split(/\s+/)
    const currentWord = words[words.length - 1]

    if (currentWord.length < 2) {
      setFilteredOptions([])
      setIsOpen(false)
      return
    }

    const filtered = options
      .filter(
        option =>
          option.label.toLowerCase().includes(currentWord.toLowerCase()) ||
          option.value.toLowerCase().includes(currentWord.toLowerCase())
      )
      .slice(0, 8) // 最多显示8个选项

    setFilteredOptions(filtered)
    setIsOpen(filtered.length > 0)
    setSelectedIndex(-1)
  }, [value, options])

  // 自动调整高度
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return

    if (isOpen && filteredOptions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          break
        case 'Enter':
          if (selectedIndex >= 0) {
            e.preventDefault()
            selectOption(filteredOptions[selectedIndex])
          } else if (!e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSelectedIndex(-1)
          break
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const selectOption = (option: AutocompleteOption) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const textAfterCursor = value.slice(cursorPos)

    // 替换当前词
    const words = textBeforeCursor.split(/\s+/)
    words[words.length - 1] = option.value
    const newTextBefore = words.join(' ')

    const newValue = newTextBefore + textAfterCursor
    onChange(newValue)

    setIsOpen(false)
    setSelectedIndex(-1)

    // 设置光标位置
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = newTextBefore.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }
    }, 0)
  }

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value.trim())
      setIsOpen(false)
    }
  }

  const getOptionIcon = (type: AutocompleteOption['type']) => {
    switch (type) {
      case 'column':
        return '📊'
      case 'function':
        return '⚡'
      case 'keyword':
        return '🔤'
      default:
        return '💡'
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-end gap-3 p-4">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none border-0 outline-none text-gray-900 placeholder-gray-500 text-sm leading-6 min-h-[24px] max-h-[120px] overflow-y-auto"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className={`
              flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors
              ${
                disabled || !value.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }
            `}
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
      </div>

      {/* 自动完成下拉框 */}
      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {filteredOptions.map((option, index) => (
            <button
              key={option.id}
              onClick={() => selectOption(option)}
              className={`
                w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3
                ${index === selectedIndex ? 'bg-orange-50 border-l-2 border-orange-500' : ''}
                ${index === 0 ? 'rounded-t-lg' : ''}
                ${index === filteredOptions.length - 1 ? 'rounded-b-lg' : ''}
              `}
            >
              <span className="text-lg">{getOptionIcon(option.type)}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-500">
                    {option.description}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {option.value}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

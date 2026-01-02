import React, { useEffect, useState } from 'react'
import { Edit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface VizHeaderProps {
  title: string
  subtitle?: string
  logo?: string
  timestamp?: number
  className?: string
  onTitleChange?: (newTitle: string) => void
  isEditable?: boolean
  showTimestamp?: boolean
  actions?: React.ReactNode
  size?: 'sm' | 'base'
  showBorder?: boolean
}

export function VizHeader({
  title,
  subtitle,
  logo,
  timestamp = Date.now(),
  className = '',
  onTitleChange,
  isEditable = false,
  showTimestamp = true,
  actions,
  size = 'base',
  showBorder = false,
}: VizHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const { t } = useTranslation('common')

  useEffect(() => {
    setEditTitle(title)
  }, [title])

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== title && onTitleChange) {
      onTitleChange(editTitle.trim())
    }
    setIsEditing(false)
  }

  const titleSizeClass = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <header
      className={cn(
        showBorder && 'border-b border-zinc-200 pb-4 mb-4',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className={`${titleSizeClass} font-bold text-zinc-900 mb-1 w-full border-b border-indigo-500 focus:outline-none bg-transparent`}
            />
          ) : (
            <h1
              className={`${titleSizeClass} font-bold text-zinc-900 mb-0.5 group flex items-center gap-2 ${isEditable ? 'cursor-pointer hover:text-indigo-600' : ''}`}
              onClick={() => isEditable && setIsEditing(true)}
              title={isEditable ? t('edit_title_tooltip') : undefined}
            >
              {title}
              {isEditable && (
                <Edit2 className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </h1>
          )}
          {subtitle && (
            <p className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} text-zinc-500`}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {actions}
          {logo && (
            <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
          )}
          {showTimestamp && (
            <div className="text-right text-xs text-zinc-400">
              <div>{t('generated_time')}</div>
              <div className="font-mono">
                {new Date(timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

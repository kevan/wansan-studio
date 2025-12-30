import React, { useEffect, useState } from 'react'
import { Edit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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

  return (
    <header className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
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
              className="text-2xl font-bold text-gray-900 mb-1 w-full border-b border-orange-500 focus:outline-none bg-transparent"
            />
          ) : (
            <h1
              className={`text-2xl font-bold text-gray-900 mb-1 group flex items-center gap-2 ${isEditable ? 'cursor-pointer hover:text-orange-600' : ''}`}
              onClick={() => isEditable && setIsEditing(true)}
              title={isEditable ? t('edit_title_tooltip') : undefined}
            >
              {title}
              {isEditable && (
                <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </h1>
          )}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {actions}
          {logo && (
            <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
          )}
          {showTimestamp && (
            <div className="text-right text-sm text-gray-500">
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

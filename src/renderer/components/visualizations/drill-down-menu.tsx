import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Search, Table2, Sparkles, Layers } from 'lucide-react'

interface DrillDownMenuProps {
  x: number
  y: number
  dataName: string
  /** Dimension columns available for breakdown */
  dimensions?: string[]
  /** Called when user selects "Focus" */
  onFocus: () => void
  /** Called when user selects "View Data" */
  onViewData: () => void
  /** Called when user selects a dimension for breakdown */
  onBreakdown?: (dimension: string) => void
  /** Called when user selects "AI Insight" */
  onInsight?: () => void
  onClose: () => void
}

export function DrillDownMenu({
  x,
  y,
  dataName,
  dimensions = [],
  onFocus,
  onViewData,
  onBreakdown,
  onInsight,
  onClose,
}: DrillDownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('common')
  const [showBreakdownSub, setShowBreakdownSub] = useState(false)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Boundary-aware positioning
  const style: React.CSSProperties = {
    top: Math.min(y + 10, window.innerHeight - 300),
    left: Math.min(x + 10, window.innerWidth - 200),
  }

  const menuItemClass =
    'w-full text-left px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 rounded-lg flex items-center gap-2.5 transition-colors relative'

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white/95 backdrop-blur-xl border border-zinc-200/80 rounded-xl shadow-2xl p-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
      style={style}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-100 mb-1">
        <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
          {t('selected_data')}
        </div>
        <div className="text-sm font-semibold text-zinc-900 truncate max-w-[180px] mt-0.5">
          {dataName}
        </div>
      </div>

      {/* Focus */}
      <button
        onClick={e => {
          e.stopPropagation()
          onFocus()
        }}
        className={menuItemClass}
      >
        <Search className="w-4 h-4 text-blue-500" />
        <span>{t('focus_chat')}</span>
      </button>

      {/* View Data */}
      <button
        onClick={e => {
          e.stopPropagation()
          onViewData()
        }}
        className={menuItemClass}
      >
        <Table2 className="w-4 h-4 text-zinc-500" />
        <span>{t('data_detail')}</span>
      </button>

      {/* Breakdown - with submenu */}
      {dimensions.length > 0 && onBreakdown && (
        <div
          className="relative"
          onMouseEnter={() => setShowBreakdownSub(true)}
          onMouseLeave={() => setShowBreakdownSub(false)}
        >
          <button className={`${menuItemClass} justify-between`}>
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>{t('breakdown_by') || 'Breakdown by...'}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>

          {/* Submenu */}
          {showBreakdownSub && (
            <div className="absolute left-full top-0 ml-1 bg-white/95 backdrop-blur-xl border border-zinc-200/80 rounded-xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in slide-in-from-left-2 duration-100">
              {dimensions.map(dim => (
                <button
                  key={dim}
                  onClick={e => {
                    e.stopPropagation()
                    onBreakdown(dim)
                    onClose()
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  {dim}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      {onInsight && <div className="h-px bg-zinc-100 my-1" />}

      {/* AI Insight */}
      {onInsight && (
        <button
          onClick={e => {
            e.stopPropagation()
            onInsight()
          }}
          className={`${menuItemClass} text-indigo-600 hover:bg-indigo-50`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('ai_insight') || 'Explain with AI'}</span>
        </button>
      )}
    </div>
  )
}

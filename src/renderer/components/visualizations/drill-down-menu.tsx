import React, { useEffect, useRef } from 'react'

interface DrillDownMenuProps {
  x: number
  y: number
  dataName: string
  onFocus: () => void
  onViewData: () => void
  onClose: () => void
}

export function DrillDownMenu({
  x,
  y,
  dataName,
  onFocus,
  onViewData,
  onClose,
}: DrillDownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Prevent menu from going off-screen (basic boundary check)
  // Simple clamping logic could be added here if needed, 
  // but for now relying on chart padding is usually okay.
  const style: React.CSSProperties = {
    top: y + 10,
    left: x + 10,
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-zinc-200 rounded-lg shadow-xl p-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
      style={style}
    >
      <div className="px-3 py-2 border-b border-zinc-50 mb-1">
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
          Selected
        </div>
        <div className="text-sm font-semibold text-zinc-800 truncate max-w-[180px]">
          {dataName}
        </div>
      </div>

      <button
        onClick={e => {
          e.stopPropagation()
          onFocus()
        }}
        className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center gap-2 transition-colors"
      >
        <span>🔍</span> Focus Analysis
      </button>

      <button
        onClick={e => {
          e.stopPropagation()
          onViewData()
        }}
        className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 rounded-md flex items-center gap-2 transition-colors"
      >
        <span>📄</span> View Raw Data
      </button>
    </div>
  )
}

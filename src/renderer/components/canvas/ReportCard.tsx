import React, { forwardRef, useRef, useState } from 'react'
import { DashboardWidget } from '../DashboardWidget'
import { X, GripHorizontal, Download, MoreVertical, FileImage } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useToastStore } from '../../stores/useToastStore'

interface ReportCardProps {
  report: any
  onRemove: () => void
  onTitleChange: (newTitle: string) => void
  style?: React.CSSProperties
  className?: string
  onMouseDown?: React.MouseEventHandler
  onMouseUp?: React.MouseEventHandler
  onTouchEnd?: React.TouchEventHandler
}

export const ReportCard = forwardRef<HTMLDivElement, ReportCardProps>(
  ({ report, onRemove, onTitleChange, style, className, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const [showMenu, setShowMenu] = useState(false)
    const addToast = useToastStore(state => state.addToast)

    // Merge refs
    React.useImperativeHandle(ref, () => cardRef.current!)

    const handleExportImage = async () => {
      if (!cardRef.current) return
      setShowMenu(false)

      try {
        const dataUrl = await toPng(cardRef.current, {
          backgroundColor: '#ffffff',
          filter: (node) => {
            // Exclude controls from the screenshot
            return (
              !node.classList?.contains('card-controls') &&
              !node.classList?.contains('hide-on-export')
            )
          }
        })
        
        // @ts-ignore
        const result = await window.electronAPI.saveImage(dataUrl)
        
        if (result.success) {
          addToast({
            title: 'Image Saved',
            description: 'Report exported successfully',
            type: 'success',
          })
        } else if (result.error !== 'Cancelled') {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('Export failed', error)
        addToast({
          title: 'Export Failed',
          description: 'Could not save image',
          type: 'error',
        })
      }
    }

    return (
      <div
        ref={cardRef}
        style={style}
        className={`${className} group relative bg-white border border-zinc-200 shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-all flex flex-col no-break`}
        {...props}
      >
        {/* Drag Handle */}
        <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing drag-handle z-20 hover:bg-zinc-50 transition-colors opacity-0 group-hover:opacity-100 card-controls">
          <GripHorizontal className="w-4 h-4 text-zinc-300" />
        </div>

        {/* Controls */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex gap-2 card-controls">
          <div className="relative">
            <button
               onClick={(e) => {
                 e.stopPropagation()
                 setShowMenu(!showMenu)
               }}
               onMouseDown={e => e.stopPropagation()}
               className="p-1.5 bg-white text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-md border border-zinc-200 shadow-sm transition-colors cursor-pointer"
               title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }} 
                />
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg border border-zinc-200 py-1 z-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExportImage()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                  >
                    <FileImage className="w-4 h-4" />
                    Export PNG
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={e => {
              e.stopPropagation()
              onRemove()
            }}
            onMouseDown={e => e.stopPropagation()}
            className="p-1.5 bg-white text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md border border-zinc-200 shadow-sm transition-colors cursor-pointer"
            title="Remove from Dashboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 pt-4">
          <DashboardWidget
            {...report.reportData}
            variant="dashboard"
            onTitleChange={onTitleChange}
            className="h-full"
          />
        </div>
      </div>
    )
  }
)

ReportCard.displayName = 'ReportCard'

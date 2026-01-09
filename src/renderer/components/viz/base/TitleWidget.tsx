import { useEffect, useRef } from 'react'
import { useProjectStore } from '../../../stores/useProjectStore'

export function TitleWidget({
  id,
  content,
  readOnly = false,
}: {
  id: string
  content: string
  readOnly?: boolean
}) {
  const updateWidgetData = useProjectStore(s => s.updateWidgetData)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  return (
    <div className="w-full h-full p-6 flex items-center justify-center">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => updateWidgetData(id, { content: e.target.value })}
        className="w-full bg-transparent resize-none outline-none text-4xl font-bold text-zinc-900 placeholder:text-zinc-300 overflow-hidden text-center disabled:cursor-default"
        placeholder="Untitled Report"
        rows={1}
        disabled={readOnly}
      />
    </div>
  )
}

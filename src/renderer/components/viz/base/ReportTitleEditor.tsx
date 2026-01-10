import React from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useProjectStore } from '../../../stores/useProjectStore'
import { cn } from '@/utils/cn'

import { useTranslation } from 'react-i18next'

interface ReportTitleEditorProps {
  id: string
  content: string
  readOnly?: boolean
  className?: string
  placeholder?: string
}

export function ReportTitleEditor({
  id,
  content,
  readOnly = false,
  className,
  placeholder,
}: ReportTitleEditorProps) {
  const { t } = useTranslation('common')
  const updateWidgetData = useProjectStore(s => s.updateWidgetData)

  return (
    <TextareaAutosize
      value={content}
      onChange={e => updateWidgetData(id, { content: e.target.value })}
      disabled={readOnly}
      placeholder={placeholder || t('untitled_section')}
      className={cn(
        'w-full resize-none bg-transparent outline-none border-none p-0 m-0',
        'text-zinc-900 placeholder:text-zinc-300 font-bold leading-tight',
        'focus:ring-0 focus:outline-none',
        className
      )}
      minRows={1}
    />
  )
}

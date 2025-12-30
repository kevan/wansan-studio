import React from 'react'
import { useTranslation } from 'react-i18next'

interface VizSummaryProps {
  content: string
  insights?: string[]
  className?: string
}

export function VizSummary({
  content,
  insights,
  className = '',
}: VizSummaryProps) {
  const { t } = useTranslation('common')
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <div className="text-gray-700 leading-relaxed mb-4">{content}</div>

      {insights && insights.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r">
          <h4 className="text-sm font-semibold text-orange-800 mb-2">
            💡 {t('insights')}
          </h4>
          <ul className="text-sm text-orange-700 space-y-1">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

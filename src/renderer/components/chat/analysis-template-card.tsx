import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { AIAnalysisResult } from '@shared/types'

interface AnalysisTemplateCardProps {
  result: AIAnalysisResult
  onOpenModal: () => void
  isExecuted?: boolean
}

export function AnalysisTemplateCard({
  result,
  onOpenModal,
  isExecuted,
}: AnalysisTemplateCardProps) {
  return (
    <div className="w-full rounded-lg border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0 rounded-full bg-indigo-100 p-2 text-indigo-600">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-zinc-900">
            {result.title || "Analysis Template"}
          </h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {result.summary || "This analysis requires parameter configuration."}
          </p>
          
          <div className="pt-2">
            <Button 
              onClick={onOpenModal} 
              variant="outline" 
              size="sm"
              className="bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
              {isExecuted ? "Modify Parameters" : "Configure Parameters"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

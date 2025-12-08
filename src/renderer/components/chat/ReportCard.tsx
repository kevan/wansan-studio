import React from 'react';
import { Pin } from 'lucide-react';
import { DashboardWidget } from '../DashboardWidget';
import { ReportData, useWorkbenchStore } from '../../stores/useWorkbenchStore';
import { cn } from '../../utils/cn';

interface ReportCardProps {
  messageId: string;
  reportData: ReportData;
  className?: string;
}

export function ReportCard({ messageId, reportData, className }: ReportCardProps) {
  const pinReport = useWorkbenchStore((state) => state.pinReport);
  const pinnedReports = useWorkbenchStore((state) => state.pinnedReports);
  
  const isPinned = pinnedReports.some(r => r.sourceMessageId === messageId);

  const handlePin = () => {
    if (!isPinned) {
      pinReport(messageId, reportData);
    }
  };

  return (
    <div className={cn("flex flex-col border border-zinc-200 rounded-lg bg-white shadow-sm transition-all overflow-hidden h-full", className)}>
      {/* Toolbar Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-zinc-50/50">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Analysis Report</span>
        <button 
            onClick={handlePin}
            disabled={isPinned}
            className={cn(
                "p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium",
                isPinned 
                    ? "text-orange-600 bg-orange-50 cursor-default" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            )}
            title={isPinned ? "Pinned to Canvas" : "Pin to Canvas"}
        >
            <Pin className="w-3.5 h-3.5" />
            {isPinned ? "Pinned" : "Pin"}
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0">
        <DashboardWidget {...reportData} variant="chat" />
      </div>
    </div>
  );
}

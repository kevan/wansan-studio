import { create } from 'zustand';

export interface ReportData {
  title: string;
  subtitle?: string;
  summary?: string;
  insights?: string[];
  sql?: string;
  reasoning?: string;
  suggestions?: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  chartTitle?: string;
  tableData?: Array<Record<string, any>>;
  vizConfig?: {
    x_axis: string;
    y_axis: string;
    series_name?: string;
  };
}

export interface ReportWidget {
  id: string;
  sourceMessageId: string;
  reportData: ReportData;
}

interface WorkbenchState {
  pinnedReports: ReportWidget[];
  pinReport: (messageId: string, reportData: ReportData) => void;
  removeReport: (reportId: string) => void;
  updateReportTitle: (reportId: string, newTitle: string) => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  pinnedReports: [],
  pinReport: (messageId, reportData) => set((state) => {
      // Check if already pinned to avoid duplicates for the same message
      if (state.pinnedReports.some(r => r.sourceMessageId === messageId)) {
          return state;
      }
      return {
          pinnedReports: [...state.pinnedReports, {
              id: crypto.randomUUID(),
              sourceMessageId: messageId,
              reportData
          }]
      };
  }),
  updateReportTitle: (reportId, newTitle) => set((state) => ({
    pinnedReports: state.pinnedReports.map((r) =>
      r.id === reportId ? { ...r, reportData: { ...r.reportData, title: newTitle } } : r
    ),
  })),
  removeReport: (reportId) => set((state) => ({
    pinnedReports: state.pinnedReports.filter((r) => r.id !== reportId),
  })),
}));

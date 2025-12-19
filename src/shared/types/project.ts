import { Message } from './chat';
import { ReportWidget, ReportData } from './dashboard';
import { FileNode, RelationSuggestion } from '../types';

export interface Relation {
  id: string;
  fileAId: string;
  columnA: string;
  fileBId: string;
  columnB: string;
  autoDetected?: boolean;
}

export type ViewMode = 'chat' | 'schema' | 'relationships';

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  messages: Message[];
  replyToId?: string;
  dashboard: {
    widgets: ReportWidget[];
    layoutMode: 'a4' | 'screen';
    pageCount: number;
    zoom: number;
  };
}

export interface ProjectData {
  meta: {
    id: string;
    name: string;
    version: '1.1.0';
    created: number;
  };
  files: FileNode[];       // Shared Data Assets
  relations: Relation[];   // Shared Data Logic
  sessions: Session[];     // Multi-Session Content
  activeSessionId: string;
  activeView: ViewMode;
  activeFileId: string | null;
  widgetRegistry: Record<string, ReportData>;
}

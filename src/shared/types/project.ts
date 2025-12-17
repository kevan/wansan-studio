import { Message } from './chat';
import { ReportWidget } from './dashboard';
import { FileNode, RelationSuggestion } from '../types';

export type Relation = RelationSuggestion;

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  messages: Message[];
  dashboard: {
    widgets: ReportWidget[];
    layoutMode: 'a4' | 'screen';
    pageCount: number;
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
}

# 🏗️ Spec: Project Store V2 (Session-Centric)

> **Goal**: Replace the fragmented `ChatStore` and `WorkbenchStore` with a unified `ProjectStore` that manages multiple sessions.
> **Scope**: Data Model, Serialization, IO.

## 1. Data Model (`src/shared/types/project.ts`)

```typescript
import { Message } from './chat'; // Existing
import { ReportWidget } from './dashboard'; // Existing
import { FileNode, Relation } from './files'; // Existing

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
```

## 2. Store Implementation (`src/renderer/src/stores/useProjectStore.ts`)

This store replaces `useFileStore`, `useChatStore`, and `useWorkbenchStore` for project-specific data.

```typescript
import { create } from 'zustand';
import { ProjectData, Session } from '@/shared/types/project';

interface ProjectState extends ProjectData {
  // --- Actions ---
  
  // 1. Session Management
  createSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;

  // 2. Chat Actions (Targeting Active Session)
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, update: Partial<Message>) => void;

  // 3. Dashboard Actions (Targeting Active Session)
  addWidget: (widget: ReportWidget) => void;
  removeWidget: (id: string) => void;
  updateLayout: (layout: any) => void;

  // 4. File Actions (Global)
  addFile: (file: FileNode) => void;
  // ...
  
  // 5. IO
  loadProject: (data: ProjectData) => void;
  serialize: () => string; // Returns JSON string
}
```

## 3. Migration Strategy (The "Bridge" Hook)

To avoid rewriting thousands of lines of UI code immediately, we can create **Selector Hooks** that mimic the old API.

*   `useChatStore()` -> returns `state.sessions.find(s => s.id === activeSessionId).messages`
*   `useWorkbenchStore()` -> returns `state.sessions.find(s => s.id === activeSessionId).dashboard`

## 4. File IO (`src/main/ipc/project.ts`)

Electron needs to handle the file system.

*   `ipcMain.handle('project:save', (path, json))`
*   `ipcMain.handle('project:load', (path))` -> Returns JSON.

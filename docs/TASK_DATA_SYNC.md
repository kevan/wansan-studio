# 🔄 Task: Implement Full Data Synchronization (Focus-Check & Manual Reload)

> **Goal**: Ensure the data in DuckDB stays consistent with the user's local files.
> **Strategy**:
> 1. **Detection**: Automatically detect changes when the app window gains focus.
> 2. **Action**: Allow users to manually "Reload" the data to update DuckDB.

---

## 1. Data Model Updates (`src/shared/types.ts`)

We need to track the file's modification time and its sync status.

```typescript
export type SyncStatus = 'synced' | 'out-of-sync' | 'missing' | 'error';

// Extend the FileNode interface
export interface FileNode {
  id: string;
  name: string;
  path: string;           // Absolute path
  lastModified: number;   // Timestamp (ms) when imported
  status: SyncStatus;     // UI indicator state
  
  // ... existing fields (columns, etc.)
}
```

---

## 2. Main Process Logic (`src/main/engine/file-watcher.ts`)

Implement the file checking logic and the re-ingestion logic.

**Requirement**:
1.  `checkFilesConsistency`: Takes a list of files, checks `fs.stat`, returns IDs of changed files.
2.  `reIngestFile`: Takes a file path, runs the *existing* ingestion logic (Unmerge -> CSV -> DuckDB Table), and returns the new `lastModified` timestamp.

```typescript
import fs from 'fs-extra';
import { FileNode } from '../../shared/types';
import { ingestFile } from './ingestion'; // Reuse existing logic

export async function checkFilesConsistency(files: FileNode[]): Promise<string[]> {
  const changedIds: string[] = [];
  for (const file of files) {
    try {
      const stats = await fs.stat(file.path);
      // Tolerance 100ms
      if (stats.mtimeMs > file.lastModified + 100) {
        changedIds.push(file.id);
      }
    } catch (e) {
      // File missing, handled separately or ignored
    }
  }
  return changedIds;
}

export async function reIngestFile(filePath: string): Promise<number> {
  // 1. Run the Ingestion Pipeline (same as initial upload)
  await ingestFile(filePath); 
  
  // 2. Return new timestamp
  const stats = await fs.stat(filePath);
  return stats.mtimeMs;
}
```

---

## 3. Renderer Store Updates (`src/renderer/src/store/use-project-store.ts`)

Add actions to handle status updates.

```typescript
export interface ProjectState {
  // ... existing state
  
  // Actions
  markAsStale: (ids: string[]) => void;
  updateFileTimestamp: (id: string, newTime: number) => void;
}

// Implementation
markAsStale: (ids) => set((state) => ({
  files: state.files.map(f => ids.includes(f.id) ? { ...f, status: 'out-of-sync' } : f)
})),

updateFileTimestamp: (id, newTime) => set((state) => ({
  files: state.files.map(f => f.id === id ? { ...f, status: 'synced', lastModified: newTime } : f)
})),
```

---

## 4. The "On-Focus" Hook (`src/renderer/src/hooks/use-file-sync.ts`)

This hook orchestrates the detection.

```typescript
import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/use-project-store';

export function useFileSync() {
  const files = useProjectStore(s => s.files);
  const markAsStale = useProjectStore(s => s.markAsStale);
  const lastCheckTime = useRef(0);

  useEffect(() => {
    const handleFocus = async () => {
      // Throttle: Check every 5 seconds max
      const now = Date.now();
      if (now - lastCheckTime.current < 5000) return;
      lastCheckTime.current = now;

      if (files.length === 0) return;

      const changedIds = await window.electron.checkFilesConsistency(files);
      if (changedIds.length > 0) {
        markAsStale(changedIds);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [files]); // Re-bind if file list changes
}
```

---

## 5. UI Integration (Tree Node)

**Requirement**:
In `TreeNode.tsx`:
1.  Check `node.data.status`.
2.  If `'out-of-sync'`:
    *   Show a **Yellow Dot** (or `AlertCircle` icon) next to the filename.
    *   Add a Tooltip: "File changed. Right-click to reload."
3.  **Context Menu Action**:
    *   Add `🔄 Reload Data` item.
    *   On click -> Call `window.electron.reIngestFile(file.path)` -> Then `store.updateFileTimestamp`.

---

### 🚀 指令给 Code Agent

```markdown
### TASK: Implement Full Data Sync Loop

**Context**: We need to detect external file changes and allow users to reload data into DuckDB.
**Reference**: `docs/TASK_DATA_SYNC.md` (See above).

**Action**:

1.  **Types**: Update `FileNode` with `lastModified` and `status` fields.
2.  **Main Process**: Implement `checkFilesConsistency` and `reIngestFile` in `file-watcher.ts`. Ensure `reIngestFile` re-uses the core `ingestion.ts` logic.
3.  **IPC**: Expose these two functions in `preload.ts`.
4.  **Renderer Logic**: 
    -   Create `useFileSync` hook for the on-focus check.
    -   Update `useProjectStore` to handle state changes.
5.  **UI**: Update `TreeNode` to show the 'out-of-sync' indicator and add the 'Reload' context menu action.

**Constraint**:
-   The "Reload" action must be blocking (show a spinner or loading toast) because ingestion takes time.
```

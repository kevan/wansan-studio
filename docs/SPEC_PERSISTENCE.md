# 🛠️ Spec: Data Persistence (Auto-Save)

> **Goal**: Persist application state across reloads and restarts.
> **Strategy**: Use `zustand/middleware/persist` with `localStorage` (Renderer).

## 1. Scope of Persistence

We need to persist 3 distinct stores using unique keys.

### 1.1 `useFileStore` (Key: `wansan-files`)
*   **Save**: `files` (metadata), `relations`, `activeView`, `projectName`.
*   **Ignore**: `selectedNode` (UI state, reset on load).

### 1.2 `useChatStore` (Key: `wansan-chat`)
*   **Save**: `messages`, `history`.
*   **Ignore**: `replyToId`, `isLoading`.

### 1.3 `useWorkbenchStore` (Key: `wansan-workbench`)
*   **Save**: `pinnedReports`, `canvasConfig` (zoom, layout), `pageCount`.
*   **Ignore**: `editingReportId`.

## 2. Implementation Pattern

Wrap existing stores with the `persist` middleware.

```typescript
import { persist, createJSONStorage } from 'zustand/middleware'

export const useFileStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // ... implementation ...
    }),
    {
      name: 'wansan-files', // Unique Key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        // Selective saving
        files: state.files,
        relations: state.relations,
        projectName: state.projectName
      }),
    }
  )
)
```

## 3. Hydration Handling (The React 18 Trap)

Zustand persists data synchronously, but Next.js/React 18 expects empty state on first render to match Server (or strict hydration). In Electron (CSR), this is less of an issue, but we might see a "flicker".

*   **Fix**: Ensure UI handles "loading" state if persistence is slow (usually instant in localStorage).
*   **Version Migration**: If we change data structure later, bump the `version` prop in persist options.

## 4. Special Handling for File Objects

*   **Problem**: `FileNode` in store currently likely contains metadata.
*   **DuckDB**: DuckDB is **in-memory**. When the app restarts, **DuckDB is empty**.
*   **Strategy**:
    *   On App Launch (Hydration finish), we must **Re-Ingest** the files from their paths.
    *   Add a `rehydrate` action in `useFileStore`.
    *   Iterate `state.files`, call `window.electron.reIngestFile(f.path)`.

## 5. Implementation Steps

1.  **Apply Middleware**: Wrap `useFileStore`, `useChatStore`, `useWorkbenchStore`.
2.  **Partialize**: Select only necessary fields.
3.  **Re-hydration Logic**:
    *   Create a hook `useHydration.ts`.
    *   On mount, check if `files` exist but DuckDB is empty.
    *   Trigger re-ingestion for all files.

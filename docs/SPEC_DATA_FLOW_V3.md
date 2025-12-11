# 🛠️ Spec: Data Flow V3 (Real-time & Unified)

> **Goal**: Remove "Save/Cancel" friction. All schema edits are instant. The primary action is to "Switch to Chat".

## 1. Store Updates (`useFileStore`)

Remove `showSchemaConfirm` state. It's no longer a mode, just a view.

```typescript
interface ProjectState {
  // ...
  // Remove: showSchemaConfirm
  
  // Update: 'updateColumn' and 'addRelation' should persist immediately
  // (They already do in Zustand memory, ensure no 'draft' state exists in components)
}
```

## 2. Component Refactor

### 2.1 `SchemaEditor` & `RelationshipManager`
*   **Remove**: Footer with "Save/Cancel".
*   **Add**: Global Footer (see 2.2).
*   **Behavior**: Changing a dropdown triggers `updateColumn` instantly.

### 2.2 `DataWorkspaceLayout` (New Wrapper)
Wrap both editors in a common layout that provides the **Unified Action Bar**.

```tsx
export function DataWorkspaceLayout({ children }) {
  const { setView } = useFileStore();
  
  return (
    <div className="flex flex-col h-full relative">
       <div className="flex-1 overflow-hidden relative">
          {children}
       </div>
       
       {/* THE UNIVERSAL ACTION */}
       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button 
             size="lg" 
             className="rounded-full shadow-xl px-8 bg-black hover:bg-zinc-800 hover:scale-105 transition-all"
             onClick={() => setView('chat')}
          >
             ✨ Start Analysis
          </Button>
       </div>
    </div>
  )
}
```

### 2.3 Import Workflow
*   **Trigger**: Button Click.
*   **Action**: Open System File Dialog.
*   **On Success**:
    1.  Parse File.
    2.  Add to Store.
    3.  `setView('schema', newFileId)`. (Auto-navigate to editor).

## 3. Implementation Steps

1.  **Refactor Components**: Strip Footers from `SchemaEditor` and `RelationshipManager`.
2.  **Create Layout**: Implement `DataWorkspaceLayout` in `MainLayout`.
3.  **Wire Import**: Ensure file upload immediately redirects to Schema View.

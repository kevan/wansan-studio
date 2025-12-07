### TASK: Implement Context Menu for Data Tree

**Context**: The Data Tree is currently read-only. We need to implement the `ContextMenu` logic defined in `CAPABILITY_DATA_TREE.md` to allow users to Manage Files and Columns.

**Stack**: `shadcn/ui` (ContextMenu), `lucide-react`, `useProjectStore`.

**Objective**: Wrap the `TreeNode` component with a `<ContextMenu>` trigger that shows different options based on the Node Type (`file` vs `column` vs `relation`).

---

#### 1. Implementation Specs

**File**: `src/renderer/src/components/data-tree/tree-node.tsx`

**Logic**:

1.  **Import Shadcn Components**:
    ```tsx
    import {
      ContextMenu,
      ContextMenuContent,
      ContextMenuItem,
      ContextMenuSeparator,
      ContextMenuSub,
      ContextMenuSubContent,
      ContextMenuSubTrigger,
      ContextMenuTrigger,
    } from "@/components/ui/context-menu"
    ```

2.  **Conditional Rendering**:
    Inside the `TreeNode` component, determine the `nodeType` (file/column/relation).

3.  **Menu Structure**:

    *   **Case A: File Node**
        *   `🔄 Reload Data` (Icon: RefreshCw) -> Call `reloadFile(id)`
        *   `👀 Preview Data` (Icon: Table) -> Call `setSelectedNode(id)`
        *   `SEPARATOR`
        *   `🗑️ Remove File` (Icon: Trash2, Color: Red) -> Call `removeFile(id)`

    *   **Case B: Column Node**
        *   `✏️ Rename Alias` (Icon: Edit2) -> Open Rename Dialog (Optional for now)
        *   `🔀 Change Type` (Icon: ArrowRightLeft) -> **SubMenu**:
            *   `Text`
            *   `Number`
            *   `Date`
            *   `Boolean`
            *   *(On click, call `updateColumnType(fileId, colId, newType)`)*

    *   **Case C: Relation Node**
        *   `❌ Delete Link` (Icon: X) -> Call `removeRelation(id)`

---

#### 2. Action Handlers (Hook)

**File**: `src/renderer/src/components/data-tree/use-tree-actions.ts`

Ensure this hook exposes the necessary functions connected to the Store:

```typescript
export function useTreeActions() {
  const store = useProjectStore();
  
  return {
    onReloadFile: (id: string) => {
      // TODO: Call Electron re-ingest
      console.log("Reloading", id);
    },
    onRemoveFile: (id: string) => store.removeFile(id),
    onChangeType: (fileId: string, colId: string, type: ColumnType) => {
      store.updateColumnType(fileId, colId, type);
    },
    onRemoveRelation: (id: string) => store.removeRelation(id)
  };
}
```

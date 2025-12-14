# 🛠️ Implementation Spec: Data Tree Manager

> **Goal**: Implement a high-performance, drag-and-drop capable Data Tree using `react-arborist` to manage multi-file datasets and their relationships.
> **Target Stack**: React 18, TypeScript, Tailwind CSS, Shadcn UI, react-arborist, Zustand.

## 1. Directory Structure (Architecture)

Create the following structure under `src/renderer/src`:

```text
components/
  data-tree/
    index.tsx              # Main entry component (DataTreeManager)
    TreeNode.tsx           # Individual node renderer
    TreeDragLayer.tsx      # (Optional) Custom drag preview
    use-tree-actions.ts    # Hook for handling rename, delete, type change
    tree-utils.ts          # Helpers to convert Store data -> Tree data
store/
  use-project-store.ts     # Global Zustand store for Files & Relations
```

---

## 2. State Management (Zustand)

The tree is a *reflection* of the Project State. Do not store tree state locally; derive it from the global store.

### `src/renderer/src/store/use-project-store.ts`

```typescript
import { create } from 'zustand';

export type ColumnType = 'string' | 'number' | 'date' | 'boolean';

export interface ColumnDef {
  id: string;
  name: string;
  type: ColumnType;
  isPrimaryKey?: boolean;
}

export interface FileNode {
  id: string; // e.g., "file_1"
  name: string; // "orders.csv"
  columns: ColumnDef[];
}

export interface Relation {
  id: string;
  sourceFileId: string;
  sourceColId: string;
  targetFileId: string;
  targetColId: string;
}

interface ProjectState {
  files: FileNode[];
  relations: Relation[];
  selectedNodeId: string | null;
  
  // Actions
  addFile: (file: FileNode) => void;
  removeFile: (fileId: string) => void;
  updateColumnType: (fileId: string, colId: string, newType: ColumnType) => void;
  addRelation: (rel: Relation) => void;
  removeRelation: (relId: string) => void;
  setSelectedNode: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // ... implementation
}));
```

---

## 3. Component Implementation Specs

### 3.1 Data Transformation (`tree-utils.ts`)

`react-arborist` requires a flat or nested array. We need a function to transform our Store data into Tree data.

**Requirement**:
*   **Root Nodes**: Files (Type: `'file'`) and a special "Relationships" group (Type: `'group'`).
*   **Leaf Nodes**: Columns (Type: `'column'`) and individual Relations (Type: `'relation'`).
*   **IDs**: Must be unique. Suggest pattern: `file_{id}`, `col_{fileId}_{colId}`, `rel_{id}`.

### 3.2 The Tree Component (`index.tsx`)

**Requirement**:
*   Use `<Tree>` from `react-arborist`.
*   **Dimensions**: `width={260}` (Fixed Sidebar), `height` (Flex/Auto).
*   **Drag & Drop**: Enable `dndRoot` (if needed) but focus on **Column -> Column** dragging for creating relations.
*   **Handlers**:
    *   `onMove`: Disable file moving (files shouldn't be nested). ONLY allow re-ordering columns (optional) or creating relations.
    *   `onCreate`: Handle new nodes if implementing inline add.

```tsx
// Pseudocode for Tree props
<Tree
  data={treeData}
  openByDefault={false}
  width={260}
  height={600} // Should be responsive
  indent={16}
  rowHeight={32}
  padding={10}
  // The Magic: Drag logic
  onMove={({ dragIds, parentId, index }) => {
    // If dropping a COLUMN onto another COLUMN, trigger "Create Relation" modal
    // Return false to prevent actual tree structure change
  }}
>
  {TreeNode}
</Tree>
```

### 3.3 Node Renderer (`TreeNode.tsx`)

**Visual Specs (Tailwind)**:
*   **Container**: `flex items-center px-2 py-1 rounded-md hover:bg-accent/50 cursor-pointer`.
*   **Active State**: `bg-accent text-accent-foreground`.
*   **Icons** (Lucide React):
    *   File: `FileSpreadsheet` (Green for Excel, Blue for CSV).
    *   Column (Num): `Hash` (Yellow).
    *   Column (Text): `Type` (Gray).
    *   Column (Date): `Calendar` (Blue).
    *   Relation Group: `Link`.
*   **Actions**:
    *   Hovering a node should reveal a `MoreHorizontal` (three dots) button on the right.
    *   Clicking dots opens a `DropdownMenu` (Shadcn UI).

---

## 4. The "Drag to Relate" Logic (Critical)

This is the most complex part. We are **hacking** the `onMove` event of `react-arborist` to act as a trigger for business logic, rather than just moving UI nodes.

**Logic Flow**:
1.  User drags Node A (`col_orders_cust_id`).
2.  User drops onto Node B (`col_customers_id`).
3.  `onMove` handler detects:
    *   `dragNode.data.type === 'column'`
    *   `parentNode.data.type === 'column'` (Conceptually dropping "on" it)
    *   *Note: react-arborist usually drops "into" a folder or "between" nodes. You might need to use `dnd` props specifically to detect "drop over".*
4.  **Action**:
    *   **Cancel the move** (return `void` or don't update state).
    *   **Open Modal**: `CreateRelationModal` with `source` and `target` pre-filled.

*Alternative Strategy if `react-arborist` fights back*:
Use standard HTML5 DnD attributes on the `TreeNode` component manually if `react-arborist`'s internal DnD is too restrictive for "joining". But try the library first.

---

## 5. Code Agent Instructions (Prompt)

Copy the following block to your Code Agent (Cursor/Copilot):

```markdown
### TASK: Implement DataTreeManager

**Context**: A "Local-First BI Tool" (Wansan).
**Goal**: A sidebar tree view to manage Files and Columns.
**Stack**: React, Tailwind, Shadcn UI, Zustand, react-arborist.

**Requirements**:

1.  **Store Setup**: Create `use-project-store.ts` with the interfaces defined in the spec.
2.  **Component**: Create `src/renderer/src/components/data-tree/index.tsx`.
    -   Use `react-arborist`.
    -   Map the Store data to Tree data structure.
    -   Implement `TreeNode` with Shadcn-like styling (hover effects, selected state).
    -   Use `lucide-react` icons for different column types (String, Number, Date).
3.  **Interaction**:
    -   Clicking a File Node -> `store.setSelectedNode(fileId)`.
    -   Clicking a Column Node -> `store.setSelectedNode(colId)`.
4.  **Styling**:
    -   Must match the "Zinc" theme of Shadcn UI.
    -   Font size: `text-sm`.
    -   Row height: `28px` (Compact).
5.  **Mock Data**:
    -   Create a `useEffect` in the main component to populate the store with some dummy data (2 files, 5 columns each) for testing.

**Constraint**:
-   Do NOT implement the "Drag to Relate" logic yet. Just get the rendering and selection working perfectly first.
-   Ensure TypeScript types are strict.
```


### TASK: Refactor Column Definition UI

**Goal**: Make the table user-friendly for non-technical users.

**Changes**:

1.  **Remove "Nullable" Column**: It's too technical.
2.  **Rename Headers**:
    -   "Name" -> "Field Name"
    -   "Type" -> "Format"
    -   "PK" -> Remove column, move logic to "Field Name" column.
3.  **Type Column**:
    -   Replace the native `<select>` with a Shadcn `Select` or `DropdownMenu`.
    -   Map technical types to business types with Icons:
        -   `varchar` -> Icon `Type` (Text)
        -   `int` -> Icon `Hash` (Number)
        -   `date` -> Icon `Calendar` (Date)
    -   Add color badges for types (e.g., Blue for Number, Green for Date).
4.  **Primary Key**:
    -   Add a `Key` icon (Lucide) next to the field name if `isPrimaryKey` is true.
    -   Allow toggling PK by clicking the icon.
5.  **Add "Preview" Column**:
    -   Add a new column showing the first 3 non-null values from the file (e.g., "A, B, C...").
    -   Style it with `text-muted-foreground text-xs`.

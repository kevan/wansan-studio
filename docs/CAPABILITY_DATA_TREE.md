# 🛠️ Capability Design: Tree Data Manager

> **Module**: `src/renderer/src/components/data-tree`
> **Dependencies**: `react-arborist`, `useProjectStore`, `lucide-react`, `shadcn/ui`
> **Goal**: Provide a hierarchical, interactive view of Files, Columns, and Relationships.

## 1. Data Transformation Capability (Store Adapter)

The Tree component requires a specific data structure that differs from our normalized Zustand store. We need a **Memoized Selector** or a **Transformation Utility** to convert the Store state into Tree nodes on the fly.

**Requirement**: Implement `buildTreeData(files, relations)` function.

**Tree Structure Specification**:
The tree must have 2 fixed Root Nodes (Folders):

1.  **📂 Data Sources (Files)**
    *   **Parent**: `root_files`
    *   **Children**: File Nodes (e.g., `t_orders`).
    *   **Grandchildren**: Column Nodes (e.g., `amount`).
2.  **🔗 Relationships (Connections)**
    *   **Parent**: `root_relations`
    *   **Children**: Relation Nodes (e.g., `Orders -> Customers`).

**Node ID Strategy**:
*   File: `file:${tableName}`
*   Column: `col:${tableName}:${columnName}`
*   Relation: `rel:${sourceTable}:${targetTable}`

---

## 2. Node Visualization Capability (The Renderer)

The `Node` component must visually distinguish between different data types to reduce cognitive load.

**Requirement**: Implement `<TreeNode />` with the following visual rules:

### A. Iconography (Lucide React)
*   **Folder/Group**: `FolderClosed` / `FolderOpen` (Zinc-400)
*   **File**: `FileSpreadsheet` (Green-600)
*   **Relation**: `Link2` (Indigo-500)
*   **Column Types** (Crucial for Business Context):
    *   `VARCHAR` -> `Type` (Zinc-500)
    *   `DOUBLE/BIGINT/INT` -> `Hash` (Blue-600)
    *   `DATE/TIMESTAMP` -> `Calendar` (Emerald-600)
    *   `BOOLEAN` -> `ToggleLeft` (Purple-600)

### B. Badges & Indicators
*   **"FK" Indicator**: If a column is part of a relationship (source or target), show a tiny `🔗` icon or badge next to the column name.
*   **Selection State**:
    *   `bg-accent text-accent-foreground` when selected.
    *   Left border indicator (`border-l-2 border-primary`) to denote active focus.

---

## 3. Interaction Capabilities

The tree is not read-only. It handles user intent.

### A. Context Menu (Right-Click)
Using `shadcn/ui` ContextMenu, implement:

*   **On File Node**:
    *   `🗑️ Remove File` -> Triggers `removeFile` action.
    *   `👀 Preview Data` -> Sets view to Table Preview.
*   **On Column Node**:
    *   `✏️ Rename Alias` -> Allows changing the *display name* (not SQL name) for the chart axis.
    *   `🔄 Change Type` -> Submenu: `To Text`, `To Number`, `To Date`. (Triggers Store Update).
*   **On Relation Node**:
    *   `❌ Delete Relationship` -> Triggers `removeRelation`.

### B. Drag & Drop (Phase 2 Prep)
*   **Current Phase**: Disable re-ordering of Files (Files should be sorted alphabetically or by upload time).
*   **Future Prep**: Prepare `onMove` handler to return `false` for now, but comment where the "Drag Column to Column" logic will reside.

---

## 4. State Synchronization

**Requirement**:
*   **Selection Sync**:
    *   When user clicks a node in Tree, update `projectStore.selectedId`.
    *   *Effect*: The Right Panel switches content (e.g., showing Data Table or Relation Details).
*   **Auto-Expansion**:
    *   When a new file is uploaded, automatically **Expand** the `Data Sources` folder and the new File node.

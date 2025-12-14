# 🛠️ Spec: Data Management Workspace

> **Goal**: Enable users to review schema and manage relationships AFTER ingestion.
> **Concept**: The Middle Panel is a Polymorphic Viewport controlled by the Sidebar selection.

## 1. Store Updates (`use-file-store.ts`)

We need a global state to track what is currently being viewed.

```typescript
type ViewMode = 'chat' | 'schema' | 'relationships';

interface ProjectState {
  // ...
  activeView: ViewMode;
  activeFileId: string | null; // Reuse existing
  
  // Actions
  setView: (mode: ViewMode, fileId?: string) => void;
}
```

## 2. Component Architecture

### 2.1 The Router (`MiddlePanel.tsx`)
Refactor the Middle Panel in `MainLayout` to switch components based on `activeView`.

```tsx
// Pseudo-code
{activeView === 'chat' && <ChatStream />}
{activeView === 'schema' && <SchemaEditor fileId={activeFileId} />}
{activeView === 'relationships' && <RelationshipManager />}
```

### 2.2 `SchemaEditor` (Refactored `SchemaConfirm`)
*   Reuse the table component.
*   **Header**: "Edit Schema: {filename}".
*   **Action**: Change "Start Analysis" to "Save Changes".
*   **Behavior**: On save, update store and switch back to `chat`.

### 2.3 `RelationshipManager` (New)
A dedicated UI for managing joins.

*   **List**: Show existing relations with a "Delete" button.
*   **Add**: A simple form row at the bottom or a Modal.
    *   `Source Table` (Select) -> `Column` (Select)
    *   `Target Table` (Select) -> `Column` (Select)
    *   `[Link]` Button.

## 3. Sidebar Interaction (`DataTreeSidebar.tsx`)

*   **Click File Node**: `setView('schema', fileId)`.
*   **Click Relationship Folder**: `setView('relationships')`.
*   **Click "Analysis Chat"** (New Node or Top Button): `setView('chat')`.

## 4. Implementation Steps

1.  **Store**: Update `useFileStore` with `activeView`.
2.  **Sidebar**: Wire up click events. Add a "Back to Chat" navigation item if needed.
3.  **Middle Panel**: Implement the Router.
4.  **Components**:
    *   Adapt `SchemaConfirm` into `SchemaEditor`.
    *   Build `RelationshipManager`.

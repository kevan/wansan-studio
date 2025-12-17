# 🚀 Wansan Studio v1.1.0 Roadmap: The Session-Centric Update

> **Core Concept**: **One Chat = One Dashboard**.
> **Goal**: Transform from a single-state app to a multi-session project workbench.

## 1. 🏗️ Architecture: Project & Storage

### 1.1 Store Restructuring (状态重构)
*   **Split Store**:
    *   **`useGlobalStore`**: App Settings, License, Recent Projects. (LocalStorage)
    *   **`useProjectStore`**: The active project state. (In-Memory / File Sync)
*   **Data Model (`Project`)**:
    ```typescript
    interface Project {
      meta: { id: string; name: string; created: number };
      files: FileNode[];       // Shared Data Sources
      relations: Relation[];   // Shared Joins
      sessions: {
        id: string;
        title: string;
        lastModified: number;
        messages: Message[];   // Chat History
        dashboard: {           // Canvas State
           layout: 'a4' | 'screen';
           widgets: ReportWidget[];
        };
      }[];
      activeSessionId: string;
    }
    ```

### 1.2 File Persistence (文件持久化)
*   **Format**: `.wansan` (JSON file).
*   **IO**:
    *   **Save**: Serialize `Project` object to JSON.
    *   **Load**: Read JSON -> Hydrate `useProjectStore`.
    *   **Auto-Save**: Debounced write to disk (every 5s if changed).

---

## 2. 🎨 UI/UX: Session-First Sidebar

### 2.1 The Two Modes (双视图)
Sidebar 变为一个可切换的容器。

*   **Mode A: Session List (Default)**
    *   **Header**: Project Name (Editable) + `[+] New Chat` Button.
    *   **Content**: List of Sessions (Title + Time). Active one highlighted.
    *   **Action**: Clicking a session switches the Chat Panel and Dashboard Canvas instantly.
    *   **Footer**: **`📦 Data Sources (3)`** button. Click to slide into Mode B.

*   **Mode B: Data Assets (Slide-in)**
    *   **Header**: `< Back` Button + "Data Sources".
    *   **Content**: The existing Data Tree (Files & Relations).
    *   **Actions**: Import, Replace, Rename Columns.

### 2.2 Dashboard Behavior
*   **Isolation**: Creating a new Chat creates a blank Dashboard.
*   **Persistence**: Switching chats restores the exact scroll position and layout of that dashboard.

---

## 3. 🧠 Logic: Data Source Scope

*   **Global Access**: Any SQL in ANY session can query ANY table in the project.
*   **Data Replace**:
    *   User replaces `sales.xlsx` in Mode B.
    *   **Effect**: All charts in Session 1, Session 2, etc., that rely on `t_sales` will auto-refresh.

---

## 📅 Execution Plan (2 Weeks)

### Sprint 1: Store & Data Model (Core)
1.  **Refactor**: Create `Project` type. Break `useChatStore` and `useWorkbenchStore` and merge them into `Project.sessions`.
2.  **IO**: Implement `loadProject(path)` and `saveProject(path)`.
3.  **Migration**: Write a one-time script to migrate v1.0 `localStorage` data into a `default.wansan` project.

### Sprint 2: UI Overhaul
1.  **Sidebar**: Implement the Mode A/B switch animation.
2.  **Session Switcher**: Logic to swap the "Active Session" in memory.
3.  **Project Manager**: A simple "Welcome Screen" to Open/Create projects.

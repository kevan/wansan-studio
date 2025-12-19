# 📦 Wansan Studio v1.1.0: The Workbench Update

> **Release Date**: TBD
> **Code Name**: "Session"
> **Core Value**: Transforming from a single-pass tool to a persistent analytical workbench.

## 1. 🏗️ Core Architecture (架构升级)

### 1.1 Project-Centric Store (`useProjectStore`)
We migrated from scattered `localStorage` stores to a unified, session-aware state machine.

*   **Structure**:
    ```typescript
    Project {
      files: FileNode[];       // Global Data Assets
      sessions: Session[];     // Multiple Analysis Contexts
      activeSessionId: string;
    }
    ```
*   **Normalized Widgets**: Established a **Widget Registry** (SSOT). Chat messages and Dashboard cards now reference the same data source. Changes in one view reflect instantly in the other.

### 1.2 Data Persistence
*   **Format**: `.wansan` (JSON serialization).
*   **IO**: Implemented `saveProject` / `loadProject` IPC handlers.

---

## 2. ⚡ Productivity Features (生产力功能)

### 2.1 Multi-Session Workflow
*   **Sidebar**: Redesigned to support a list of Sessions.
*   **Isolation**: Each session maintains its own Chat History and Dashboard Layout.
*   **Usage**: Users can switch between "Q1 Report" and "User Analysis" instantly.

### 2.2 Data Replace (The "Recurring Report" Killer)
*   **Action**: Right-click file -> "Replace Source".
*   **Logic**:
    1.  **Schema Check**: Pre-flight check for missing columns.
    2.  **Warning UI**: Shadcn `AlertDialog` if mismatches found.
    3.  **Hot Reload**: Re-ingest data into DuckDB (same table name) -> Auto-refresh all widgets in the session.

---

## 3. 🖼️ Dashboard & Visualization

### 3.1 Title Widget (In-Canvas)
*   **Change**: Removed external header input.
*   **New**: Added draggable `TextWidget` (Markdown support).
*   **Benefit**: Ensures report titles are included in PDF exports (WYSIWYG).

### 3.2 Layout & Export Polish
*   **Header**: Cleaned up toolbar. Grouped Zoom/Page controls.
*   **PDF**: Improved canvas slicing logic.
*   **Style**: Fixed chart axis overlaps and card padding.

---

## 4. ✨ The "Wow" Feature: AI Web Export

A new export format that generates a standalone `.html` file.

*   **Workflow**:
    1.  **Config**: User selects Theme (Minimal / Cyberpunk / Corporate).
    2.  **Generate**: AI writes HTML/CSS/ECharts code based on widget metadata.
    3.  **Inject**: Electron injects local data rows into the HTML file.
*   **Privacy**: **Schema-Only**. No data rows are sent to the LLM.
*   **UX**: "Hacker-style" Loading Modal replaced with an **Elegant Progress Card**.

---

## 5. 🎨 UI/UX Refinements

### 5.1 Sidebar Dock
*   **Design**: Moved "Data Assets" and "User Profile" to a bottom **Dock Area**.
*   **User Profile**: Unified License status and Settings entry into a single, clean user card.

### 5.2 Settings
*   **Layout**: Refactored to **Tabs** (AI Engine / General).
*   **License**: Added visual status badges.

---

## 6. Known Limitations (v1.1)

1.  **Memory Only**: DuckDB still runs in memory. Large projects (>500MB) will have slow startup (Re-ingest). *Planned for v2.0.*
2.  **Sync**: No cloud sync for project files yet. Rely on manual file transfer.
3.  **Undo/Redo**: Not yet implemented for Dashboard layout changes.

# ⚡ Spec: v1.5 Master - Power & Reach

> **Target Version**: v1.5.0
> **Status**: In Progress (Power Done, Reach Todo)
> **Core Value**: Empowering professional users with direct control and enabling the flow of insights.

## 1. Overview

This release addresses the needs of two critical user personas:
1.  **Power Users (Analysts/Devs)**: Who demand direct SQL access without AI interference. (**Power**)
2.  **Report Consumers (Managers/Clients)**: Who need to view interactive dashboards without installing the software. (**Reach**)

---

## 2. The "Power" Update: Smart SQL Lab (Completed)

### 2.1 Monaco Editor Integration
*   **Kernel**: Replaced lightweight editor with `@monaco-editor/react`.
*   **Capabilities**:
    *   VS Code-grade syntax highlighting.
    *   Intelligent Autocomplete (Keywords, Functions).
    *   Formatting (Prettier-like SQL formatting).
    *   Theme awareness (Dark/Light mode).

### 2.2 Schema-Aware Intelligence
*   **Dynamic Schema Injection**: The editor "knows" the local DuckDB schema.
*   **Table Completion**: Auto-suggests table names from the current project.
*   **Column Completion**: Context-aware column suggestions (e.g., typing `t_orders.` lists columns).
*   **Security**: Auto-quotes identifiers to handle special characters/Chinese names safely.

### 2.3 Direct SQL-to-Viz Workflow
*   **Entry Point**: Magic Input Command `/sql`.
*   **Modal Interface**: Full-screen SQL Editor with data preview.
*   **Chat Integration**:
    *   "Send to Chat" button executes the SQL.
    *   Result injected as a native Chat Message.
    *   Users can then use the existing `ChartFullView` to configure visualizations manually.
*   **UX Detail**: `runOnMount` disabled for new queries to prevent errors.

---

## 3. The "Reach" Update: Web Export (Planned)

### 3.1 Goal
Export the current Dashboard/Report as a standalone, offline-capable HTML file that retains interactivity.

### 3.2 Technical Strategy: "The Hydration Pack"
Instead of server-side rendering, we will package a lightweight React runtime + ECharts into a single HTML file.

#### 3.2.1 Architecture
1.  **Template**: A minimal `export-template.html` containing:
    *   React + ReactDOM (UMD).
    *   ECharts (UMD).
    *   Tailwind CSS (inlined).
    *   A simplified `DashboardRenderer` component.
2.  **Data Injection**:
    *   Serialize the current `ProjectStore` state (Report Data, Layouts) into a JSON string.
    *   Inject it into a global `window.__WANSAN_DATA__` variable script tag.
3.  **Hydration**:
    *   The script reads `window.__WANSAN_DATA__`.
    *   Hydrates the React component tree.
    *   Renders charts using ECharts.

### 3.3 Scope
*   **Supported**: Charts (ECharts), KPIs, Tables, Layouts, Markdown text.
*   **Not Supported**: AI interactions, SQL re-execution (no DuckDB), editing.

### 3.4 User Experience
*   **Trigger**: "Share" -> "Export as Web Report".
*   **Output**: `My_Analysis_Report.html` (Single file).
*   **Result**: Double-click to open in any browser. Fully interactive (Tooltip, Zoom, Legend toggle).

---

## 4. Engineering Impact

### 4.1 Dependency Management
*   **Added**: `monaco-editor`, `@monaco-editor/react`.
*   **Removed**: `react-simple-code-editor`, `prismjs`.

### 4.2 Bundle Size
*   **Impact**: Increased main bundle size due to Monaco.
*   **Mitigation**: Lazy loading of Monaco components via `React.lazy` or dynamic import in `MonacoSqlEditor`. (Already implemented via `@monaco-editor/react` loader).

### 4.3 Future Proofing
*   The "Web Export" engine can evolve into a "Cloud Publish" feature later by simply uploading the HTML to S3/R2 instead of saving to disk.

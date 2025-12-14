# 🛠️ Spec: ReportCard Component (The Core Widget)

> **Role**: The atomic unit of insight. It transforms from a "Chat Bubble" (Draft) to a "Dashboard Widget" (Deliverable).
> **Tech Stack**: Shadcn Card, ECharts, TanStack Table, Framer Motion.

## 1. Component Architecture

### 1.1 Props Interface
```typescript
interface ReportCardProps {
  // Data Source
  report: {
    id: string;
    title?: string;
    summary?: string;
    vizConfig?: EChartsOption; // Or generic config
    vizType?: 'bar' | 'line' | 'pie' | 'table' | 'kpi';
    data?: any[]; // Raw data for Table/Re-render
    columns?: string[];
    sql?: string; // For transparency
    reasoning?: string;
  };

  // Context
  variant: 'chat' | 'dashboard';
  
  // Interaction Handlers (Optional, if not using Store directly)
  onPin?: () => void;
  onDelete?: () => void;
  onExpand?: () => void; // For fullscreen edit
}
```

### 1.2 Sub-Components
*   `CardHeader`: Title + Toolbar Actions.
*   `CardContent`:
    *   **VizArea**: Renders `ReportChart` or `ReportTable`.
    *   **SummaryArea**: Textual insight (Chat mode only, or bottom of Dashboard card).
*   `CardFooter`: Action buttons (Refine, SQL, Copy).

---

## 2. Visualization Logic

The card creates an abstraction layer over the raw data.

### 2.1 The Adapter (`chart-utils.ts`)
*   **Input**: `vizConfig` (from AI) + `data` (from DB).
*   **Logic**:
    *   If `vizType === 'table'`, render `<ReportTable />` (TanStack Table).
    *   If `vizType === 'kpi'`, render Big Number component.
    *   Otherwise, render `<ReportChart />` (ReactECharts).
        *   **Smart Resize**: Listen to container size changes (`ResizeObserver`) to call `echartsInstance.resize()`.

### 2.2 Table Widget (`SPEC_DATA_GRID.md`)
*   **Chat Mode**: Limit to 5 rows (Preview).
*   **Dashboard Mode**: Full height, with Pagination (10 rows per page) or Virtual Scroll.
*   **Features**: Sortable headers.

---

## 3. Interaction & States

### 3.1 Chat Variant
*   **Visuals**: No shadow, borderless (or subtle border). "Bubble" style.
*   **Toolbar**:
    *   `[📌 Pin]`: Moves to Dashboard.
    *   `[🔄 Rerun]`: Re-execute with fresh data.
    *   `[📝 Edit SQL]`: Opens SQL Lab Modal (`SPEC_SQL_LAB.md`).
    *   `[🔍 Refine]`: Adds to Chat Input context.

### 3.2 Dashboard Variant
*   **Visuals**: White background, shadow-sm, rounded-lg.
*   **Toolbar (Hover Only)**:
    *   `[⤢ Expand]`: Opens Fullscreen Editor (`SPEC_FULLSCREEN_EDIT.md`).
    *   `[📷 Image]`: Export single card as PNG.
    *   `[❌ Remove]`: Unpin from Dashboard.
*   **Resizing**:
    *   Handled by `react-grid-layout` parent.
    *   Card must set `height: 100%` to fill the grid item.

---

## 4. Export Capabilities (`SPEC_EXPORT.md`)

*   **Single Card**: Use `html-to-image`.
    *   **Trick**: Temporarily set background to white if transparent.
*   **Data Export**:
    *   "Export CSV": Download `props.data` as CSV.

---

## 5. Implementation Roadmap

1.  **Skeleton**: Build the `Card` wrapper with Header/Content/Footer.
2.  **Viz Engine**: Integrate `ReportChart` and `ReportTable` with conditional rendering.
3.  **Actions**: Wire up Pin, Rerun, SQL Edit buttons to Store Actions.
4.  **Dashboard Adaptor**: Ensure it behaves correctly inside `react-grid-layout` (100% width/height).
5.  **Edit Mode**: Connect "Expand" button to the `ChartFullView` modal.

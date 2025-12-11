# 🛠️ Spec: Visualization Customization (VizEdit)

> **Goal**: Allow users to modify the chart type and basic configuration of a generated report without re-prompting AI.
> **Scope**: Report Card (Chat & Dashboard).

## 1. Store Updates (`use-workbench-store.ts`)

We need granular control to update a report's configuration.

```typescript
// Add to WorkbenchState
updateReportConfig: (id: string, updates: Partial<AIAnalysisResult['visualization']>) => void;
```

## 2. UI Components

### 2.1 `VizToolbar` (New)
A popover menu triggered by an "Edit" or "Settings" icon on the card.

**Controls**:
1.  **Chart Type Switcher**:
    *   Icons: Bar, Line, Pie, Table, Number (KPI).
    *   Action: Updates `viz_type`.
2.  **Axis Configuration** (Cartesian Only):
    *   **Swap Axis**: Button to swap X and Y columns.
    *   **X-Axis**: Dropdown to select a different column from `data`.
    *   **Y-Axis**: Multi-select Dropdown to choose metric columns.

### 2.2 `ReportCard` Integration
*   Add `VizToolbar` to the card header.
*   Ensure it connects to the Store (if in Dashboard) or Local State (if in Chat - *Decision: Let's allow editing in Chat too, but it might not persist unless pinned. For MVP, focus on Pinned Reports in Dashboard store*).

## 3. The ECharts Adapter Logic (`chart-utils.ts`)

We need to make our ECharts option generator robust enough to handle type switching.

**Logic**:
*   **Bar/Line**: Interchangeable.
*   **Pie**: Needs `name` (x_axis) and `value` (y_axis).
*   **Table**: Renders the `ReportTable` component.

## 4. Implementation Plan

1.  **Store**: Add `updateReportConfig`.
2.  **Component**: Build `VizControlPopover`.
3.  **Refactor**: Ensure `ReportChart` accepts `vizConfig` as a prop and regenerates the option whenever it changes.

# 🛠️ Spec: Fullscreen Chart Editing

> **Goal**: Provide a focused environment for editing Dashboard charts, avoiding UI clutter on small grid items.
> **Context**: User clicks "Expand" on a Dashboard card -> Opens Modal -> Edits Config -> Saves.

## 1. Component Architecture

### 1.1 `VizControls` (The Editor)
A reusable component that allows modifying the chart configuration.
*   **Input**: `currentConfig`, `columns` (available fields).
*   **Output**: `onConfigChange`.
*   **UI**:
    *   **Chart Type**: Segmented Control or Icons (Bar | Line | Pie | Table | KPI).
    *   **Axes**:
        *   X-Axis: Select (Single).
        *   Y-Axis: Multi-Select (Metrics).
        *   Swap Button.

### 1.2 `ChartFullView` (The Modal)
A `Dialog` (Shadcn UI) that maximizes to `80vw x 80vh`.
*   **Layout**:
    *   **Header**: Title (Editable) + Close Button.
    *   **Body**:
        *   **Main**: Huge `ReportChart` area.
        *   **Sidebar (Right)**: `VizControls` panel.
*   **State**: Local state for optimistic updates. Only commit to Store on "Save" or auto-save.

### 1.3 `ReportCard` Updates
*   **Dashboard Variant**:
    *   **Hide** inline edit controls.
    *   **Show** `Expand` (Maximize2) icon in header actions.
*   **Chat Variant**:
    *   Can show `VizControls` in a Popover (optional, or keep simple).

## 2. Store Updates (`use-workbench-store.ts`)

```typescript
// Action to commit changes
updateReportConfig: (id: string, newConfig: AIAnalysisResult['visualization']) => void;
```

## 3. Implementation Steps

1.  **Store**: Add `updateReportConfig`.
2.  **Component**: Build `VizControls.tsx`.
3.  **Component**: Build `ChartFullView.tsx`.
4.  **Integration**:
    *   In `MainLayout` (or `DashboardCanvasV3`), render the `<ChartFullView />` conditionally if a report is selected for editing.
    *   (Better: Put the Dialog at the Root level controlled by a store state `editingReportId`).

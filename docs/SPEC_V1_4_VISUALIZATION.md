# 📊 Spec: Visualization & Interaction v1.4

> **Target Version**: v1.4.0
> **Scope**: ECharts Engine, Theme System, Drill-Down v2.
> **Status**: Implemented (merged to develop)

## 1. Visual Polish (瑞士级图表体验)

### 1.1 Custom Tooltip Engine
*   **Problem**: Default ECharts tooltip is rigid.
*   **Solution**: Implemented `getAxisTooltipFormatter` and `getItemTooltipFormatter` with HTML/Tailwind.
*   **Design**:
    *   **Glassmorphism**: `backdrop-blur-md`, `bg-white/90` (or dark mode equivalent).
    *   **Typography**: `Inter` font, clear hierarchy.

### 1.2 The "Airy" Theme Extension
*   **Files**: `src/renderer/lib/echarts-theme.ts`
*   **Upgrades**:
    *   **Gradients**: Auto-generated vertical gradients with opacity transitions.
    *   **Area Charts**: Enhanced opacity (0.3) and gradients to ensuring visibility.
    *   **Shadows**: Soft, colored shadows matching series color.
    *   **Axis**: Hidden axis lines, dashed split lines.

## 2. Advanced Chart Support

### 2.1 Supported Types
*   **Standard**: Bar, Line, Area, Pie.
*   **New in v1.4**:
    *   **Scatter**: Includes intelligent X-axis detection.
        *   *Numeric X*: Uses `value` axis with scaling.
        *   *Non-Numeric X*: Fallback to `category` axis (Dot Plot).
    *   **Radar**: Includes heuristic for single-metric data.
        *   *< 3 Metrics*: Transpose mode (X-axis as Radar Indicators) to prevent "line" shapes.
        *   *>= 3 Metrics*: Standard mode (Y-axis columns as Radar Indicators).
    *   **Combo**: Dual-axis support (Bar + Line).
        *   *Fallback*: Degrades to simple Bar chart if < 2 metrics selected.

### 2.2 Configuration UX (`ChartFullView`)
*   **No-Jump Config**: Decoupled rendering mode from validation. Configuring a chart (e.g., removing Y-axis temporarily) does not force a fallback to Table view, maintaining context.

## 3. Intelligent Drill-Down (交互升级)

### 3.1 Dynamic Menu (`DrillDownMenu`)
*   **Trigger**: ECharts `click` event (handled for both Items and Axis Labels via `triggerEvent: true`).
*   **Context Aware**:
    *   `Focus`: Filter current analysis.
    *   `View Data`: Show raw table rows.
    *   `Breakdown by...`: Suggests dimension columns (VARCHAR/TEXT) from the schema for immediate drill-down.

### 3.2 AI Insight Entry
*   **Integration**: "💡 AI Insight" button available directly in the drill-down menu.

## 4. Engineering Plan (Completed)

1.  **Refactor**: Unified logic in `src/renderer/lib/viz-adapter.ts`.
2.  **Theme**: Centralized in `src/renderer/lib/echarts-theme.ts`.
3.  **Components**: `VizChart`, `InsightPanel`, `ChartFullView` fully integrated.
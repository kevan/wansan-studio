# 📊 Spec: Visualization & Interaction v1.4

> **Target Version**: v1.4.0
> **Scope**: ECharts Engine, Theme System, Drill-Down v2.

## 1. Visual Polish (瑞士级图表体验)

### 1.1 Custom Tooltip Engine
*   **Problem**: Default ECharts tooltip is rigid and lacks semantic richness.
*   **Solution**: Implement a `renderTooltip` HTML formatter using Tailwind classes.
*   **Design**:
    *   **Glassmorphism**: `backdrop-blur-md`, `bg-white/90`.
    *   **Typography**: `Inter` font, distinct header (Date/Category) and rows (Metrics).
    *   **Indicators**: Colored dots matching the series color.

### 1.2 The "Airy" Theme Extension
*   **Files**: `src/renderer/lib/echarts-theme.ts`
*   **Upgrades**:
    *   **Gradients**: Auto-generate vertical gradients for Bar/Area charts to add depth.
    *   **Shadows**: Soft, colored shadows (diffused glow) for Line charts.
    *   **Axis**: Completely hide axis lines, keeping only essential grid lines and labels.

## 2. Advanced Chart Support

### 2.1 New Chart Types
*   **Scatter / Bubble**: For correlation analysis (e.g., Price vs. Sales).
*   **Radar**: For multi-dimension capability comparison.
*   **Combo (Dual Axis)**: Bar + Line (e.g., Revenue vs. Growth Rate).
*   **Sankey / Funnel**: For flow and conversion analysis.

### 2.2 Implementation
*   Update `useChartOption` hook to handle `scatter`, `radar`, `combo` types.
*   Update `SchemaEditor` to allow selecting these types.

## 3. Intelligent Drill-Down (交互升级)

User pointed out `drill-down-menu.tsx` exists. We will evolve it from a static menu to a dynamic decision point.

### 3.1 Menu Expansion
*   **Current Items**:
    *   `Focus`: Filter currrent view.
    *   `View Data`: Show raw table.
*   **New Item: "Breakdown by..." (下钻)**:
    *   **UX**: Hovering triggers a sub-menu of Dimensions from the current table Schema (e.g., `Region`, `Category`).
    *   **Action**: Clicking `Region` triggers a new AI Query:
        > `Break down the current metric (${metric}) by Region, filtered by ${currentSelection}. Show as Bar Chart.`

### 3.2 AI Insight Entry
*   Add entry point: `💡 Explain Data` (Trigger AI Insight Protocol).

## 4. Engineering Plan

1.  **Refactor**: `echarts-theme.ts` -> `src/renderer/viz/theme/`.
2.  **Tooltips**: Create `getTooltipFormatter` utility.
3.  **Hooks**: Expand `useChartOption.ts` switch-case.
4.  **Components**: Update `DrillDownMenu.tsx` to support sub-menus.

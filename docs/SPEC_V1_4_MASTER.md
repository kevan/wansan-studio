# 📦 Spec: v1.4 Master - AI Insight & Visual Storytelling

> **Target Version**: v1.4.0
> **Status**: Implemented (merged to develop)
> **Core Value**: Transforming "Data Reading" into "Interactive Storytelling" with deep AI integration and Swiss-style visualization.

## 1. Overview

This release focuses on bridging the gap between raw data and business understanding. It introduces **AI Business Insight** (natural language interpretation), upgrades the **Visualization Engine** (new charts, advanced theming), and implements **Visual Anchoring** (linking text to charts).

### Key Features
*   **AI Insight Protocol**: Securely generating insights from aggregated chart data.
*   **Visual Anchoring**: Interactive highlighting linking insight text to chart elements.
*   **Visualization Upgrade**: New chart types (Rose, Radar, Combo) and "Airy" theme system.
*   **Interactive Drill-Down**: Click chart elements to filter, view data, or breakdown analysis.

---

## 2. AI Business Insight (The "Why")

### 2.1 The Handshake Protocol
*   **Privacy First**: Row-level data is NEVER sent to AI. Only **aggregated chart data** (e.g., the 12 points visible on a bar chart) is transmitted.
*   **Consent Flow**: User must explicitly click "AI Insight" and confirm the data preview before transmission.

### 2.2 Insight Engine (`ai-bridge.ts`)
*   **Structured Output**: AI returns a JSON object (`InsightResult`) instead of raw text.
    ```typescript
    interface InsightResult {
      summary: string;
      findings: Array<{
        id: string;
        markdown: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        relatedItems: string[]; // For Visual Anchoring
      }>;
      recommendation: string;
    }
    ```
*   **Auto-Localization**: Headers ("Key Findings", "Recommendation") and content are generated in the user's preferred language (EN/ZH).

### 2.3 Insight Panel (`InsightPanel.tsx`)
*   **Interactive List**: Renders findings with sentiment icons (📈/📉).
*   **Hover Interaction**: Hovering a finding triggers the `onHighlight` event.
*   **Markdown Support**: Powered by `react-markdown` + `remark-gfm` for rich text formatting.
*   **State Management**: Persistence of insights via `ReportData.insight`.

---

## 3. Visualization & Interaction (The "How")

### 3.1 New Chart Types
*   **Nightingale Rose Chart (`rose`)**:
    *   Separate type from Pie.
    *   Features: Radius-based scaling, optimized label layout for complex data.
    *   Styling: "Blooming" animation, high-contrast borders.
*   **Radar Chart (`radar`)**:
    *   **Auto-Transpose**: If metrics < 3, automatically uses X-axis as radar dimensions to prevent "flat line" charts.
*   **Combo Chart (`combo`)**:
    *   Dual-axis support (Bar + Line).
    *   **Fallback**: Degrades to Bar chart if < 2 metrics selected.
*   **Scatter Chart (`scatter`)**:
    *   **Smart Axis**: Auto-detects numeric vs. categorical X-axis. Falls back to "Dot Plot" mode for non-numeric data.

### 3.2 The "Airy" Theme System (`echarts-theme.ts`)
*   **Design Philosophy**: Light, breathable, and focused.
*   **Key Enhancements**:
    *   **Glassmorphism Tooltips**: Backdrop blur, clear hierarchy, explicit metric naming.
    *   **Smart Labels**: Pie/Rose charts use `alignTo: 'edge'` and `hideOverlap: true` to perfectly organizing labels without clutter.
    *   **Focus & Blur**: Leveraging ECharts 5 `focus: 'self'`, highlighting an element dims all others (opacity 0.1), creating a spotlight effect.
    *   **Line Chart Fix**: Special opacity toggling to make Line Chart points invisible normally but prominent on highlight.

### 3.3 Visual Anchoring (Interaction)
*   **Concept**: Hovering text -> Highlighting Chart.
*   **Implementation**:
    *   `InsightPanel` emits `relatedItems` names.
    *   `VizChart` receives `highlightedItems`.
    *   `Chart` component calls `dispatchAction({ type: 'highlight', name: ... })`.
*   **Constraint**: Tooltip is **disabled** during visual anchoring to prevent occlusion and overlap. We rely on the text panel for "What" and the chart for "Where".

### 3.4 Interactive Drill Down (`DrillDownMenu.tsx`)
*   **Trigger**: User clicks any chart element (Bar, Pie Sector, Scatter Point, or Axis Label).
*   **Context Menu**: A popover appears with context-aware actions.
*   **Actions**:
    1.  **🔍 Focus**: Filters the current analysis by the selected dimension.
    2.  **📄 View Data**: Shows raw data rows for the selected dimension.
    3.  **📊 Breakdown by...**: Suggests dimension columns from the schema. Clicking one triggers a new analysis grouping by that dimension.
    4.  **💡 AI Insight**: Triggers the Insight generation for the current view.

---

## 4. Engineering & Architecture

### 4.1 Data Models (`dashboard.ts`)
*   Updated `ReportData` to include `InsightResult` structure.
*   Updated `ChartType` union to include `rose`, `radar`, `combo`.

### 4.2 Configuration UX
*   **No-Jump Config**: Configuring charts (e.g., removing axes temporarily) no longer forces a fallback to Table view.
*   **Preserved Settings**: Switching between similar types (Pie <-> Rose) preserves axis configuration.

### 4.3 Component Hierarchy
*   **Container**: `ChartFullView` / `ChatReportCard` (Manages `highlightedItems` state).
    *   **Visual**: `VizRenderer` -> `VizChart` -> `Chart` (ECharts Wrapper).
    *   **Text**: `InsightPanel` (Triggers highlights).

---

## 5. Future Roadmap (Post v1.4)
*   **Export**: PDF export including the full insight text.
*   **Mobile Adaptation**: Further optimizing the Insight Panel for narrow screens.
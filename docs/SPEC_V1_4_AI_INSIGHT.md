# 🧠 Spec: AI Business Insight (v1.4)

> **Target Version**: v1.4.0
> **Core Value**: Turning Data into Explanations, strictly preserving privacy.
> **Status**: Implemented (merged to develop)

## 1. The "Privacy Paradox" Solution

### 1.1 The Challenge
*   AI needs data to explain "Why".
*   Wansan Architecture forbids sending rows to AI.

### 1.2 The Handshake Protocol (洞察握手)
*   **Principle**: "Aggregated Only, Consent Required".
*   **Mechanism**:
    1.  User clicks "💡 AI Insight" (available in Chat Card or Full View).
    2.  System extracts the **rendered chart data** (not source table rows).
        *   *Example*: For a million-row sales table, only the 12 data points (Monthly Totals) shown in the bar chart are extracted.
    3.  **Consent Dialog**: "Allow sending these 12 data points to AI for analysis?"
    4.  **Transmission**: Send simplified JSON: `{ "Month": "Jan", "Sales": 100 }`.

## 2. User Experience

### 2.1 Entry Points
*   **Drill-Down Menu**: Integrated into chart context menu.
*   **Report Card / Full View**: "AI Insight" expandable panel.

### 2.2 The Insight Card
*   **Location**: Appears below the chart (collapsible).
*   **Content**: Markdown-rendered text (powered by `react-markdown` + `remark-gfm`).
*   **Structure (Auto-Localized)**:
    *   **Summary (概览)**: One sentence describing the overall trend.
    *   **Key Findings (关键发现)**: Bullet points highlighting important observations.
    *   **Recommendation (建议)**: Actionable suggestions.
*   **Interaction**:
    *   **Expand/Collapse**: Toggle visibility.
    *   **Actions**: "Regenerate" and "Remove" buttons (visible only when expanded).

## 3. Implementation Details

### 3.1 Data Extractor (`useChartData`)
*   Extracts `series.data` and `xAxis.data` from the `ReportData` structure.
*   Formats as compact JSON string for Token efficiency.

### 3.2 Prompt Engineering
*   **Role**: "You are a Senior Business Analyst."
*   **Input**: Chart Title, Chart Type, Aggregated Data Points.
*   **Formatting**: Enforces Markdown Headers (`###`) for section separation to ensure proper line breaks in the UI.
*   **I18n**: Dynamically injects English or Chinese headers based on app language settings.

### 3.3 UI Component
*   `src/renderer/components/viz/InsightPanel.tsx`
*   **State Machine**: `idle` -> `consent` -> `analyzing` -> `done` (or `error`).
*   **Persistence**: Insight text is saved in `ReportData.insight` and persisted via `useProjectStore`.

## 4. Risks & Mitigations
*   **Risk**: User misunderstands "Sending Data".
*   **Mitigation**: Clear UI showing EXACTLY what JSON is being sent in the Consent Dialog.
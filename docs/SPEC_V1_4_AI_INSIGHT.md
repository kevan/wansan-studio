# 🧠 Spec: AI Business Insight (v1.4)

> **Target Version**: v1.4.0
> **Core Value**: Turning Data into Explanations, strictly preserving privacy.

## 1. The "Privacy Paradox" Solution

### 1.1 The Challenge
*   AI needs data to explain "Why".
*   Wansan Architecture forbids sending rows to AI.

### 1.2 The Handshake Protocol (洞察握手)
*   **Principle**: "Aggregated Only, Consent Required".
*   **Mechanism**:
    1.  User clicks "💡 AI Insight".
    2.  System extracts the **rendered chart data** (not source table rows).
        *   *Example*: For a million-row sales table, only the 12 data points (Monthly Totals) shown in the bar chart are extracted.
    3.  **Consent Dialog**: "Allow sending these 12 data points to AI for analysis?"
    4.  **Transmission**: Send simplified JSON: `{ "Month": "Jan", "Sales": 100 }`.

## 2. User Experience

### 2.1 Entry Points
*   **Drill-Down Menu**: "Describe this Data Point".
*   **Report Card Footer**: "Analysis" button (expandable section).

### 2.2 The Insight Card
*   **Location**: Appears below the chart (collapsible).
*   **Content**: Markdown-rendered text.
*   **Structure**:
    *   **Summary**: "Sales trend is upward (+15%)."
    *   **Key Drivers**: "Q4 performance was dominant."
    *   **Anomalies**: "Dip in February due to..."

## 3. Implementation Details

### 3.1 Data Extractor (`useChartData`)
*   Create utility to extract `series.data` and `xAxis.data` from ECharts instance.
*   Format as CSV-like string for Token efficiency.

### 3.2 Prompt Engineering
*   **Role**: "You are a Senior Business Analyst."
*   **Input**:
    *   Chart Title (Context).
    *   Aggregated Data Points.
    *   Visual Type (Line/Bar).
*   **Output**: Short, bulleted Markdown. No preamble.

### 3.3 UI Component
*   `src/renderer/components/viz/InsightPanel.tsx`
*   State: `idle` | `extracting` | `consent_wait` | `analyzing` | `done`.

## 4. Risks & Mitigations
*   **Risk**: User misunderstands "Sending Data".
*   **Mitigation**: Clear UI showing EXACTLY what JSON is being sent in the Consent Dialog.

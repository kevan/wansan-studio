# 🗺️ Spec: Report Capability Evolution (From Dashboard to Data Story)

> **Context**: Based on user request `snapshot.png`, aiming to support "Long-Form Data Storytelling" similar to professional vertical reports.
> **Status**: Future Roadmap (Post-MVP).

## 1. Widget Library 2.0 (The "Bricks")

To build a narrative report, we need more than just charts. We need semantic text and structural elements.

### 1.1 New Widget Types
Extend `ReportWidget` type in `useWorkbenchStore`:

1.  **Rich Text (Markdown)**
    *   **Use Case**: Section headers, "Key Findings", executive summaries.
    *   **Data**: `{ content: string, style: 'callout' | 'plain' | 'quote' }`
    *   **AI Logic**: Generated post-query based on data results.

2.  **Timeline**
    *   **Use Case**: Project milestones, historical events.
    *   **Data**: `{ items: { date: string, title: string, desc: string }[] }`
    *   **Viz**: Vertical line with nodes.

3.  **Composite Metric (KPI Card)**
    *   **Use Case**: "Overall Score +47%".
    *   **Data**: `{ value: number, trend: number, label: string, sparklineData?: number[] }`
    *   **Viz**: Big number with trend arrow and mini-chart.

4.  **Radar Chart**
    *   **Use Case**: Multi-dimensional scoring (e.g., "9 Dimensions of Performance").
    *   **Config**: Standard ECharts radar.

## 2. Layout Engine 2.0 (The "Flow")

Current `react-grid-layout` (RGL) is absolute. Narrative reports require **Document Flow**.

### 2.1 "Report Mode" Strategy
*   **Behavior**: Vertical Stack (Single Column).
*   **Auto-Height**: Widgets expand based on text content length.
*   **Interaction**: Drag to reorder vertically (Sortable List), not free 2D positioning.

## 3. AI Narrative Agent (The "Writer")

The "Chat-to-Chart" flow is atomic. We need a "Topic-to-Report" flow.

### 3.1 The Pipeline
1.  **User**: "Generate a Project Wansan Review Report."
2.  **Planner Agent**: Generates a **Structure JSON**:
    ```json
    [
      { "type": "text", "prompt": "Write an executive summary..." },
      { "type": "timeline", "sql": "SELECT date, event FROM milestones..." },
      { "type": "chart", "sql": "SELECT score FROM performance..." },
      { "type": "text", "context": "prev_chart", "prompt": "Analyze the trend..." }
    ]
    ```
3.  **Executor Agent**: Loops through the structure, executing SQL and Text Generation sequentially.

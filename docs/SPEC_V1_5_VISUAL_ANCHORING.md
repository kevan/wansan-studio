# 👁️ Spec: Visual Anchoring (v1.5)

> **Target Version**: v1.5.0
> **Core Value**: "Show, Don't Just Tell." Connect AI insights directly to visual elements.

## 1. Concept
When the AI identifies a trend or anomaly (e.g., "February sales dropped"), the user should verify this visually without searching.
*   **Interaction**: Hovering over a bullet point in the Insight Panel **highlights** the corresponding data points on the chart.

## 2. Technical Architecture

### 2.1 Protocol Upgrade (AI Bridge)
The `generateInsight` function currently returns a raw Markdown string. It must be upgraded to return **Structured JSON**.

**New Interface:**
```typescript
interface InsightResult {
  summary: string;
  findings: Array<{
    id: string;
    markdown: string; // The text content (e.g., "**Feb** sales dropped...")
    sentiment: 'positive' | 'negative' | 'neutral'; // For UI decoration (e.g., icon colors)
    relatedItems: string[]; // Exact X-axis category names referenced (e.g., ["Feb", "Mar"])
  }>;
  recommendation: string;
}
```

### 2.2 Prompt Engineering
*   **Instruction**: "You must output strictly formatted JSON."
*   **Task**: "For each finding, identify the exact names of the X-axis categories that support your statement."
*   **Constraint**: The `relatedItems` must strictly match the strings found in the provided `Aggregated Data`.

## 3. Frontend Implementation

### 3.1 Component: `InsightPanel` (Refactor)
*   **Current**: Renders a single `<SimpleMarkdown />`.
*   **New**:
    *   Renders `summary` and `recommendation` as standard Markdown blocks.
    *   Renders `findings` as an interactive list (`<ul>`).
    *   **Event**: `onHighlight(items: string[])` emitted when hovering a list item.

### 3.2 Component: `VizChart` (Update)
*   **Props**: Add `highlightedItems?: string[]`.
*   **Effect**:
    *   Watch `highlightedItems`.
    *   Use ECharts `dispatchAction`:
        *   `type: 'downplay'` (dim all series).
        *   `type: 'highlight', name: item` (highlight specific data points).
        *   `type: 'showTip', name: item` (optional: auto-show tooltip).

### 3.3 State Management
*   No global store needed for the hover state (ephemeral).
*   State can be lifted to the container (`ChartReportCard` or `ChartFullView`) which holds both `InsightPanel` and `VizChart`.

## 4. Migration Strategy
*   **Backward Compatibility**: The UI must handle both the legacy string format (from v1.4 saved reports) and the new JSON object format.
*   **Type Guard**: `isStructuredInsight(data: any): data is InsightResult`.

## 5. Visual Feedback Design
*   **Normal State**: Chart shows all data normally.
*   **Hover State**:
    *   Insight Item: Background turns slightly darker/colored.
    *   Chart: Non-related bars/lines fade to 30% opacity. Related bars/lines remain 100% opacity + potentially show a focus ring/shadow.

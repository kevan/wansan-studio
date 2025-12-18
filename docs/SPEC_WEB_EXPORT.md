# ✨ Spec: AI Web Export

> **Goal**: Generate a standalone, interactive HTML dashboard from the current session.
> **Technique**: "Skeleton Injection" (AI writes code, Electron injects data).

## 1. The Workflow

1.  **Extract Meta**: Get all widgets from current dashboard. Strip real data.
    ```json
    [{ "type": "bar", "title": "Sales Trend", "x": "date", "y": "amount" }]
    ```
2.  **Prompt AI**:
    > "Create a single-file HTML dashboard using ECharts and Tailwind CSS.
    > Use a Grid layout.
    > Render these charts: ${JSON.stringify(meta)}.
    > **CRITICAL**: Do not invent data. Use `window.WIDGET_DATA['widget_id']` to get data."
3.  **Inject Data**:
    *   Electron reads the AI's HTML string.
    *   Injects a `<script>` tag at the top: `window.WIDGET_DATA = { "w1": [...rows...], "w2": [...] }`.
4.  **Save**: `dialog.showSaveDialog` -> `report.html`.

## 2. Main Process Service (`src/main/services/web-export.ts`)

We need a dedicated service to handle the AI call + String Manipulation.

*   **Function**: `exportWebReport(widgets: Widget[])`
*   **System Prompt**: Use a specialized prompt that forces a clean, dark-mode/light-mode compatible UI.

## 3. UI Integration

*   **Trigger**: Dashboard Header -> Export -> "✨ Interactive Web Page".

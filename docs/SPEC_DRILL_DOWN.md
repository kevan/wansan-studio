# SPEC: Interactive Chart Drill Down

## 1. Goal
Enable users to click on chart elements to trigger context-aware actions, turning static charts into dynamic exploration tools.

## 2. User Experience
* **Trigger**: User clicks a bar, pie sector, or scatter point in `ChartRenderer`.
* **Feedback**:
    * The chart element is highlighted (handled by ECharts `click` event default or simple opacity logic).
    * A **Context Menu (Popover)** appears at the mouse position.
* **Menu Options**:
    1.  **🔍 Focus**: "Filter by {Dimension} = '{Value}'" -> Sends a Chat Message.
    2.  **📄 View Data**: "Show raw data for {Dimension} = '{Value}'" -> Sends a Chat Message requesting a Table.

## 3. Architecture

### 3.1 Event Handling (`ChartRenderer`)
* Listen to `chart.on('click', handler)`.
* **Normalization**: Extract `name` (Dimension Value) and `seriesName` (if applicable) from ECharts `params`.
* **Positioning**: Use `params.event.event.clientX/Y` to position the Popover.

### 3.2 Action Logic
* **Focus**: Construct message `Filter analysis by ${dimension} = '${value}'`.
* **View Data**: Construct message `Show first 20 raw rows where ${dimension} = '${value}'`.
* **Execution**: Call `useChatStore.getState().sendMessage(...)`.

## 4. UI Component
* **DrillDownMenu**: A floating `div` (z-index high) rendered via React Portal or absolute positioning within the chart container.
* **Style**: Swiss Style (Minimal, White bg, Shadow, Rounded).

```markdown
# 🛠️ Spec: Smart Visualization Adapter

> **Goal**: Gracefully handle data structure mapping when switching between chart types.
> **Problem**: ECharts options for Cartesian (Bar/Line) differ from Non-Cartesian (Pie). Switching causes crashes.

## 1. The Strategy: "Best Guess" Mapping

We define a `convertConfig(targetType, currentConfig, rawData)` function.

### 1.1 Type Categories
*   **Cartesian**: `bar`, `line`, `area`, `scatter`. (Uses `xAxis`, `yAxis`, `series.data[]`).
*   **Radial**: `pie`, `donut`. (Uses `series.data: { name, value }[]`).
*   **Tabular**: `table`. (Uses raw rows).
*   **KPI**: `kpi` (Big Number). (Uses 1st row, 1st numeric col).

### 1.2 Conversion Logic

#### Case A: Cartesian -> Cartesian (e.g., Bar -> Line)
*   **Action**: Trivial. Just change `series[0].type`.
*   **Preserve**: `xAxis`, `yAxis`, colors.

#### Case B: Cartesian -> Radial (e.g., Bar -> Pie)
*   **Input**: `xAxis.data` (Categories), `series[0].data` (Values).
*   **Action**: Zip them into `[{ name: cat[i], value: val[i] }]`.
*   **Constraint**: Pie charts handle negative values poorly. (Optional: Filter > 0).

#### Case C: Radial -> Cartesian (e.g., Pie -> Bar)
*   **Input**: `series[0].data` (`{name, value}`).
*   **Action**: Unzip into `xAxis.data` = names, `series[0].data` = values.

#### Case D: Any -> Table
*   **Action**: Ignore config. Just render `rawData`.

#### Case E: Any -> KPI
*   **Action**: Find the first series. Sum it up? Or take the last value?
*   **Decision**: Take the **Total Sum** of the first series.

## 2. Implementation (`viz-adapter.ts`)

Create a utility library in `src/renderer/src/lib/viz-adapter.ts`.

```typescript
export function adaptChartConfig(
  newType: VizType, 
  oldConfig: EChartsOption, 
  data: any[]
): EChartsOption {
  // 1. Identify current type (from oldConfig.series[0].type)
  // 2. Extract standardized "Model": { dimensions: string[], measures: number[] }
  // 3. Generate new Option based on newType + Model
}
```

## 3. UI Integration

*   **Component**: `VizControls.tsx`.
*   **Event**: `onTypeChange(newType)`.
*   **Flow**:
    1.  Call `adaptChartConfig(newType, currentConfig, data)`.
    2.  Call `updateReportConfig(id, newConfig)`.

## 4. Default Limits
*   **Pie Limit**: If Categories > 20, Pie charts are unreadable.
    *   **Auto-Group**: Top 19 + "Others". (Advanced feature, maybe skip for MVP).
    *   **MVP**: Just slice top 20.

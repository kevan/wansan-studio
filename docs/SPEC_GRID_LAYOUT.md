# 🛠️ Spec: Resizable Dashboard Grid

> **Goal**: Enable Drag-and-Drop and Resizing for the Report Canvas.
> **Library**: `react-grid-layout`

## 1. Store Schema Update (`use-workbench-store.ts`)

Update the `ReportWidget` interface to include RGL layout data.

```typescript
export interface ReportWidget {
  id: string;
  // ... existing fields
  layout: {
    i: string; // matches id
    x: number;
    y: number;
    w: number; // 1-12
    h: number; // grid units
  }
}
```

## 2. Default Layout Strategy

When `pinReport` is called, determine the default size based on `viz_type`:

*   **Big Number**: `w: 3, h: 2` (Small & Compact)
*   **Bar/Line Chart**: `w: 6, h: 4` (Half Width)
*   **Table / Complex Chart**: `w: 12, h: 6` (Full Width)
*   **Placement**: Automatically place at `x: 0, y: Infinity` (RGL handles placing it at the bottom).

## 3. Component Implementation (`report-canvas.tsx`)

*   **Wrapper**: Use `<ResponsiveGridLayout>` from `react-grid-layout`.
*   **Breakpoints**: `{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }`
*   **Columns**: `{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }`
*   **Row Height**: `60` (pixels).

## 4. Styling Fixes
*   RGL adds inline styles. We need to ensure the `ReportCard` fills the container: `h-full w-full`.
*   **Resize Handle**: Style the handle to look distinct (a small corner grabber).

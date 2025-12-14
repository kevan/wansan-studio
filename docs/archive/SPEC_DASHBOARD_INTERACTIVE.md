# 🛠️ Spec: Interactive Dashboard Grid

> **Goal**: Enable Drag-and-Drop and Resizing for the Dashboard, with specific logic for A4 Page emulation.
> **Stack**: `react-grid-layout`

## 1. Dependencies
`npm install react-grid-layout lodash.debounce`
`npm install -D @types/react-grid-layout @types/lodash.debounce`

## 2. Store Updates (`use-workbench-store.ts`)

We need to sync the layout positions back to the store.

```typescript
import { Layout } from 'react-grid-layout';

interface ReportWidget {
  id: string;
  // ... other props
  layout: Layout; // { i, x, y, w, h }
}

interface WorkbenchState {
  // Actions
  updateLayout: (newLayout: Layout[]) => void;
}
```

## 3. Component: `DashboardGrid.tsx`

This component replaces the static list in `ReportCanvas`.

### 3.1 Layout Strategy
*   **Cols**: 12 (Standard).
*   **RowHeight**: 30px (Fine-grained control).
*   **Width**:
    *   **A4 Mode**: Fixed `794px` (minus padding).
    *   **Screen Mode**: Reactive `100%`.

### 3.2 The "Page Break" Visual (A4 Only)
To help users avoid putting charts on the page fold.
*   Render a `div` with `border-bottom: dashed` absolute positioned at `297mm`, `594mm`, etc.

### 3.3 Implementation Sketch

```tsx
import GridLayout, { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function DashboardGrid() {
  const { pinnedReports, canvasConfig, updateLayout } = useWorkbenchStore();
  
  // 1. Calculate Width based on Mode
  const isA4 = canvasConfig.layout === 'a4';
  const width = isA4 ? 760 : undefined; // ~210mm minus padding

  return (
    <div className="relative min-h-[500px]">
       
       {/* Page Break Indicator */}
       {isA4 && (
         <div className="absolute top-[1122px] left-0 right-0 border-b-2 border-dashed border-red-300 opacity-50 pointer-events-none z-0">
            <span className="text-xs text-red-400 bg-white px-1">Page 2</span>
         </div>
       )}

       {/* The Grid */}
       <ResponsiveGridLayout
         className="layout"
         layouts={{ lg: pinnedReports.map(r => r.layout) }}
         breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
         cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }} // Force 12 cols in large
         rowHeight={30}
         width={width} // Pass explicit width for A4
         onLayoutChange={(currentLayout) => updateLayout(currentLayout)}
         draggableHandle=".drag-handle"
       >
         {pinnedReports.map((report) => (
           <div key={report.id} className="relative group">
              {/* Report Card */}
              <ReportCard data={report} variant="dashboard" />
              
              {/* Drag Handle (Top-Right, shows on hover) */}
              <div className="drag-handle absolute top-2 right-2 p-1 cursor-move opacity-0 group-hover:opacity-100 bg-white rounded shadow-sm z-10">
                 <MoveIcon />
              </div>
           </div>
         ))}
       </ResponsiveGridLayout>
    </div>
  )
}
```

## 4. Default Layout Logic (`use-chat-store.ts` -> `pinReport`)

When pinning a new report, we must calculate a default `layout` object.

*   `x`: 0
*   `y`: Infinity (Puts it at bottom)
*   `w`: 12 (Full width default) or 6 (Half width)
*   `h`: 10 (approx 300px)

```typescript
const newWidget = {
  ...data,
  layout: { i: id, x: 0, y: Infinity, w: 12, h: 10 }
}
```

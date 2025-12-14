```markdown
# 🛠️ Refactor Spec: Dashboard V3 (Layered Architecture)

> **Goal**: Fix layout glitches by decoupling the "Visual Paper" from the "Interactive Grid".
> **Strategy**: Absolute Overlay.

## 1. Directory Structure

Create a new folder `src/renderer/src/components/dashboard-v3/` to isolate this refactor.

```text
dashboard-v3/
├── index.tsx           # Entry point (Scroll & Zoom Wrapper)
├── page-layer.tsx      # The visual background (White Papers)
└── grid-layer.tsx      # The RGL wrapper (Transparent)
```

## 2. Constants

```typescript
// Define standard A4 dimensions (96 DPI approx)
export const PAGE_WIDTH_PX = 794;  // 210mm
export const PAGE_HEIGHT_PX = 1123; // 297mm
export const PAGE_GAP_PX = 20;      // Gap between pages
export const GRID_ROW_HEIGHT = 30;  // RGL Row Height
```

## 3. Component Implementation

### 3.1 `index.tsx` (The Controller)

Handles Store connection, Zoom calculation, and Export targeting.

```tsx
export function DashboardCanvasV3() {
  const { canvasConfig, pinnedReports } = useWorkbenchStore();
  const { zoom, layout } = canvasConfig;
  const isA4 = layout === 'a4';

  // Calculate required height based on widgets
  const maxGridY = Math.max(...pinnedReports.map(r => r.layout.y + r.layout.h), 0);
  const contentHeight = maxGridY * GRID_ROW_HEIGHT;
  
  // Calculate Page Count
  const effectivePageHeight = PAGE_HEIGHT_PX + PAGE_GAP_PX;
  const pageCount = isA4 ? Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT_PX)) : 1;
  const totalHeight = isA4 ? (pageCount * effectivePageHeight) : '100%';

  return (
    <div className="w-full h-full overflow-auto bg-zinc-100/50 flex justify-center p-10">
      {/* ZOOM SCALER */}
      <div
        id="dashboard-export-root"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          width: isA4 ? `${PAGE_WIDTH_PX}px` : '100%',
          minHeight: isA4 ? `${totalHeight}px` : '100%',
          position: 'relative' // Context for absolute layers
        }}
        className="transition-transform duration-200"
      >
         {/* LAYER 1: Visual Backgrounds */}
         <PageLayer isA4={isA4} pageCount={pageCount} />

         {/* LAYER 2: Interactive Grid */}
         <GridLayer 
            width={isA4 ? PAGE_WIDTH_PX : 1200} // Pass width to RGL
            isA4={isA4}
         />
      </div>
    </div>
  );
}
```

### 3.2 `page-layer.tsx` (The Visuals)

Renders the "Paper" divs. Completely static.

```tsx
export function PageLayer({ isA4, pageCount }: { isA4: boolean, pageCount: number }) {
  if (!isA4) return null; // Screen mode has no paper background

  return (
    <div className="absolute inset-0 z-0 flex flex-col pointer-events-none" style={{ gap: PAGE_GAP_PX }}>
      {Array.from({ length: pageCount }).map((_, i) => (
        <div 
          key={i}
          className="w-full bg-white shadow-sm border relative"
          style={{ height: PAGE_HEIGHT_PX }}
        >
           {/* Footer Branding */}
           <div className="absolute bottom-0 w-full h-12 border-t flex items-center justify-between px-8 text-xs text-zinc-300">
              <span>Wansan Studio</span>
              <span>Page {i + 1}</span>
           </div>
        </div>
      ))}
    </div>
  );
}
```

### 3.3 `grid-layer.tsx` (The Interaction)

Renders `ResponsiveGridLayout`.

*   **Crucial**: ClassName `z-10` to sit ON TOP of PageLayer.
*   **Crucial**: Transparent background.

```tsx
export function GridLayer({ width, isA4 }: { width: number, isA4: boolean }) {
  const { pinnedReports, updateLayout } = useWorkbenchStore();

  return (
    <div className="relative z-10"> {/* Interactive Layer */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: pinnedReports.map(r => r.layout) }}
        width={width}
        rowHeight={GRID_ROW_HEIGHT}
        cols={{ lg: 12, ... }}
        onLayoutChange={updateLayout}
        // ...
      >
        {pinnedReports.map(item => (
           <div key={item.id}>
              <ReportCard data={item} variant="dashboard" />
           </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
```

## 4. Migration Steps

1.  Create the files.
2.  Replace `<ReportCanvas>` in `MainLayout` with `<DashboardCanvasV3>`.
3.  Delete old `dashboard-grid.tsx` and `report-canvas.tsx` after verification.

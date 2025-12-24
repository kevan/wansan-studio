# Refactor Plan: Dashboard V3 (Physical Pagination)

## 1. Problem Definition
The current dashboard uses a single, infinite `react-grid-layout` (RGL) instance. While efficient for screen dashboards, it fails for A4/Print layouts because:
- **Coordinate Mismatch**: Mapping continuous `y` pixels to discrete pages (with gaps/headers/footers) causes calculation errors.
- **Drag UX**: Dragging items across long distances (e.g., Page 1 to Page 5) in a scaled canvas is jittery.
- **Footer Avoidance**: Logic to "jump" over footers is complex and prone to edge cases.
- **Flow**: RGL's vertical compaction forces items to "float up", which is undesirable for static report layouts (PPT/Word style).

## 2. Proposed Architecture

### 2.1 Core Concept: "List of Pages"
Instead of one grid, we treat each A4 page as an independent container (Drop Zone).

**Visual Structure:**
```text
[ Canvas Root ]
   |
   +-- [ Page 1 Container (Relative) ] -> RGL Instance 1
   |      +-- Widget A (x:0, y:0)
   |      +-- Widget B (x:6, y:0)
   |
   +-- [ Page 2 Container (Relative) ] -> RGL Instance 2
   |      +-- Widget C (x:0, y:0)
```

### 2.2 Data Structure Change
**Current (Global)**:
```typescript
interface ReportWidget {
  layout: { x: number, y: number, w: number, h: number } // y is global infinite
}
```

**New (Page-Local)**:
```typescript
interface ReportWidget {
  pageIndex: number; // 0-based index
  layout: { x: number, y: number, w: number, h: number } // y is local to page (0-38)
}
```

### 2.3 Tech Stack Selection
**Recommended**: **Multiple `react-grid-layout` Instances** (One per page).
- **Pros**: Reuses existing RGL logic (resizing, grid snapping); familiar API.
- **Cons**: RGL's native "drag between grids" support is limited.
- **Solution**: Use RGL's `isDroppable` prop combined with a global Drag Layer, OR simply manage `onDragStop` to detect which page the mouse is over.

**Alternative**: **dnd-kit**.
- **Pros**: Modern, highly customizable drag behavior.
- **Cons**: Need to re-implement grid snapping and resizing from scratch.
- **Verdict**: Stick with **Multiple RGL** for velocity, but manage the "Transfer" logic manually.

## 3. Implementation Steps

### Phase 1: Data Migration & Store Update
1.  **Modify `ReportWidget`**: Add `pageIndex`.
2.  **Migration Utility**: On load, convert global `y` to `pageIndex` + `localY`.
    ```typescript
    const PAGE_HEIGHT_ROWS = 38; // (1123 - 80 footer) / 30
    pageIndex = Math.floor(y / PAGE_HEIGHT_ROWS);
    localY = y % PAGE_HEIGHT_ROWS;
    ```
3.  **Update Actions**: `pinReport`, `updateLayout` need to handle page targets.

### Phase 2: UI Component Refactor (`DashboardCanvasV3`)
1.  **Remove `GridLayer` (Singular)**.
2.  **Create `PageContainer`**:
    - Renders an A4 background.
    - Contains one `ResponsiveGridLayout`.
    - Accepts `widgets` filtering by `pageIndex`.
3.  **Inter-Page Dragging**:
    - When dragging starts, lift the widget to a global portal (optional, or just keep it in RGL).
    - *Challenge*: RGL doesn't easily let you drag from Grid A to Grid B.
    - *Workaround*:
        1. Keep using **One Big Grid** but purely for the *Drag Layer*? No, that defeats the purpose.
        2. **True Solution**: Use `react-grid-layout`'s `isDroppable` feature? It's for external items.
        3. **Hybrid**:
           - While dragging, the item is removed from Page A and rendered in a "Global Drag Layer" that follows the mouse.
           - We detect which Page Container is under the mouse.
           - On Drop, we insert into that Page's data.

### Phase 3: Export Logic
1.  Iterate through `pages`.
2.  Render each `PageContainer` independently to image.
3.  Add to PDF.

## 4. Immediate Action Plan (Hybrid Approach)

To avoid rewriting the entire drag engine, we can try a **Visual Pagination** approach first, which is safer:

1.  **Keep Global RGL** (for now) but strictly enforce "Page Boundaries" in the `onDrag` event.
2.  **Visual Feedback**: Render the "Pages" as background (already done).
3.  **Strict Snapping**: Instead of just pushing to next page, *snap* to the top of the nearest page if within a threshold.

*However, since the user explicitly asked for a refactor due to "poor effect", we should go for the **Multiple RGL** approach.*

## 5. Refactor Roadmap (Multiple RGL)

1.  **Store**: Add `moveWidgetToPage(widgetId, targetPageIndex, newLayout)`.
2.  **Canvas**: Render `map(pages => <PageGrid pageId={i} />)`.
3.  **Interaction**:
    - This is the hard part. RGL doesn't support dragging *out* of a grid easily.
    - **Compromise**: Add "Move to Page..." menu action? No, UX is bad.
    - **Better**: Use `dnd-kit` for the *Drag* operation, and `react-grid-layout` only for the *Layout/Resize* inside the page.
    - When user grabs a card handle -> trigger `dnd-kit` drag.
    - Overlay the `dnd-kit` item over the canvas.
    - Drop onto a `PageDroppable` area.
    - Update store: `pageIndex = newIndex`.

## 6. Execution Decision
We will proceed with **Phase 1 (Store)** and **Phase 2 (UI)** using the **Multiple RGL + dnd-kit (Wrapper)** approach if approved.

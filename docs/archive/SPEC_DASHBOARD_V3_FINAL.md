# 🛠️ Spec: Dashboard Engine V3 (Final)

> **Version**: 3.0
> **Date**: 2025-12-11
> **Core Concept**: Decoupled Layers (Visual vs. Interactive) with Coordinate-Based Pagination.

## 1. Architecture Overview

We moved away from "HTML Flow" layout to an "Absolute Coordinate" layout to support precise A4 pagination.

### 1.1 The "Burger" Layers
The `DashboardCanvasV3` component renders a stack of layers inside a Zoom Wrapper.

```text
[Zoom Wrapper (transform: scale)]
  ├── [Layer 1: PageLayer] (z-0)
  │     ├── Div (Page 1 White Paper)
  │     ├── Div (Gap 20px)
  │     └── Div (Page 2 White Paper)
  │
  └── [Layer 2: GridLayer] (z-10)
        └── ReactGridLayout (Transparent, Continuous Height)
```

### 1.2 Coordinate System
*   **Unit**: Pixels (px).
*   **A4 Height**: `1123px`.
*   **Gap Height**: `20px`.
*   **Block Height**: `1163px` (Page + Gap).
*   **Y-Axis Logic**:
    *   `y = 0` -> Page 1 Top.
    *   `y = 1123` -> Page 1 Bottom (Gap Start).
    *   `y = 1163` -> Page 2 Top.

---

## 2. Interaction Logic

### 2.1 Drag & Drop (RGL)
*   **Compaction**: Disabled (`compactType={null}`) in A4 Mode to allow free placement.
*   **Auto-Pagination**:
    *   Implemented in `onLayoutChange`.
    *   Checks if any item crosses the `Footer Safe Zone` or `Gap Zone`.
    *   If overlap detected: Pushes item `y` to the start of the next page block.

### 2.2 Manual Page Management
*   **Add Page**: User clicks button -> `pageCount++`.
*   **Remove Page**: User clicks trash -> `pageCount--`.
*   **State**: Stored in `WorkbenchStore`.

---

## 3. Export Pipeline (The "Slicing" Strategy)

We abandoned `printToPDF` and simple screenshots for a hybrid approach.

### 3.1 The Process
1.  **Freeze**: Reset Zoom to 100%.
2.  **Capture**: `html-to-image` takes a snapshot of the ENTIRE `dashboard-export-root` (including gaps).
3.  **Slice**: Use an off-screen `<canvas>`.
    *   Loop `i` from `0` to `pageCount`.
    *   Source Y: `i * BLOCK_HEIGHT`.
    *   Source Height: `A4_HEIGHT` (Excluding Gap).
    *   Draw to Canvas -> `toDataURL`.
4.  **Stitch**: Add each DataURL to `jspdf`.

### 3.2 Benefits
*   **Perfect Visuals**: WYSIWYG.
*   **No Cut-off**: Gaps are explicitly skipped during slicing.
*   **Headers/Footers**: Rendered on the `PageLayer`, so they are captured naturally.

---

## 4. Component Dictionary

| Component | Responsibility |
| :--- | :--- |
| `index.tsx` | Controller. Handles Zoom, Scroll, Export Trigger. |
| `page-layer.tsx` | Visuals only. Renders white div, shadow, footer text. |
| `grid-layer.tsx` | Interaction only. Renders RGL, handles auto-push logic. |
| `dashboard-header.tsx` | Global controls (Page Count, Layout Switch, Export). |

## 5. Constants (Single Source of Truth)

```typescript
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const PAGE_GAP_PX = 20;
export const ROW_HEIGHT = 30;
```

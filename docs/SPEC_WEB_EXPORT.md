# 🌐 Spec: Web Export (The Hydration Pack)

> **Target Version**: v1.5.0
> **Core Value**: "Reach" - Share interactive dashboards as standalone, offline-capable HTML files.
> **Strategy**: "The Hydration Pack" - Package real React components instead of AI-generated code.

## 1. User Experience

*   **Trigger**: Button in Dashboard Header -> "Export as Web Page".
*   **Config**: Modal to select Theme (Light/Dark) and Title.
*   **Output**: A single `.html` file (e.g., `Q3_Report.html`).
*   **Result**: 
    *   Opens in any browser.
    *   Identical rendering to the desktop app (ECharts, Tailwind styles).
    *   **Interactive**: Tooltips, Visual Anchoring, Insight Panel expansion work.
    *   **Static**: No SQL execution, no AI generation, no editing.

## 2. Technical Architecture

### 2.1 The "Export Runtime"
A lightweight React application dedicated to rendering the dashboard state.

*   **Directory**: `src/export-runtime/`
*   **Entry**: `main.tsx` (Renders `DashboardCanvas` with read-only props).
*   **Build**: Uses Vite to compile into a single-file HTML (inlining JS/CSS).

### 2.2 Data Injection Protocol
Instead of fetching data, the Runtime reads from a global variable injected at export time.

```typescript
// Injected into index.html
window.__WANSAN_SNAPSHOT__ = {
  meta: {
    title: "Q3 Sales Report",
    generatedAt: 1736294400000,
    version: "1.5.0"
  },
  layoutConfig: {
    // Canvas settings (zoom, layout mode)
  },
  pages: [
    // Page layout definitions
  ],
  widgets: {
    "widget-1": {
      id: "widget-1",
      type: "bar",
      tableData: [...], // Full dataset
      vizConfig: {...},
      insight: {...}    // Structured insight
    }
  }
};
```

### 3. Implementation Plan

#### Phase 1: Component Decoupling (Refactor)
**Goal**: Ensure visualization components are "Pure" (Props-driven) and do not depend on Electron/Zustand context.

*   **Target Components**:
    *   `VizChart.tsx` & `Chart.tsx`: Remove `useChatStore`. Move `onDrillDown` logic to props.
    *   `InsightPanel.tsx`: Already mostly pure. Ensure no IPC calls.
    *   `VizRenderer.tsx`: Remove `useTranslation` dependency (or ensure i18n provider exists in runtime).
    *   `DashboardCanvasV3.tsx`: Decouple from `useWorkbenchStore`. Accept `layout` and `widgets` as props.

#### Phase 2: The Export Runtime Build
**Goal**: Create a build pipeline that outputs `dist/export-template.html`.

*   **Vite Config**: `vite.export.config.ts`.
    *   Plugin: `vite-plugin-singlefile` to inline assets.
    *   Tree-shaking: Ensure unused heavy libraries (Monaco, DuckDB Node bindings) are excluded.
*   **Runtime App**:
    *   `App.tsx`: Reads `window.__WANSAN_SNAPSHOT__`.
    *   Hydrates `DashboardCanvas` with the snapshot data.
    *   Provides a `ReadOnlyContext` to disable editing features.

#### Phase 3: The Export Service (Main Process)
**Goal**: Stitch data into the template.

*   **Service**: `WebExportService`.
*   **Logic**:
    1.  Read `dist/export-template.html`.
    2.  Serialize current `ProjectStore` state.
    3.  Replace `<!-- INJECT_SNAPSHOT -->` with `<script>window.__WANSAN_SNAPSHOT__ = ...</script>`.
    4.  Write to user-selected path.

## 4. Dependencies & Risks

*   **Risk**: Bundle Size. ECharts + React + Tailwind might be large (>1MB).
    *   *Mitigation*: Acceptable for a "Report". Users expect attachments to be a few MBs.
*   **Risk**: Tailwind CSS.
    *   *Solution*: The Vite build will generate optimized CSS based on usage in the Runtime.

## 5. Definition of Done
1.  Components refactored to be pure.
2.  `npm run build:export` generates a working template.
3.  "Export" button generates a file that opens in Chrome and renders the dashboard correctly.
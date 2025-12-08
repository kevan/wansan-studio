# 🛠️ Implementation Spec: Analyst Workbench UI

> **Goal**: Refactor the main interface from a 2-column layout (Sidebar + Chat) to a **3-column layout** (Sidebar + Chat Stream + Report Canvas).
> **Core Concept**: Chat is the "Drafting Area", Canvas is the "Final Deliverable".

## 1. Layout Architecture (Grid System)

**File**: `src/renderer/src/components/layout/main-layout.tsx`

We need a flexible 3-pane layout using `ResizablePanel` (from Shadcn UI / `react-resizable-panels`).

```text
[ Sidebar (20%) ]  |  [ Chat Stream (30%) ]  |  [ Report Canvas (50%) ]
(Data Tree)        |  (Interaction)          |  (Dashboard/Grid)
                   |                         |
                   |  [ Input Bar ]          |  [ Export Toolbar ]
```

*   **Left**: Data Tree (Existing).
*   **Middle**: Chat Interface.
    *   *Change*: Input bar stays here. Messages are ephemeral exploration.
*   **Right**: **The Canvas**.
    *   *New*: A grid container (CSS Grid or `react-grid-layout`) that holds "Pinned" reports.
    *   *Empty State*: "Pin a chart from the chat to add it to your report."

---

## 2. State Management Updates (`use-workbench-store.ts`)

We need to store the "Pinned Reports" separately from the "Chat Messages".

```typescript
export interface ReportWidget {
  id: string;
  sourceMessageId: string; // Link back to chat context
  title: string;
  vizConfig: any;          // ECharts option
  summary: string;
  layout: { x: number, y: number, w: number, h: number }; // For Grid Layout
}

interface WorkbenchState {
  pinnedReports: ReportWidget[];
  
  // Actions
  pinReport: (messageId: string, reportData: any) => void;
  removeReport: (reportId: string) => void;
  updateLayout: (layout: any[]) => void;
}
```

---

## 3. Component Interactions

### A. The "Pin" Action
*   **Component**: `ReportCard` (in Chat).
*   **Change**: Add a generic `ActionToolbar` to the card header.
    *   Button: `📌 Pin` (Icon: Pin).
    *   **Logic**: On click, call `pinReport()`.
    *   **Animation**: Use `framer-motion` to make the card "fly" from the Chat column to the Canvas column.

### B. The Canvas Grid
*   **Component**: `ReportCanvas`.
*   **Logic**: Render the list of `pinnedReports`.
*   **Interactivity**:
    *   Each widget should have a `Delete` button (X) on hover.
    *   (Nice to have) Drag to re-order.


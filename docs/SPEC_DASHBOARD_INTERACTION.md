### 🚀 下一步任务：Dashboard 编辑与交互 (Dashboard Interactivity)

**目标**：让右侧 Dashboard 里的卡片“活”起来，支持基本的编辑和重排。

**功能点 (Features)**:
1.  **Remove (取消钉选)**：允许用户把不想看的图删掉。
2.  **Rename (重命名)**：双击标题，可以直接编辑。这对于导出 PDF 非常重要（AI 起的名字有时候太长）。
3.  **Expand (放大查看)**：点击卡片角落的 `⤢` 图标，弹出一个 Modal 全屏查看这个图表。

---

### 📄 文档设计: `docs/SPEC_DASHBOARD_INTERACTION.md`

```markdown
# 🛠️ Spec: Dashboard Interactions

> **Goal**: Make the Dashboard actionable. Users should be able to curate their final report.

## 1. Store Updates (`use-workbench-store.ts`)

Add actions to modify existing pinned reports.

```typescript
interface WorkbenchState {
  // ... existing
  removeReport: (id: string) => void;
  updateReportTitle: (id: string, newTitle: string) => void;
  // Optional: reorderReports: (startIndex, endIndex) => void;
}
```

## 2. Component Updates (`ReportCard.tsx`)

We need to enhance the `Header` section of the card when `variant="dashboard"`.

### A. Editable Title
*   **Interaction**:
    *   Default: Text display.
    *   Hover: Show a small `Edit` pencil icon.
    *   Click: Replace Text with an `<Input autoFocus />`.
    *   Blur/Enter: Save to Store.

### B. Action Menu (Top-Right)
Replace the simple Pin button with a **Dropdown Menu** (`...`):
*   `⤢ Fullscreen`: Open a Dialog with the chart.
*   `🗑️ Remove`: Call `removeReport`.

## 3. Fullscreen View (`ChartPreviewModal.tsx`)
A simple Dialog component that renders the `ReportCard` in `variant="dashboard"` but with fixed large dimensions (e.g., 80vw x 80vh).
```

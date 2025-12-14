这是 **Project Wansan 架构全书** 的第四卷。这份文档涵盖了用户最直接感知的界面交互部分，包括对话流、仪表盘布局以及图表渲染引擎。

请保存为 `docs/03_WORKBENCH_UI.md`。

---

# 📙 03_WORKBENCH_UI.md - Interaction & Visualization

> **Version**: 1.0
> **Status**: Authoritative
> **Scope**: Chat Stream, Dashboard V3, ECharts, Export.

---

## 1. Chat Interface (对话界面)

对话流不仅是聊天，而是 **"Analysis Log" (分析日志)**。

### 1.1 Magic Input (魔法指令栏)
*   **Design**: 悬浮胶囊 (`Floating Capsule`)，位于底部。
*   **Features**:
    *   **@ Mention**: 输入 `@` 唤起文件列表。发送时自动解析为表名。
    *   **Slash (/)**: 支持 `/clear`, `/export` 指令。
    *   **Smart Placeholder**: 动态显示 "Ask about {table1}, {table2}..."。

### 1.2 Message Bubble (消息气泡)
*   **Layout**: 左对齐布局 (Slack Style)。
*   **Thinking Block**: 默认折叠 AI 的思考过程和 SQL，保持界面整洁。
*   **Follow-up Chips**: 在回复底部提供 3 个 AI 推荐的追问按钮。

### 1.3 Error Handling
*   **Error Card**: 当 SQL 执行失败且自愈无效时，展示红色卡片。
*   **API Key Guard**: 如果未配置 Key，展示 "Configuration Required" 引导卡片。

---

## 2. Report Card (核心组件)

`ReportCard` 是连接 Chat 和 Dashboard 的通用组件。

### 2.1 Dual Variants (双态设计)
*   **Chat Mode**:
    *   Emphasis on **Narrative** (Text Summary).
    *   Chart height: Medium.
    *   Actions: `Pin`, `Refine`, `Code`.
*   **Dashboard Mode**:
    *   Emphasis on **Visuals** (Chart).
    *   Summary hidden behind `💡` icon.
    *   **Big Number**: Single values rendered as KPI cards (Huge Font).

### 2.2 Viz Adapter (智能图表适配)
*   **Role**: 防止图表类型切换时崩溃。
*   **Logic**:
    *   `Bar -> Pie`: Map `xAxis` -> `name`, `series` -> `value`.
    *   `Pie -> Line`: Inverse mapping.
    *   Fallback: If mapping fails, render `Table`.

---

## 3. Dashboard V3 (看板引擎)

基于 **Layered Architecture** 的高性能排版引擎。

### 3.1 Architecture
```text
[Viewport]
  ├── [Layer 1: Visuals] (z-0) --> Page Backgrounds (White), Footers, Gaps.
  └── [Layer 2: Grid] (z-10)   --> ReactGridLayout (Transparent).
```

### 3.2 Pagination Logic
*   **A4 Mode**:
    *   Canvas width locked to `794px`.
    *   Height grows by `Page Height + Gap`.
    *   **Manual Paging**: User clicks `[+ Add Page]`.
    *   **No Compaction**: Items stay where dropped (PPT style).
*   **Screen Mode**:
    *   Canvas width `100%`.
    *   Infinite vertical scroll.

### 3.3 Interactivity
*   **Resize**: Drag handles to resize charts.
*   **Fullscreen Edit**: Click `⤢` to open a modal for fine-tuning charts (x/y axis, colors).

---

## 4. Export Pipeline (导出系统)

### 4.1 Export Image (Single Card)
*   **Lib**: `html-to-image`.
*   **Filter**: Apply CSS class `.hide-on-export` to exclude UI controls (buttons, handles) from the screenshot.

### 4.2 Export PDF (Dashboard)
*   **Strategy**: **Canvas Slicing**.
    1.  Capture the entire dashboard as a giant PNG.
    2.  Slice it programmatically into A4 chunks.
    3.  Generate multi-page PDF via `jspdf`.

### 4.3 Export HTML (Interactive)
*   **Feature**: Generate a standalone `.html` file containing chart data + ECharts library.
*   **Layout**: Use CSS Grid to approximate the dashboard layout in the static file.

---

**(End of Workbench Spec)**

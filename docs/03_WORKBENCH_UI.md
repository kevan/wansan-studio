# 📙 03_WORKBENCH_UI.md - Interaction & Visualization

> **Version**: 1.3 (Swiss Style Update)
> **Status**: Authoritative
> **Scope**: Chat Stream, Dashboard V3, Wizard, Export.

---

## 1. Data Integration Wizard (数据集成向导)

Wansan 采用一个统一的向导来处理所有数据集成需求。

### 1.1 Flow
*   **Step 1: Select**: 支持多文件/多 Sheet 选择。
*   **Step 2: Preview**: 
    *   **Lazy Preview**: 实时查看前 100 行数据。
    *   **Type Override**: 强制修改列类型 (Text/Number/Date)。
    *   **Mapping (Append)**: 可视化字段对齐。
*   **Step 3: Target/Conflict**: 
    *   **Import**: 自动查重并修改表名。
    *   **Append**: 复合主键冲突预检，提供 Ignore/Replace 策略。

### 1.2 Swiss Design ("Wansan Airy")
采用以 "空气感" 为核心的视觉语言：
*   **Shape**: 大圆角 (`2.5rem` / `40px`)，以此构建温润的工具触感。
*   **Depth**: 摒弃黑色硬边框，使用多层级柔和阴影 (`shadow-2xl` + `ring-1 ring-zinc-900/5`) 来定义层级。
*   **Typography**: 降低字重，增加行高，使用 `Zinc-500` 作为次级文本色，减少视觉干扰。

---

## 2. Chat Interface (对话界面)

### 2.1 Magic Input (魔法指令栏)
*   **Design**: 悬浮胶囊 (`Floating Capsule`)。
*   **Features**:
    *   **@ Mention**: 引用表名。
    *   **Slash (/)**: 快捷指令 (`/clear`, `/export`).

### 2.2 Report Card Evolution
卡片不再是静态图片，而是**可编辑的叙事单元**。
*   **Chat Mode**: 侧重叙事 (Summary + Chart)。
*   **Report Mode**: 
    *   **Direct Editing**: 点击标题或正文即可直接修改 (ContentEditable)。
    *   **Drag & Drop**: 在 Continuous Flow 中自由长按拖拽排序。
    *   **Hide/Show**: 可隐藏 Report 中的特定 Section（如仅保留图表，隐藏冗余的 AI 废话）。
*   **SQL Lab**: 点击 `<Code />` 可查看并修改 AI 生成的 SQL，实时重绘图表。

---

## 3. Dashboard V3 (看板引擎)

基于 **Layered Architecture** 的高性能排版引擎。

### 3.1 Architecture
```text
[Viewport]
  ├── [Layer 1: PageLayer] (z-0) --> A4 White Paper Background.
  └── [Layer 2: GridLayer] (z-10) --> ReactGridLayout (Transparent).
```

### 3.2 Layout Modes
1.  **A4 Mode (Print)**: 固定 `794px` 宽度，模拟物理纸张。支持分页导出 PDF。
2.  **Screen Mode (Presentation)**: 100% 宽度，自适应大屏展示。

### 3.3 Interactive KPI Grids
新的 KPI 卡片组采用 **"Visual Anchoring"** 交互模式：
*   **Hover**: 鼠标悬停在某个 KPI 上时，**其他所有 KPI 自动进入 Blur (模糊) 状态** (Opacity 0.3 + Blur 2px)。
*   **Focus**: 当前 KPI 高亮显示，并自动关联下方图表中对应的 Series（如 Hover "Sales" 卡片，图表中的 Sales 线条高亮，Cost 线条变暗）。
*   **Grouping**: KPI 自动按逻辑分组 (e.g. "Core Metrics" vs "Ratios")，视觉上通过微小的间距区分。

## 4. Export Pipeline (导出系统)

### 4.1 Export Image
使用 `html-to-image` 截取单个 Report Card。

### 4.2 Export PDF (Dashboard)
采用 **Canvas Slicing** 策略。
1.  截取整个 Dashboard 长图。
2.  按 A4 高度进行像素级切片。
3.  生成多页 PDF。

### 4.3 Export HTML
生成包含 ECharts 库和 JSON 数据的单文件 HTML，支持离线交互。
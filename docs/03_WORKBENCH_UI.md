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

### 1.2 Swiss Design
采用 "Airy" 设计语言：大圆角 (`2.5rem`)、柔和阴影 (`shadow-2xl`)、极简边框，消除视觉压迫感。

---

## 2. Chat Interface (对话界面)

### 2.1 Magic Input (魔法指令栏)
*   **Design**: 悬浮胶囊 (`Floating Capsule`)。
*   **Features**:
    *   **@ Mention**: 引用表名。
    *   **Slash (/)**: 快捷指令 (`/clear`, `/export`).

### 2.2 Report Card
*   **Chat Mode**: 侧重叙事 (Summary + Chart)。
*   **Dashboard Mode**: 侧重视觉 (Full Chart)。
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

---

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
# 🧭 SPEC: Data Explorer & Dual-Mode Workbench

> **Version**: 1.0
> **Target**: v1.7 (Foundation) -> v1.7.5 (Full Interactive)
> **Status**: Draft
> **Theme**: "Immersive Data Wrangling"

---

## 1. 核心理念 (Philosophy)

### 1.1 Context Separation (上下文分离)
为了解决 Analysis (分析) 与 Wrangling (治理) 在单一界面下的空间冲突与心智负担，我们将应用划分为两个顶级模式：
*   **💬 Analysis Mode**: 侧重对话、报表生成与消费。数据仅作为引用。
*   **🗄️ Data Mode**: 侧重数据资产的管理、清洗、结构定义与预览。提供沉浸式 IDE 体验。

### 1.2 Data Explorer (数据探索器)
Data Mode 的核心载体。它不是简单的表格预览，而是一个**轻量级的 Data IDE**。
*   **Schema as UI**: 表结构定义（类型、别名、描述）直接融合在表格的列头交互中，不再需要模态弹窗。
*   **Visual Wrangling**: 清洗操作（转换、提取、过滤）通过右键菜单和侧边栏工具箱完成。

---

## 2. 交互架构 (Interaction Architecture)

### 2.1 Mode Switcher (模式切换)
*   **位置**: Sidebar 顶部 (Header Area)。
*   **样式**: Segmented Control (分段控制器) 或 Tab Bar。
*   **状态**:
    1.  `Analysis`: Sidebar 显示 `SessionList`。Main 显示 `ChatStream` / `Dashboard`。
    2.  `Data`: Sidebar 显示 `DataTree`。Main 显示 `DataWorkspace`。

### 2.2 Data Workspace (数据工作台)
Data Mode 下的主界面布局：

```text
[ Sidebar (260px) ]  |  [ Main Stage (Flex) ]           |  [ Inspector (300px) ]
---------------------|----------------------------------|-----------------------
Data Tree            |  Toolbar (Table Actions)         |  Column Profile
- Project            |----------------------------------|  - Histogram
  - Tables           |  Data Grid (Virtual Scroll)      |  - Stats
  - Views            |  - Sticky Headers w/ Schema UI   |  
  - Files            |  - Inline Editing (v1.7.5)       |  Transformation Tools
                     |                                  |  - AI Extract
                     |                                  |  - Cast Type
```

---

## 3. 功能特性 (Features)

### 3.1 Data Tree (Sidebar)
*   **Unified Assets**: 统一展示 Sources (原始文件), Tables (DuckDB 表), Views (逻辑视图)。
*   **Drag & Drop**: 支持从系统拖拽文件直接上传。
*   **Context Menu**: `Delete`, `Rename`, `Re-ingest`, `Export`.

### 3.2 The Grid (Main Stage)
*   **Header Controls**:
    *   **Icon**: 显示当前类型 (e.g., `#` for Number, `Aa` for Text)。点击可快速 `Cast Type`。
    *   **Label**: 双击重命名 (Alias)。
    *   **Menu**: 右键呼出列操作菜单 (`Rename`, `Change Type`, `AI Extract`, `Hide`).
*   **Performance**: 使用虚拟滚动渲染百万级行。
*   **Status Bar**: 显示总行数、过滤状态、最后更新时间。

### 3.3 Inspector (Right Panel) [Collapsible]
*   **Selection Context**: 当在 Grid 中选中某列时，显示该列的详细信息。
*   **Metadata**: 字段描述 (Semantic Description)、原始列名。
*   **Quick Actions**: 常用清洗操作的快捷入口。

---

## 4. 迁移策略 (Migration Strategy)

### Phase 1: Structural Refactor (v1.7)
1.  **Sidebar**: 实现 `ModeSwitcher`，拆分 `SessionList` 和 `DataTree`。
2.  **Navigation**: 实现全局状态 `appMode` ('analysis' | 'data')。
3.  **Components**:
    *   保留现有 `ChatStream` 在 Analysis Mode。
    *   在 Data Mode 复用并增强现有的 `DataPreview` 组件，升级为 `DataGrid`。
    *   将 `SchemaEditor` 的逻辑（类型修改、别名修改）下沉到 `DataGrid` 的列头交互中。

### Phase 2: Advanced Interaction (v1.7.5)
1.  **Inline Editing**: 实现单元格双击编辑与回写。
2.  **Inspector**: 实现右侧属性面板与统计直方图。
3.  **Master-Detail**: 实现行详情展开。

---

## 5. UI Design (Wansan Airy)

*   **Colors**: 背景 `bg-zinc-50`，Grid 背景 `bg-white`。
*   **Borders**: 极简分割线 `border-zinc-100`。
*   **Shadows**: 浮层面板使用 `shadow-xl` + `ring-1 ring-black/5`。
*   **Typography**: 表格内容使用等宽字体 (Geist Mono / JetBrains Mono) 变体，确保数字对齐。

---

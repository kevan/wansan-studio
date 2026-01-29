# 🧭 SPEC: Data Explorer & Dual-Mode Workbench

> **Version**: 1.1 (Implemented)
> **Status**: **Phase 1 Complete** (v1.7)
> **Theme**: "Immersive Data Wrangling"

---

## 1. 核心理念 (Philosophy)

### 1.1 Context Separation (上下文分离)
为了解决 Analysis (分析) 与 Wrangling (治理) 在单一界面下的空间冲突与心智负担，我们将应用划分为两个顶级模式：
*   **💬 Analysis Mode**: 侧重对话、报表生成与消费。数据仅作为引用。
*   **🗄️ Data Mode**: 侧重数据资产的管理、清洗、结构定义与预览。提供沉浸式 IDE 体验。

### 1.2 Data Explorer (数据探索器)
Data Mode 的核心载体。它不是简单的表格预览，而是一个**轻量级的 Data IDE**，采用全屏 Tab 结构。

---

## 2. 交互架构 (Interaction Architecture)

### 2.1 Mode Switcher (模式切换)
*   **位置**: Sidebar 顶部 (Header Area)。
*   **样式**: Segmented Control (分段控制器)。
*   **状态**:
    1.  `Analysis`: Sidebar 显示 `SessionList`。Main 显示 `AnalysisWorkspace` (Chat + Dashboard)。
    2.  `Data`: Sidebar 显示 `DataTree`。Main 显示 `DataWorkspace` (Tabs)。

### 2.2 Data Workspace (数据工作台)
Data Mode 下的主界面布局，采用 **Global Toolbar + Flat Tabs** 结构，最大化垂直空间。

```text
[ Sidebar (260px) ]  |  [ Main Stage (Flex) ]           
---------------------|----------------------------------
Data Tree            |  Header: [Icon] Table Name | Row Count
- Project            |  Toolbar: [AI Semantics] [Append] [Merge] [Replace] [Delete]
  - Tables           |----------------------------------
  - Views            |  [ Tabs Navigation ]
  - Files            |  - Columns (Default)
                     |  - Preview
                     |  - Metrics
                     |  - Relations
                     |----------------------------------
                     |  [ Tab Content Area (Full Height) ]
```

---

## 3. 功能模块 (Tab Modules)

### 3.1 Columns (字段管理) [P0 Implemented]
*   **View**: 字段列表视图 (`columns-view.tsx`)。
*   **Features**:
    *   查看字段类型、主键状态。
    *   修改字段语义（别名、描述）。
    *   **AI Column Extractor**: 通过 AI 从非结构化文本提取新字段。
    *   设置可见性（Hide from AI）。

### 3.2 Preview (数据预览) [P0 Implemented]
*   **View**: 全屏数据网格 (`DataPreviewPanel`).
*   **Features**:
    *   只读展示前 100 行数据。
    *   支持 SQL 查询预览。

### 3.3 Metrics (智能指标) [P0 Implemented]
*   **View**: 指标列表 (`metrics-view.tsx`)。
*   **Features**: 定义基于 SQL 的派生指标（如 `profit = sales - cost`），供 AI 分析使用。

### 3.4 Relations (关联关系) [P0 Implemented]
*   **View**: 关系拓扑列表 (`relations-view.tsx`)。
*   **Features**: 定义表与表之间的 Join 逻辑。

---

## 4. 迁移策略 (Migration Strategy)

### Phase 1: Structural Refactor (v1.7) ✅ Done
1.  **Sidebar**: 实现 `ModeSwitcher`，拆分 `SessionList` 和 `DataTree`。
2.  **Navigation**: 实现全局状态 `appMode` ('analysis' | 'data')。
3.  **Components**:
    *   创建 `AnalysisWorkspace` 接管 Chat/Dashboard 布局。
    *   创建 `DataWorkspace` 接管数据治理。
    *   **Deprecation**: 彻底移除旧版 `SchemaEditor` (上下分屏布局)，迁移至扁平 Tab 结构。

### Phase 2: Advanced Interaction (v1.7.5) ⏳ Planned
1.  **Inline Editing**: 实现单元格双击编辑与回写 (DuckDB Update)。
2.  **Inspector Panel**: 选中列时，右侧滑出属性面板（统计直方图、空值率）。
3.  **Master-Detail**: 实现行详情展开。

---

## 5. UI Design (Wansan Airy)

*   **Header**: 极简设计，去除了冗余的边框，使用 `backdrop-blur` 增加层次感。
*   **Spacing**: 紧凑的 Sidebar Header (`pt-2`)，最大化内容区域。
*   **Typography**: Tab 标签采用图标+文字组合，清晰直观。
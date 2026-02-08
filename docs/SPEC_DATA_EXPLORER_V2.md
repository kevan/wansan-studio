# 🧭 SPEC: Data Explorer V2 (Interactive Grid & Views)

> **Version**: 2.0 (Draft)
> **Status**: Planning
> **Theme**: "Fluidity & Focus"
> **Dependencies**: `docs/SPEC_DATA_EXPLORER.md` (V1)

---

## 1. 核心目标 (Objectives)

本阶段 (v1.7.5) 旨在突破 V1 "静态预览" 的限制，将 Data Explorer 升级为高性能、可交互的数据治理工作台。

### 1.1 优先级 (Priorities)
1.  **🚀 Virtual Grid (P0)**: 引入虚拟滚动，支持百万级行数据的丝滑浏览，移除传统分页。
2.  **🔍 Master-Detail (P0)**: 提供单行数据的详情视图，解决宽表查看难题。
3.  **🌪️ Visual Filter & Views (P1)**: 强化基于 UI 的筛选器构建，并支持保存“视图定义”（字段配置+过滤条件）。

### 1.2 核心原则
*   **System Identity**: 所有行操作严格依赖系统生成的 `_ws_row_id`，不依赖用户定义的主键。
*   **Fluidity**: 数据加载应当是流式的（Infinite Scroll），避免分页割裂感。

---

## 2. Feature: High-Performance Virtual Grid

### 2.1 Architecture
*   **Library**: `@tanstack/react-virtual` (Virtualization) + `@tanstack/react-query` (Infinite Loading).
*   **Data Source**: DuckDB Pagination (`LIMIT x OFFSET y`) hidden behind an infinite scroll hook.
*   **Render Strategy**:
    *   仅渲染视口可见区域 (`overscan: 5`).
    *   固定表头，列宽可拖拽调整 (`resizable`).

### 2.2 Interaction Design
*   **Scroll**: 纵向无限滚动。
*   **Selection**: 点击行进行高亮（单选/多选），触发 Toolbar 上下文操作。
*   **Columns**:
    *   支持列宽调整 (Resizing).
    *   支持列拖拽排序 (Reordering).
    *   支持列固定 (Pinning, e.g., ID column).

### 2.3 System Identity (`_ws_row_id`)
*   在 V1.7 中，我们在 Ingestion 阶段已为所有表注入 `_ws_row_id` (UINT64)。
*   Grid 必须始终请求 `_ws_row_id`，但在 UI 上默认隐藏（除非 Debug 模式开启）。
*   所有“选中行”、“获取详情”操作均通过 `_ws_row_id` 寻址。

---

## 3. Feature: Master-Detail View

### 3.1 Trigger
*   **Action**: 双击行 (Double Click) 或 选中行后点击空格/工具栏 "View Details"。
*   **UI Pattern**: **Side Sheet (右侧抽屉)**。相比 Modal，抽屉允许用户在查看详情的同时保持对 Grid 上下文的感知。

### 3.2 Detail Panel UI
*   **Header**: 显示记录摘要（如第一列非空值）及导航按钮 (< Prev | Next >)。
*   **Content**: 
    *   **Form Layout**: 垂直排列所有字段 (`Label: Value`)。
    *   **Groups**: 根据字段类型分组 (Text, Numeric, Date, JSON)。
    *   **Long Text**: 对长文本字段提供自动折叠/展开，或 Markdown 渲染支持。
    *   **JSON Viewer**: 对 JSON/Struct 类型字段提供树状展示。

### 3.3 Navigation
*   支持在 Detail Panel 中直接切换至上一条/下一条记录（基于 Grid 当前的排序顺序）。

---

## 4. Feature: Visual Filtering & View Definitions

### 4.1 Visual Filter Builder (可视化筛选器)
*   **Location**: Grid 顶部工具栏下方。
*   **UI**: 类似 Smart Filter 的 Tag 交互。
    *   `[ + Add Filter ]`
    *   Rules: `Column` + `Operator` (contains, equals, >, <, is null) + `Value`.
*   **Smart Type**: 根据列类型自动适配 Operator（如 Date 列显示 DatePicker 范围选择）。
*   **Backend**: 实时转换为 SQL `WHERE` 子句并在 DuckDB 执行。

### 4.2 Saved Views (列表视图定义)
*   **Concept**: 将当前的“浏览状态”保存为持久化配置。
*   **State Includes**:
    1.  **Columns**: 可见性 (Hidden/Visible)、顺序 (Order)、宽度 (Width)、固定状态 (Pinned)。
    2.  **Filters**: 当前生效的过滤条件集合。
    3.  **Sort**: 排序规则。
*   **Persistence**: 
    *   存储于 `wansan.json` 的 `table_views` 节点下。
    *   Key: `view_id` (UUID).
*   **UI**: 
    *   Header 区域显示当前视图名称（默认 "All Data"）。
    *   点击可切换至其他 Saved Views（如 "High Value Users", "Recent Errors"）。
    *   支持 "Save Current View As..."。

---

## 5. Implementation Plan

### Phase 2.1: Virtual Core
1.  **Backend**: 确认 `ipc.runSQL` 支持高效的分页 offset 查询。
2.  **Frontend**: 引入 `@tanstack/react-virtual`，重构 `DataTable` 移除 `Pagination` 组件。
3.  **State**: 使用 `useInfiniteQuery` 对接数据流。

### Phase 2.2: Detail & Identity
1.  **Detail Panel**: 实现 `RowDetailSheet` 组件。
2.  **Linkage**: 实现 Grid 双击事件 -> 打开 Sheet 并传递 `rowId`。

### Phase 2.3: Filter & Views
1.  **Filter Engine**: 提取 `SmartFilterModal` 的逻辑封装为 `FilterBar` 组件。
2.  **View Store**: 在 `useProjectStore` 或 `useFileStore` 中增加 `views` 状态管理。

---

## 6. Technical Risks
*   **Memory**: 虚拟滚动在大量 DOM 节点下的内存表现。需确保 `react-virtual` 的 `measure` 逻辑正确。
*   **Scroll Sync**: 在不同分辨率下列宽自适应与横向滚动的冲突。

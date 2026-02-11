# 🧭 SPEC: Data Explorer & Unified Data IDE

> **Version**: 4.1 (Implemented)
> **Status**: **Complete** (v1.7.5+)
> **Theme**: "The Grid is the Canvas, The Sidebar is the Pallette"
> **Reference**: DataGrip-Inspired Read/Write Separation

---

## 1. 核心交互架构 (Core Architecture)

### 1.1 读写分离模式 (Read/Write Separation)
为了降低交互复杂度并提供专业级的数据治理体验，我们将 Data Explorer 划分为两个顶级视图：

*   **📊 Data Viewer (浏览模式)**: 专注于数据的 **SELECT**、搜索与探索。
*   **🏗️ Structure Editor (建模模式)**: 专注于数据的 **DDL**、增强与语义定义。

### 1.2 数据增强理念 (Augmentation First)
Wansan 坚持“不改动用户原始数据”的原则。所有的修改（别名、指标、关联）均作为**增强层 (Augmentation Layer)** 存在：
*   **物理层**: 原始文件 + 伴生表 (`_ext_ai`)。
*   **逻辑层**: 通过 DuckDB `v_{tableName}` 视图实时合成。

---

## 2. 功能模块详情

### 2.1 Data Viewer (数据浏览器)
该视图是用户日常探索数据的主战场。

*   **🚀 高性能虚拟滚动**: 基于 `@tanstack/react-virtual` 实现百万级行数据的零延迟浏览。
*   **⛓️ 零延迟表头滑动**: 采用浏览器原生 CSS `sticky` 表头方案，彻底消除 JS 同步导致的橡皮筋延迟。
*   **🌪️ 高级过滤器 (FilterManager)**:
    *   支持 **AND / OR** 顶级逻辑切换。
    *   **类型感知控件**: 自动适配日期选择器、布尔开关、数值区间输入等。
    *   **草稿模式**: 更改实时反馈至草稿，点击“应用”时统一刷新数据。
*   **🔍 主从详情视图 (Master-Detail)**: 双击行弹出右侧抽屉 (`RowDetailSheet`)，垂直展示单条记录的所有字段及语义描述。

### 2.2 Structure Editor (模型编辑器)
该视图用于定义数据的业务含义和逻辑增强。

*   **Fields (字段定义)**: 管理物理列的别名、业务类型（货币、城市、ID）和可见性。
*   **Metrics (计算指标)**: 定义基于 SQL 的派生指标（如 `profit = revenue - cost`）。
*   **Relations (关联关系)**: 配置表与表之间的 Join 逻辑。

### 2.3 侧边字段列表 (FieldListSidebar)
网格右侧的常驻/可折叠面板，负责网格的个性化呈现：
*   **列显隐**: 批量控制字段的可见性。
*   **列排序**: 通过 `@dnd-kit` 实现拖拽排序，排序状态可持久化保存。

---

## 3. 语义层系统 (Semantic Layer)

### 3.1 深度语义感知 (End-to-End Aliases)
系统在所有 UI 环节优先展示 **语义别名 (Alias)**，回退至原始列名。
*   **展示格式**: 统一采用 `别名 (原始列名)`，如 `销售金额 (sales_amt)`。
*   **覆盖范围**: 网格头、过滤器、详情页、侧边资源树、字段列表。

### 3.2 语义恢复与继承
*   **Raw Columns**: 逻辑视图重建后，系统自动从元数据中找回并挂载别名。
*   **Joined Columns**: 关联字段自动继承目标表的别名定义（如关联客户表后，`customer_id__name` 自动显示为 `客户姓名`）。

---

## 4. 视图管理与持久化 (Saved Views)

用户可以将当前的“浏览偏好”保存为 **Saved Views (列表视图)**。
*   **存储内容**: 包含过滤条件（FilterState）、排序规则（Sorting）、列显隐状态（Visibility）以及列顺序（Order）。
*   **存储位置**: `wansan.json` 项目配置文件。

---

## 5. UI 设计规范 (Wansan Airy)

*   **视觉层级**: 使用 Solid White 背景和 2.5rem 大圆角，去除冗余边框。
*   **色彩感知**:
    *   🔵 **原始字段**: 蓝色/中性色图标。
    *   🟣 **AI 增强**: 紫色图标 + 紫色底纹。
    *   🟢 **计算指标**: 绿色图标 + 绿色底纹。
    *   🟠 **关联维度**: 橙色图标 + 橙色底纹。
*   **交互动效**: 所有的面板展开、过滤项添加均带有流畅的平滑过渡动画。

---

## 6. 技术实现索引 (Technical Reference)

作为后续开发与维护的核心参考，以下是 Data Explorer 的关键实现细节。

### 6.1 核心文件路径 (Core File Map)
*   **入口容器**: `src/renderer/components/data-workspace/index.tsx` (管理 Data/Structure 状态)
*   **虚拟网格**: `src/renderer/components/data-workspace/virtual-data-grid.tsx` (核心渲染引擎)
*   **过滤器**: `src/renderer/components/data-workspace/filter-manager.tsx` (逻辑浮层)
*   **字段列表**: `src/renderer/components/data-workspace/field-list-sidebar.tsx` (拖拽排序与显隐)
*   **详情视图**: `src/renderer/components/data-workspace/row-detail-sheet.tsx` (侧边抽屉)
*   **逻辑引擎**: `src/renderer/lib/duckdb-view-manager.ts` (负责 `v_` 视图构建与语义找回)

### 6.2 关键数据结构 (Data Structures)

#### FilterState (过滤器状态)
```typescript
// src/shared/types/filter.ts
export interface FilterState {
  conjunction: 'AND' | 'OR';
  conditions: FilterCondition[];
}
```

#### TableView (视图持久化)
```typescript
// src/shared/types/project.ts
export interface TableView {
  id: string;
  name: string;
  filters: FilterState;
  columnConfig: {
    hidden?: string[];
    order?: string[];
  };
  sort?: { id: string; desc: boolean }[];
}
```

### 6.3 核心命名约定 (Naming Conventions)
*   **逻辑视图**: 统一带 `v_` 前缀（如 `v_t_orders`）。UI 展现应始终优先请求此视图。
*   **伴生表**: 统一带 `_ext_ai` 后缀（如 `t_orders_ext_ai`），通过 `_ws_row_id` 与主表关联。
*   **关联列**: 采用 `外键__目标列` 格式（如 `product_id__price`），用于语义溯源。
*   **行标识**: 强制依赖 `_ws_row_id` (BIGINT) 进行精准定位。

### 6.4 核心逻辑模式 (Core Logic Patterns)

#### 语义溯源 (Semantic Recovery)
在 `rebuildView` 过程中，系统通过以下路径找回别名：
1.  **Raw**: 通过 `colName` 直接匹配 `file.columns`。
2.  **Joined**: 解析 `A__B` -> 在 `Relations` 中找到目标表 -> 在目标表 `columns` 中找到字段 `B` 的语义。

#### 零延迟滚动 (Zero-Lag Sync)
放弃 JS `onScroll` 同步，采用 **Sticky Header Pattern**:
```html
<ScrollContainer>
  <div class="min-w-max">
    <StickyHeader class="sticky top-0 z-20" />
    <VirtualList />
  </div>
</ScrollContainer>
```

#### 草稿提交机制 (Draft & Commit)
`FilterManager` 内部维护 `draftState`，仅在点击“应用”或特定的提交动作时调用父组件的 `onChange`，以平衡实时性与渲染性能。

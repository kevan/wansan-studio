# 🧭 SPEC: Data Explorer V3 (Grid-Centric)

> **Version**: 3.0 (Draft)
> **Status**: Planning
> **Theme**: "The Grid is the IDE"
> **Dependencies**: `docs/SPEC_DATA_EXPLORER_V2.md`

---

## 1. 核心理念 (Philosophy)

### 1.1 从 Tabs 到 Layers (From Tabs to Layers)
V2 中的 "Preview", "Columns", "Metrics", "Relations" 割裂为独立的 Tabs，导致用户必须在“定义”与“查看”之间反复横跳。
V3 将 **VirtualDataGrid** 提升为唯一且永驻的 **Base Layer (底座)**。所有的元数据管理（字段、指标、关联）转变为覆盖在底座之上的 **Floating Panels (悬浮面板)** 或 **Context Actions (上下文操作)**。

### 1.2 "Augmentation First" (增强优先)
界面必须直观地区分 **Raw Data (原始数据)** 与 **Augmented Data (增强数据)**。
*   **Raw**: 只读，灰色背景，操作限于“重命名别名”或“隐藏”。
*   **Augmented**: 可编辑逻辑，高亮背景 (Green/Purple/Orange)，是用户创造价值的地方。

---

## 2. 交互架构 (Interaction Architecture)

### 2.1 全局布局 (Global Layout)

```text
[ Header: Breadcrumbs | View Switcher | Global Actions (Reload/Settings) ]
-------------------------------------------------------------------------
[ Filter Bar (Sticky): Filter Chips | + Add Filter | Search ]
-------------------------------------------------------------------------
[                                                                       ]
[  VirtualDataGrid (Main Canvas)                                        ]
[  - Raw Columns (Locked)                                               ]
[  - Metric Columns (Green)                                             ]
[  - AI Columns (Purple)                                                ]
[  - Joined Columns (Orange)                                            ]
[  - [ + ] Ghost Column (Add Enhancement)                               ]
[                                                                       ]
-------------------------------------------------------------------------
[ Bottom Dock (Collapsible 300px): Logic Center                         ]
[  [ Metrics ] [ Relations ] [ AI Tasks ] [ Lineage ]                   ]
[  (Editor for the currently selected enhancement)                      ]
```

### 2.2 操作流 (Workflows)

#### A. 字段管理 (Field Management)
*   **Old**: 切换到 "Columns" Tab 列表操作。
*   **New**: 
    *   **Sidebar**: 右侧滑出 `ColumnManager` 面板（类似 Excel 的 Field List），支持批量勾选显隐、拖拽排序。
    *   **In-Grid**: 直接拖拽表头排序，右键表头重命名/隐藏。

#### B. 创建指标 (Creating Metrics)
*   **Old**: 切换到 "Metrics" Tab -> Add Button -> Modal Form.
*   **New**: 
    *   点击 Grid 最右侧 `[ + ]` -> 选择 `Calculated Field`。
    *   或者：选中两列 (Sales, Cost) -> 右键 -> `Create Metric from Selection` (自动填入 Sales - Cost)。
    *   底部面板自动展开，显示公式编辑器。Grid 实时预览计算结果列。

#### C. 建立关联 (Joining Tables)
*   **Old**: 切换到 "Relations" Tab -> Visual Graph editor.
*   **New**: 
    *   点击 `[ + ]` -> `Lookup from Table...`。
    *   选择目标表 -> 选择 Key -> 选择要引入的列。
    *   Grid 立即追加橙色的 Join 列。

---

## 3. UI 组件规划 (Component Plan)

### 3.1 `DataWorkspaceLayout`
*   移除 `Tabs` 结构。
*   引入 `react-resizable-panels` 实现垂直分割（Grid vs Bottom Dock）。

### 3.2 `LogicDock` (Bottom Panel)
*   承载所有复杂编辑逻辑。
*   **Context Aware**: 点击 Grid 中的绿色列，Dock 自动切换到该指标的公式编辑态。

### 3.3 `GhostColumn`
*   网格末尾的虚拟列，作为添加增强功能的统一入口。

---

## 4. 迁移路径 (Migration Path)

### Phase 1: Structural Shift (Layout)
1.  修改 `DataWorkspace/index.tsx`，移除 Tabs，固定 `DataPreviewPanel`。
2.  引入 `BottomDock` 组件，暂时将原有的 `MetricsView` 和 `RelationsView` 内容搬进去。

### Phase 2: In-Grid Creation (Interaction)
1.  实现 `GhostColumn`。
2.  实现“点击列 -> 激活 BottomDock 对应条目”的联动逻辑。

### Phase 3: Field List (Refinement)
1.  废弃原有的 `ColumnsView`。
2.  实现侧边栏 `ColumnManager`。

---

## 5. 风险控制
*   **性能**: Grid 渲染复杂性增加（不同类型的列渲染器）。依赖 `VirtualDataGrid` 已有的优化。
*   **屏幕空间**: 在小屏幕上 BottomDock 可能挤压 Grid。需支持最小化 Dock。

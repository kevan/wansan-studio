# 🧭 SPEC: Data Explorer V4 (DataGrip Inspired)

> **Version**: 4.0 (Draft)
> **Status**: Planning
> **Theme**: "Read/Write Separation & Focused Context"
> **Reference**: Inspired by JetBrains DataGrip

---

## 1. 核心交互模式 (Interaction Model)

我们将 Data Explorer 的职责划分为两个核心视图，用户通过 Tab 进行切换：

### 1.1 Data Viewer (数据浏览)
*   **定位**: 专注 **SELECT** 与 **探索**。
*   **组件**: `VirtualDataGrid`。
*   **功能**:
    *   高性能虚拟滚动浏览。
    *   可视化筛选器 (Filter Bar) 与 排序。
    *   保存视图 (View Switcher)。
    *   列显隐控制 (Column Picker)。
    *   双击行 -> 查看详情 (Row Detail Sheet)。
*   **交互约束**: 禁止直接在此视图修改列定义、公式或关联。

### 1.2 Structure Editor (结构/模型编辑器)
*   **定位**: 专注 **DDL** 与 **增强 (Augmentation)**。
*   **组件**: `StructureEditor` (由 Columns, Metrics, Relations 聚合)。
*   **功能**:
    *   **Fields**: 修改字段别名、数据类型、语义描述、隐藏/显示（物理层级）。
    *   **Metrics**: 创建与编辑基于 SQL 的计算指标。
    *   **Relations**: 管理表与表之间的 Join 逻辑。
*   **交互约束**: 不展示完整数据行，仅展示结构定义与采样预览。

---

## 2. 界面布局重构 (Layout Refactor)

### 2.1 主界面 (DataWorkspace)
采用 **Tabs + Focused Toolbar** 结构：

```text
[ Sidebar ] | [ Header: Table Name | Breadcrumbs | Global Actions ]
            |-------------------------------------------------------
            | [ Tabs: 📊 Data | 🏗️ Structure ]
            |-------------------------------------------------------
            | [ View Content Area (Full Height) ]
```

### 2.2 视图细化

#### A. Data 视图
*   移除 V3 中的 `Ghost Column [+]`。
*   移除 V3 中的 `FieldListSidebar` (回归 DataGrip 简洁风)。
*   Filter Bar 依然保留在 Grid 顶部。

#### B. Structure 视图
采用“列表 + 详情”布局：
*   **左侧列表**: 分组显示 `Columns`, `Metrics`, `Relations`。
*   **右侧详情**: 点击列表项后，右侧显示对应编辑表单（如 SQL 编辑器、语义表单）。

---

## 3. 操作流 (Workflows)

*   **常规流**: 在 Sidebar 双击表 -> 默认进入 **Data 视图**。
*   **建模流**: 在 Sidebar 右键表 -> "Modify Table Structure" -> 进入 **Structure 视图**。
*   **快速跳转**: 在 Data 视图右键列头 -> "View Definition" -> 自动切换到 Structure 视图并选中该列。

---

## 4. 实现步骤 (Implementation Path)

### Phase 1: Dual-View Layout (P0)
1.  重构 `DataWorkspace/index.tsx`，实现 `Data` 与 `Structure` 的顶级 Tabs。
2.  创建 `StructureEditor` 容器，整合现有的管理组件。

### Phase 2: Grid Cleaning (P0)
1.  从 `VirtualDataGrid` 中移除 `Ghost Column` 和相关的 Bottom Dock 联动逻辑。
2.  简化列头上下文菜单，保留“排序”、“隐藏”和“跳转到定义”。

### Phase 3: Unified Modeling (P1)
1.  精塑 `StructureEditor` 的交互，确保在同一个界面下能处理所有“增强”任务。

---

## 5. 核心原则：数据增强 (Augmentation)
所有的“修改”操作（改别名、加指标）均不触动原始文件。
*   **Structure Editor** 负责定义这些增强规则。
*   **Data Viewer** 通过 `v_{tableName}` 自动应用这些规则并展示最终增强效果。

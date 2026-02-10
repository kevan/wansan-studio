# 🧭 SPEC: Data Explorer Filter Refactor (V4.1)

> **Theme**: "Logic Over Chaos"
> **Status**: Planning

---

## 1. 核心模型 (Core Model)

### 1.1 数据结构 (`FilterRule` Refactor)
目前的 `FilterRule` 是扁平的。为了支持复杂逻辑，我们需要引入 `FilterGroup` 的概念，但为保持轻量，V4.1 先实现**顶级逻辑组 (Root Group)**，即所有条件共享一个逻辑连接符 (AND/OR)。

```typescript
export type LogicalOperator = 'AND' | 'OR'

export type FilterOperator =
  // Common
  | 'equals' | 'not_equals' | 'is_null' | 'is_not_null'
  // Text
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  // Numeric/Date
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  // List/Enum (New)
  | 'in' | 'not_in'

export interface FilterCondition {
  id: string
  columnName: string
  columnType: string // 'VARCHAR' | 'INTEGER' | ...
  sourceType: 'raw' | 'ai' | 'metric' | 'joined' // [NEW] 支持关联字段
  operator: FilterOperator
  value: any // string, number, [min, max], string[]
}

export interface FilterState {
  conjunction: LogicalOperator
  conditions: FilterCondition[]
}
```

### 1.2 类型感知操作符 (Type-Aware Operators)
不同数据类型在 UI 上展示的操作符集合不同：

| 类型 | 可用操作符 | 对应控件 |
| :--- | :--- | :--- |
| **TEXT / VARCHAR** | contains, equals, starts_with, in, is_null... | Text Input, Multi-select |
| **NUMBER (INT/DOUBLE)** | =, !=, >, <, between, is_null... | Number Input, Range Slider |
| **DATE / TIME** | =, >, <, between, is_null... | Date Picker, Date Range Picker |
| **BOOLEAN** | equals | True/False Toggle |

### 1.3 关联字段支持
关联字段 (`joined`) 在模型层与普通字段一致，但在 UI 上需要特殊处理：
*   **标识**: 使用橙色 Link 图标。
*   **语义**: 必须使用关联后的**别名**显示 (e.g. `客户表.姓名`)。

---

## 2. 交互设计 (Interaction)

### 2.1 入口 (Filter Trigger)
*   位置：Grid 顶部工具栏。
*   样式：
    *   **空状态**: 简洁的 `Filter` 图标按钮。
    *   **有状态**: 显示 `[Filter Icon] 3 conditions (AND)` 的胶囊按钮，点击展开管理器。

### 2.2 过滤器管理器 (Filter Manager Popover)
点击入口后弹出的面板（360px 宽）：

```text
[ Header: Filter Data ]
[ Logic Toggle: Match [ All (AND) | Any (OR) ] conditions ]
-----------------------------------------------------------
[ List Item 1 ]
  [ Column Select (Icon + Name) ] [ Operator Select ] [ Value Input ] [X]
[ List Item 2 ]
  ...
-----------------------------------------------------------
[ + Add Condition ]
```

### 2.3 列选择器优化 (Column Selector)
在添加条件时，列选择下拉框必须：
1.  **分组显示**: Raw / AI / Metrics / Joined。
2.  **搜索**: 支持搜索别名和物理名。
3.  **类型图标**: 直观展示列类型。

---

## 3. 实现步骤

1.  **Type Refactor**: 更新 `src/shared/types/filter.ts`，定义新的 `FilterState` 和 `FilterCondition`，以及操作符映射表。
2.  **Filter Manager**: 创建 `src/renderer/components/data-workspace/filter-manager.tsx`，实现上述浮层逻辑。
3.  **SQL Generation**: 升级 `filterRuleToSQL` 以支持 `conjunction` 和新的操作符 (`between`, `in`)。
4.  **Integration**: 替换 `VirtualDataGrid` 中的旧版 `FilterBar`。

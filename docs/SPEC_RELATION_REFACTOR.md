# SPEC: Relation Data Structure Refactor (v1.3)

## 1. 背景与目标
目前 `Relation`（表关联）存储在全局的 `ProjectData.relations` 数组中。为了与 `SmartMetric`（智能指标）保持一致的架构设计，我们需要将关联逻辑下沉到具体的表节点（`FileNode`）中。

**主要目标：**
- **一致性**：使关联逻辑与指标逻辑在存储和交互上完全对称。
- **解耦**：每个表节点管理它作为“源表”发起的关联。
- **语义层对齐**：在 `SemanticLayer` 中使用以 `fileId` 为 Key 的结构存储。

---

## 2. 数据结构变化

### 2.1 新的 `TableRelation` 接口
我们将原有的 `Relation` 接口重命名或转换为 `TableRelation`，移除对源表的显式引用（因为它是存储在源表内部的）。

```typescript
// src/shared/types.ts

export interface TableRelation {
  id: string;          // UUID
  targetFileId: string; // 目标表 ID
  sourceColumn: string; // 源表关联字段名
  targetColumn: string; // 目标表关联字段名
  joinType?: 'LEFT' | 'INNER' | 'FULL'; // 默认 LEFT
  autoDetected?: boolean;
}
```

### 2.2 更新 `FileNode`
在 `FileNode` 中添加 `relations` 数组。

```typescript
// src/shared/types.ts

export interface FileNode {
  // ... 其他字段
  smartMetrics?: SmartMetric[];
  relations?: TableRelation[]; // 新增：该表发起的关联
}
```

### 2.3 更新 `SemanticLayer` (持久化层)
更新项目包（Project Bundle）中的语义层定义。

```typescript
// src/shared/types/project-manifest.ts

export interface SemanticLayer {
  // 旧：relations: any[]; 
  relations: Record<string, TableRelation[]>; // 新：Key 为 sourceFileId
  smartMetrics: Record<string, SmartMetric[]>;
}
```

### 2.4 更新 `ProjectData` (运行时层)
从全局状态中移除 `relations` 数组。

```typescript
// src/shared/types/project.ts

export interface ProjectData {
  // ...
  files: FileNode[];
  // relations: Relation[]; // 移除
  // ...
}
```

---

## 3. 迁移逻辑 (`useMigrationStore`)

在 `performMigration` 过程中，需要将 v1.2 的扁平数组转换为 v1.3 的分组结构。

**逻辑流程：**
1. 读取 `legacyState.relations` (Array)。
2. 初始化一个空的映射对象 `newRelationsMap: Record<string, TableRelation[]>`。
3. 遍历旧关联数组：
   - 取出 `{ id, fileAId, columnA, fileBId, columnB }`。
   - 构造新对象：`{ id, targetFileId: fileBId, sourceColumn: columnA, targetColumn: columnB }`。
   - 将其 push 到 `newRelationsMap[fileAId]` 中。
4. 将 `newRelationsMap` 写入 `SemanticLayer.relations`。
5. 将关联信息同步更新到 `files` 数组中对应的 `FileNode.relations`。

---

## 4. Store Action 重构 (`useProjectStore`)

### 4.1 `addRelation`
不再向全局数组 push，而是修改对应 `FileNode` 的 `relations`。

```typescript
addRelation: (relation: Omit<TableRelation, 'id'> & { sourceFileId: string }) => {
  const { sourceFileId, ...data } = relation;
  const id = generateId();
  set(state => ({
    files: state.files.map(f => 
      f.id === sourceFileId 
        ? { ...f, relations: [...(f.relations || []), { ...data, id }] }
        : f
    )
  }));
  // 触发视图重建...
}
```

### 4.2 `removeRelation`
遍历所有文件，找到并删除指定 ID 的关联。

```typescript
removeRelation: (id: string) => {
  set(state => ({
    files: state.files.map(f => ({
      ...f,
      relations: (f.relations || []).filter(r => r.id !== id)
    }))
  }));
}
```

---

## 5. UI 适配 (SchemaEditor 集成)

**目标**：将关联管理从全局视图移入 `SchemaEditor`，使其与 `SmartMetric` 的交互模式一致。

### 5.1 SchemaEditor 布局更新
在 `SchemaEditor` 的表格中增加 "Relationships" 部分（位于 Smart Metrics 和 Physical Columns 之间）。

- **Section Header**: "RELATIONSHIPS" (with Icon)
- **List Items**: 展示当前表作为**源表**的所有关联。
  - 显示内容：Target Table Name, Join Key (Source -> Target), Join Type (Badge).
  - 操作：Edit (Modal), Delete.
- **Add Action**: 在 Header Actions 中添加 "Add Relation" 按钮（或在 Section Header 旁）。

### 5.2 新增 `RelationEditorModal`
创建一个模态框用于添加/编辑关联，替代原有的 `RelationshipManager`。

- **Inputs**:
  - Target Table (Select from other files)
  - Join Type (Select: Left, Inner, Full)
  - Join Keys (Source Column = Target Column)
- **Validation**: 确保字段类型兼容。

### 5.3 移除旧组件
- 废弃或移除 `src/renderer/components/data/relationship-manager.tsx`（如果不再需要全局视图）。
- `DataAssetsView` 仅保留文件导入和列表功能。

---

## 6. 实施步骤

1. **Step 1: Type Definitions**: 修改 `src/shared/types.ts` 和 `src/shared/types/project-manifest.ts`。
2. **Step 2: Migration Logic**: 更新 `src/renderer/services/migration-service.ts` 实现数据转换。
3. **Step 3: Store Logic**: 更新 `src/renderer/stores/useProjectStore.ts` (Remove global relations, add per-file actions).
4. **Step 4: UI Components**: 
   - 创建 `src/renderer/components/modals/relation-editor-modal.tsx`.
   - 更新 `src/renderer/components/SchemaEditor.tsx` 集成关联管理。
5. **Step 5: Cleanup**: 移除旧的 `RelationshipManager` 及相关引用。

---

## 7. 实施总结与关键决策 (Implementation Summary)

### 7.1 迁移逻辑的挑战与解决方案
在实施 v1.2 到 v1.3 的迁移时，遇到了 Zustand Store 自动水合（Hydration）导致的数据丢失问题。
- **问题**：v1.3 的 `ProjectData` 类型移除了 `relations` 字段。当应用启动时，Zustand 自动从 LocalStorage 读取旧数据，但根据新类型定义丢弃了 `relations` 字段，随后立即触发持久化，导致磁盘上的旧数据被“擦除”。
- **解决方案**：引入了 **隔离迁移策略**。
  1. `DevConsole` 将模拟的旧数据写入一个独立的 Key：`wansan-project-v2-legacy-mock`。
  2. `migration-service` 优先读取该 Mock Key，从而绕过了主 Store 的水合逻辑，确保能读取到完整的原始数据。
  3. 迁移完成后，自动清理 Mock Key。

### 7.2 Store 整合 (`useFileStore` Removed)
借此重构机会，彻底废弃并删除了 `useFileStore`。
- **背景**：`useFileStore` 原本是 `useProjectStore` 的别名/代理，导致了代码库中存在两套 Store 调用方式。
- **结果**：所有组件和 Hooks 现已统一使用 `useProjectStore`，消除了潜在的类型不一致和维护负担。

### 7.3 UI 交互的最终形态
关联管理已完全从全局视图下沉到 `SchemaEditor`：
- **位置**：在 `SchemaEditor` 的表格中，新增了 "Relationships" 区块，位于 "Smart Metrics" 和 "Physical Columns" 之间。
- **交互**：点击 "Add Relation" 或编辑现有关联时，会弹出 `RelationEditorModal`。
- **显示**：移除了 Header 区域的关联徽章（Badges），使界面更加专注于当前表结构。数据树（Data Tree）也不再显示“关联关系”根节点，仅展示数据源。


# 🔄 Task: Implement Full Data Synchronization (Focus-Check & Manual Reload)

> **Goal**: Ensure the data in DuckDB stays consistent with the user's local files.
> **Strategy**:
> 1. **Detection**: Automatically detect changes when the app window gains focus.
> 2. **Action**: Allow users to manually "Reload" the data to update DuckDB.

---

## 1. Data Model Updates (`src/shared/types.ts`)

We need to track the file's modification time and its sync status.

```typescript
export type SyncStatus = 'synced' | 'out-of-sync' | 'missing' | 'error';

// Extend the FileNode interface
export interface FileNode {
  id: string;
  name: string;
  path: string;           // Absolute path
  lastModified: number;   // Timestamp (ms) when imported
  status: SyncStatus;     // UI indicator state
  
  // ... existing fields (columns, etc.)
}
```

---

## 2. Main Process Logic (`src/main/engine/file-watcher.ts`)

Implement the file checking logic and the re-ingestion logic.

**Requirement**:
1.  `checkFilesConsistency`: Takes a list of files, checks `fs.stat`, returns IDs of changed files.
2.  `reIngestFile`: Takes a file path, runs the *existing* ingestion logic (Unmerge -> CSV -> DuckDB Table), and returns the new `lastModified` timestamp.

```typescript
import fs from 'fs-extra';
import { FileNode } from '../../shared/types';
import { ingestFile } from './ingestion'; // Reuse existing logic

export async function checkFilesConsistency(files: FileNode[]): Promise<string[]> {
  const changedIds: string[] = [];
  for (const file of files) {
    try {
      const stats = await fs.stat(file.path);
      // Tolerance 100ms
      if (stats.mtimeMs > file.lastModified + 100) {
        changedIds.push(file.id);
      }
    } catch (e) {
      // File missing, handled separately or ignored
    }
  }
  return changedIds;
}

export async function reIngestFile(filePath: string): Promise<number> {
  // 1. Run the Ingestion Pipeline (same as initial upload)
  await ingestFile(filePath); 
  
  // 2. Return new timestamp
  const stats = await fs.stat(filePath);
  return stats.mtimeMs;
}
```

---

## 3. Renderer Store Updates (`src/renderer/src/store/use-project-store.ts`)

Add actions to handle status updates.

```typescript
export interface ProjectState {
  // ... existing state
  
  // Actions
  markAsStale: (ids: string[]) => void;
  updateFileTimestamp: (id: string, newTime: number) => void;
}

// Implementation
markAsStale: (ids) => set((state) => ({
  files: state.files.map(f => ids.includes(f.id) ? { ...f, status: 'out-of-sync' } : f)
})),

updateFileTimestamp: (id, newTime) => set((state) => ({
  files: state.files.map(f => f.id === id ? { ...f, status: 'synced', lastModified: newTime } : f)
})),
```

---

## 4. The "On-Focus" Hook (`src/renderer/src/hooks/use-file-sync.ts`)

This hook orchestrates the detection.

```typescript
import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/use-project-store';

export function useFileSync() {
  const files = useProjectStore(s => s.files);
  const markAsStale = useProjectStore(s => s.markAsStale);
  const lastCheckTime = useRef(0);

  useEffect(() => {
    const handleFocus = async () => {
      // Throttle: Check every 5 seconds max
      const now = Date.now();
      if (now - lastCheckTime.current < 5000) return;
      lastCheckTime.current = now;

      if (files.length === 0) return;

      const changedIds = await window.electron.checkFilesConsistency(files);
      if (changedIds.length > 0) {
        markAsStale(changedIds);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [files]); // Re-bind if file list changes
}
```

---

## 5. UI Integration (Tree Node)

**Requirement**:
In `TreeNode.tsx`:
1.  Check `node.data.status`.
2.  If `'out-of-sync'`:
    *   Show a **Yellow Dot** (or `AlertCircle` icon) next to the filename.
    *   Add a Tooltip: "File changed. Right-click to reload."
3.  **Context Menu Action**:
    *   Add `🔄 Reload Data` item.
    *   On click -> Call `window.electron.reIngestFile(file.path)` -> Then `store.updateFileTimestamp`.

---

## 6. 智能合并策略 (Smart Merge Strategy)

针对 **字段变更 (Schema Evolution)** 的处理，是数据同步中最棘手的部分。

当用户修改了源 Excel 文件（例如：改了列名、删了列、加了新列）并点击“刷新”时，如果我们只是简单地重新入库，会引发连锁反应：
1.  **用户之前配置的语义（Metadata）会丢失**（比如用户把 `Price` 标记为“金额”，刷新后变成了 `Unit Price`，标记还在吗？）。
2.  **关联关系可能断裂**（如果 Join 的 Key 字段被改名了）。
3.  **已生成的图表/SQL可能失效**。

我们需要一个 **“智能合并策略 (Smart Merge Strategy)”**。

以下是详细的处理方案。

---

### 策略核心：Diff & Patch (差异对比与修补)

我们不能简单粗暴地覆盖 Schema，而是要对比 **新旧 Schema**，尽量保留用户的配置。

#### 1. 变更场景与应对逻辑

| 场景 | 例子 | 处理逻辑 |
| :--- | :--- | :--- |
| **列名不变，数据变了** | `Amount` 还是 `Amount` | ✅ **保留配置**。直接更新数据，保留之前的语义类型（如“金额”）和关联关系。 |
| **列名修改 (Renamed)** | `Price` -> `Unit Price` | ⚠️ **视为“新列 + 删列”**。旧列配置丢失，新列重置为默认类型。*(AI 很难百分百确定是重命名，为了安全，当做新增处理)*。 |
| **新增列 (Added)** | 新增 `Discount` | 🆕 **新增配置**。类型设为 AI 猜测的默认值。 |
| **删除列 (Deleted)** | 删除了 `Notes` | 🗑️ **清理配置**。删除对应的语义配置；如果该列参与了关联，**自动断开关联**并报警。 |

---

### 🛠️ 技术实现方案

我们需要在 `reIngestFile` 完成后，在前端做一次 **Schema Reconciliation (Schema 调和)**。

#### Step 1: 后端返回新 Schema

`reIngestFile` 不仅要返回时间戳，还要返回 **新的 ColumnSchema列表**。

```typescript
// Main Process Return Type
interface ReloadResult {
  lastModified: number;
  newColumns: ColumnSchema[]; // DuckDB 重新解析出的列结构
}
```

#### Step 2: 前端 Store 的合并逻辑 (`use-project-store.ts`)

在 `updateFileSchema` 动作中，执行合并算法。

```typescript
// Pseudo-code inside the Store Action
updateFileSchema: (fileId, newColumns) => set((state) => {
  const file = state.files.find(f => f.id === fileId);
  if (!file) return state;

  const oldColumns = file.columns;
  
  // 核心合并逻辑：Map Key = Column Name
  const mergedColumns = newColumns.map(newCol => {
    // 尝试在旧列中找到同名的
    const oldCol = oldColumns.find(c => c.name === newCol.name);
    
    if (oldCol) {
      // ✅ 命中！保留用户之前的配置 (userDefinedType, alias)
      return {
        ...newCol, // 更新 type (万一 DuckDB 认为类型变了) 和 sampleValues
        userType: oldCol.userType, // 继承用户设置
        alias: oldCol.alias        // 继承别名
      };
    } else {
      // 🆕 新列！使用默认配置
      return newCol;
    }
  });

  // 🚨 检查关联关系是否断裂
  const activeRelations = state.relations.filter(r => {
    // 如果关联涉及了这个文件，检查列是否还存在
    if (r.sourceFileId === fileId) {
      return mergedColumns.some(c => c.name === r.sourceColId); // 假设 colId 就是 name
    }
    if (r.targetFileId === fileId) {
      return mergedColumns.some(c => c.name === r.targetColId);
    }
    return true; // 其他文件的关联不受影响
  });

  return {
    files: state.files.map(f => f.id === fileId ? { ...f, columns: mergedColumns } : f),
    relations: activeRelations // 更新后的关联列表（自动删除了无效关联）
  };
})
```

#### Step 3: UI 反馈 (Toast)

刷新完成后，根据变更情况给用户反馈：

*   **完美更新**：`toast.success("Data reloaded successfully.")`
*   **有破坏性变更**：
    `toast.warning("Data reloaded, but some columns were missing. 1 relationship was removed.")`


# 📗 01_DATA_ENGINE.md - Ingestion, Storage & Management

> **Version**: 1.3 (Native Update)
> **Status**: Authoritative
> **Scope**: Native DuckDB, Lazy Ingestion, File Sync.

---

## 1. Database Architecture (Native DuckDB)

v1.3 从 WASM 迁移至 **Native DuckDB (`@duckdb/node-api`)**，通过独立的 Utility Process 运行，解决了内存限制和持久化问题。

### 1.1 Service Encapsulation (`NativeDBClient`)
*   **Utility Process**: 数据库引擎在独立的 Node 进程中运行 (`entry.ts`)，通过 IPC 与主进程通信。这确保了主进程 UI 的流畅性，并提供了崩溃隔离。
*   **Startup Guard**: 引入 `isProjectLoaded` 状态。前端在收到 `project:open` 成功信号前，严禁发起 SQL 查询，防止意外连接到 `:memory:` 临时库。

---

## 2. Ingestion Pipeline: Lazy Ingestion (延迟入库)

为了解决 DuckDB 自动推断导致的类型丢失问题（如文本 "001" 变为数字 `1`），我们实施了 **Lazy Ingestion** 策略。

### 2.1 The Flow
1.  **Preview Phase (Read-Only)**:
    *   用户选择文件。
    *   **Excel**: 使用 `ExcelJS` (Stream) 读取前 100 行，生成临时 CSV (`temp/wansan-studio/temp_ingest_xxx.csv`)。
    *   **CSV**: 直接使用 `read_csv_auto` 读取前 100 行。
    *   **Action**: 仅返回 Schema 和预览数据给前端，**不创建数据库表**。
2.  **Configuration Phase**:
    *   用户在向导中确认/修改列类型 (e.g., 将 `id` 强制设为 `VARCHAR`)。
    *   前端生成 `TableSchema` 配置。
3.  **Execution Phase (Type Enforcement)**:
    *   前端调用 `createTableFromSource(config)`。
    *   后端构造带有 `types` 参数的 SQL:
        ```sql
        CREATE TABLE t_sales AS 
        SELECT * FROM read_csv_auto('source.csv', types={'id': 'VARCHAR'})
        ```
    *   **Result**: 物理表被创建，数据类型与用户意图完全一致。

### 2.2 Excel Caching (性能优化)
*   **Strategy**: Excel 转 CSV 是昂贵操作。我们在 Preview 阶段生成的临时 CSV 会被缓存。
*   **Reuse**: 后续的 Conflict Check (追加预检) 和 Final Ingestion 直接复用该 CSV，将大文件导入的转换次数从 3 次降低为 1 次。
*   **Cleanup**: `TempFileManager` 负责在任务完成或应用退出时清理 `wansan-studio` 临时目录。

---

## 3. Data Tree Manager (数据管理 UI)

左侧 Sidebar 是数据资产的控制台。我们引入 `react-arborist` 来处理复杂的层级结构。

### 3.1 Tree Structure
```text
📂 Project Root
 ├── 📄 orders.xlsx (File Node)
 │    ├── 🆔 Order_ID  (PK)
 │    ├── 💰 Amount    (Numeric)
 │    └── 📅 Date      (Date)
 └── 📄 users.json (File Node)
```

### 3.2 Interactions
*   **Click**: 切换中间面板视图 (Chat / Schema Editor)。
*   **Context Menu**:
    *   `Reload Data`: 触发 `reIngestFile` (带类型参数)。
    *   `Replace Source`: 替换底层文件但保留表结构。

---

## 4. Synchronization Strategy (数据同步)

### 4.1 Re-Ingest with Types
当用户点击刷新或进行数据恢复时，系统调用 `reIngestFile`。为了防止类型退化（Regression），该调用**必须**携带当前 Store 中保存的列类型配置。

### 4.2 Self-Healing
如果 `.duckdb` 文件丢失或损坏，`useDataRehydrate` 会检测到表缺失，并利用源文件路径和保存的 Schema 自动重建数据表，实现无感恢复。

---

## 5. Advanced Data Standards (Future Ready)

为了迎接 v1.6+ 的云同步与 Parquet 支持，我们采用企业级的数据交换标准（参考 `SPEC_DUCKDB_REPORT.md`）。

### 5.1 Parquet Storage Spec
*   **Format**: Parquet 2.0+ with **Snappy** compression (Balance of speed/size).
*   **Structure**: Hive-Partitioning style for optimal Cloud OLAP performance.
    *   `dataset={name}/snapshot_date={yyyy-MM-dd}/part-{uuid}.parquet`
*   **Benefits**: Allows DuckDB to perform **Partition Pruning** automatically when querying historical data.

### 5.2 Robust Type Mapping
Strict mapping rules to prevent precision loss during Import/Export.

| Business Type | DuckDB / Parquet Physical | Note |
| :--- | :--- | :--- |
| **ID / Key** | `INT64` / `VARCHAR` | Avoid `DOUBLE`. IDs are not math. |
| **Money / Price** | `DECIMAL(18, 4)` | **CRITICAL**. Never use `DOUBLE` for currency to avoid floating point errors (e.g. 0.1 + 0.2). |
| **Timestamp** | `TIMESTAMP` (INT64 Micors) | Always store as UTC. Frontend handles Timezone display. |
| **Date** | `DATE` (INT32 Days) | For simple dates without time component. |
| **JSON / List** | `VARCHAR` | Complex structures are serialized to JSON strings. |
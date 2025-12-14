# 📗 01_DATA_ENGINE.md - Ingestion, Storage & Management

> **Version**: 1.0
> **Status**: Authoritative
> **Scope**: DuckDB Implementation, File Parsing, Tree UI, Sync Logic.

---

## 1. Database Architecture (DuckDB WASM)

Wansan 使用 **DuckDB-WASM** 作为核心计算引擎。虽然运行在 Node.js 环境中，但我们选择 WASM 以确保绝对的稳定性和跨平台兼容性。

### 1.1 Service Encapsulation (`DatabaseService`)
*   **Initialization**: 必须使用 `duckdb-node-blocking` 绑定。这是规避 Node Worker 通信问题的关键。
*   **Concurrency**: 引入 `async-mutex`。所有查询必须串行执行，防止 WASM 实例在并发请求下崩溃。
*   **Lifetime**: 单例模式，随应用启动而初始化，随应用关闭而销毁（内存数据易失）。

### 1.2 Query Interface
*   **Input**: SQL String (DuckDB Dialect).
*   **Output**: JSON Array (Arrow Table converted to JSON).
*   **Error Handling**: 捕获所有 C++ 异常，转换为 JS Error 并透传给前端（用于触发 Auto-Fix）。

---

## 2. Ingestion Pipeline (数据入库流水线)

由于 WASM 无法直接读取本地文件系统（FS Sandbox），我们采用了 **"Temp File Bridge"** 策略。

### 2.1 The Flow
1.  **File Selection**: 用户选择 `.xlsx`, `.csv`, `.json`。
2.  **Preprocessing (Node.js)**:
    *   **Excel**: 使用 `xlsx` 库读取。执行 **Unmerge Algorithm** (填充合并单元格)。将 Sheet 转换为 CSV 字符串。
    *   **JSON**: 扁平化处理（如果根是 Object）。
3.  **WASM Registration**:
    *   调用 `db.registerFileText('temp_import.csv', content)` 将处理后的 CSV 写入 WASM 的虚拟文件系统。
4.  **SQL Loading**:
    *   执行 `CREATE TABLE "t_name" AS SELECT * FROM read_csv_auto('temp_import.csv')`。
5.  **Cleanup**:
    *   执行 `db.registerFileText('temp_import.csv', '')` 释放虚拟内存。

### 2.2 Semantic Naming
*   **Table Name**: 使用 sanitised 文件名 (e.g., `t_sales_2023`)。
*   **Metadata**: 将原始文件名 (`Sales 2023.xlsx`) 存入 Store，并在 Prompt 中告知 AI。

---

## 3. Data Tree Manager (数据管理 UI)

左侧 Sidebar 是数据资产的控制台。我们引入 `react-arborist` 来处理复杂的层级结构。

### 3.1 Tree Structure
```text
📂 Project Root
 ├── 🔗 Relationships (Group)
 │    ├── Link: Orders.uid <-> Users.id
 │    └── ...
 ├── 📄 orders.xlsx (File Node) [Status: Ready]
 │    ├── 🆔 Order_ID  (PK Indicator)
 │    ├── 💰 Amount    (Numeric Icon)
 │    └── 📅 Date      (Date Icon)
 └── 📄 users.json (File Node)
      └── ...
```

### 3.2 Interactions
*   **Click**: 切换中间面板视图 (Chat / Schema Editor / Relations)。
*   **Context Menu (Right Click)**:
    *   **File**: `Reload Data`, `Delete`, `Preview`.
    *   **Column**: `Rename Alias`, `Change Type`.
*   **Visual Feedback**:
    *   **Yellow Dot**: 文件已过期 (Out of Sync)。
    *   **Spinning**: 正在重新入库。

---

## 4. Synchronization Strategy (数据同步)

为了解决“用户修改 Excel 后，Wansan 数据滞后”的问题，我们实施了 **"On-Focus Check"** 策略。

### 4.1 Detection (被动检测)
*   **Trigger**: `window.onFocus` (用户切换回 Wansan 窗口)。
*   **Logic**:
    1.  遍历所有已导入文件。
    2.  比较 `fs.stat(path).mtimeMs` 与 Store 中的 `lastModified`。
    3.  如果有差异，将文件状态标记为 `out-of-sync`。
*   **UI**: 树节点显示黄色警告。

### 4.2 Reconciliation (主动刷新)
*   **Action**: 用户点击 `[Reload]` 或 `[Reload All]`。
*   **Logic**:
    1.  重新运行 Ingestion Pipeline。
    2.  **Schema Merge**: 对比新旧列名。
        *   如果列名匹配：保留用户设置的 Alias 和 Type。
        *   如果列名消失：清理对应的关联关系。
    3.  更新 Store 时间戳。

---

## 5. One-Shot Context Analysis (智能上下文)

在文件成功入库后，系统会自动触发一次 **Schema Analysis** 任务，以节省 Token 并提升体验。

### 5.1 The Prompt
*   **Input**: 全量 Table Schemas。
*   **Task**:
    1.  **Infer Relations**: 猜测表间关联 (e.g., `orders.uid` = `users.id`)。
    2.  **Generate Starters**: 生成 4 个基于当前数据的推荐问题。
    3.  **Summarize**: 生成一句话数据综述。
*   **Storage**: 结果存入 `useProjectStore`。

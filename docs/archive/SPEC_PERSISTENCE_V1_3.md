# 🏗️ SPEC_PERSISTENCE_V1_3.md - Native Persistence & Project Structure

> **Version**: 1.0 (Draft)
> **Status**: In Progress
> **Scope**: Engine Migration (WASM -> Native), Utility Process, Project Bundle.

## 1. Architecture: The "Sidecar" Pattern (Utility Process)

为了突破内存限制并利用 Node.js Native 能力，我们将数据库引擎移出主进程，放入独立的 **Utility Process**。

### 1.1 Why Utility Process?
* **Performance**: 不会像 Main Process 那样阻塞 UI 线程 (Main 用于窗口管理)。
* **Stability**: 独立的 V8 实例。如果 DuckDB 崩溃（极低概率），不会导致整个应用闪退。
* **Capabilities**: 拥有完整的 Node.js 环境（支持 `fs`, `net`, `dlopen`），完美支持 `@duckdb/node-api`。

### 1.2 Process Topology
```mermaid
graph TD
    UI[Renderer Process (React)] <-- IPC (Invoke) --> Main[Main Process]
    Main <-- MessagePort --> DB[Utility Process (DB Service)]
    DB -- Native Binding --> Disk[(.duckdb File)]

```

### 1.3 Communication Protocol (IPC)

Main Process 充当路由器。Renderer 不直接通过 MessagePort 连接 DB（为了安全和简化状态管理），而是继续使用 `ipcRenderer.invoke`。

* **Request**: `Renderer` -> `Main` -> `DB Service`
* **Response**: `DB Service` -> `Main` -> `Renderer`

---

## 2. Dependency: `@duckdb/node-api`

* **Package**: `@duckdb/node-api` (Neo Client).
* **Configuration**:
* **NO Rebuild**: 由于使用 N-API，不需要 `electron-rebuild`。
* **Copy Logic**: 必须确保构建时将 `.node` 二进制文件复制到 `resources` 目录。



---

## 3. Project Storage: The `.wansan` Bundle

v1.3 引入 **Project Bundle** 概念，将项目视为一个文件夹。

### 3.1 Structure

```text
📂 MyProject.wansan/            # The Project Root
 ├── 📄 wansan.json             # Manifest (Metadata, Version)
 ├── 🗄️ main.duckdb             # NATIVE DB File (Single Source of Truth)
 ├── 📜 session.json            # UI State (Persisted from Zustand)
 └── 📂 assets/                 # (Optional) Copied raw files

```

### 3.2 Manifest Schema (`wansan.json`)

```json
{
  "id": "uuid-v4",
  "version": "1.3.0",
  "name": "Q3 Financial Analysis",
  "createdAt": 1700000000000,
  "sources": [
    { "id": "f1", "path": "/Users/me/Downloads/data.xlsx", "mode": "reference" }
  ]
}

```

---

## 4. Implementation Steps (Spike)

### Step 1: Infrastructure

* Install `@duckdb/node-api`.
* Configure `electron-builder` to include native modules.

### Step 2: The `DBService` (Utility Process)

* Create entry point: `src/main/services/db-service/index.ts`.
* Implement `ipcMain` handler to spawn `utilityProcess`.

### Step 3: Verification

* Create a "Hello World" query: `SELECT 'Hello from Native DuckDB' as msg`.
* Log the result in Main Process console.

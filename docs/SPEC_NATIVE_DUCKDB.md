# 🚀 SPEC: Wansan Studio Native DuckDB Engine (v1.3)

**Status:** Completed
**Date:** 2025-12-26
**Engine:** `@duckdb/node-api` (Native) via Electron Utility Process

## 1. Overview
The migration from `duckdb-wasm` to a native DuckDB engine running in a separate process has been fully implemented. This upgrade resolves memory limitations of WASM, enables persistent storage, and significantly improves data ingestion performance for large files.

## 2. Architecture: The "Sidecar" Model

To prevent blocking the Electron Main Process and to ensure stability, the Native DuckDB engine runs in a dedicated **Electron Utility Process**.

```mermaid
graph TD
    subgraph "Renderer Process"
        UI[React UI] -->|IPC| Main
    end

    subgraph "Main Process"
        Main[Electron Main]
        Adapter[NativeDatabaseService]
        Client[NativeDBClient]
        
        Main --> Adapter
        Adapter --> Client
    end

    subgraph "Utility Process (Sidecar)"
        Entry[entry.ts]
        DB[DuckDB Native]
        
        Client <-->|Node IPC (MessagePort)| Entry
        Entry --> DB
    end

    subgraph "File System"
        UserData[userData/wansan-v1.duckdb]
        Temp[Temp CSV/JSON]
        
        DB <--> UserData
        DB <-->|read_csv_auto| Temp
    end
```

### Key Components
1.  **Utility Process (`src/main/services/db-service/entry.ts`)**:
    -   Acts as the database server.
    -   Handles `CONNECT`, `QUERY`, `INGEST_FILE`, `GET_SCHEMA`, `CLOSE` messages.
    -   Directly accesses the file system for zero-copy ingestion where possible.

2.  **Client Bridge (`src/main/services/db-service/client.ts`)**:
    -   Manages the lifecycle of the utility process (`fork`, `kill`).
    -   Implements a Request-Response pattern using `reqId` to map async IPC messages.
    -   Handles graceful shutdown.

3.  **Service Adapter (`src/main/services/native-db-service.ts`)**:
    -   Implements the interface expected by the application, replacing the old `DatabaseService`.
    -   Proxies calls to the `NativeDBClient`.

## 3. Implementation Details

### 3.1 Persistence & Connection
-   **Old (WASM)**: In-memory only (`:memory:`), data lost on reload.
-   **New (Native)**:
    -   Default path: `app.getPath('userData')/wansan-v1.duckdb`.
    -   Supports switching databases via `CONNECT` payload.
    -   **Graceful Shutdown**: Implemented `CLOSE` IPC message. The Main process sends this signal on `before-quit` to ensure WAL checkpointing before killing the utility process.

### 3.2 Data Ingestion Pipeline
The ingestion logic in `ingestion.ts` was refactored to leverage Native DuckDB's ability to read directly from the filesystem, bypassing V8 memory limits.

| Format | Strategy |
| :--- | :--- |
| **CSV** | Direct SQL: `CREATE TABLE x AS SELECT * FROM read_csv_auto('/path/to/file.csv')` |
| **JSON** | Buffer -> FS Write -> `read_json_auto('/temp/file.json')` -> Clean Temp |
| **Excel** | ExcelJS Stream -> FS Write (`.csv`) -> `read_csv_auto` -> Clean Temp |

-   **Path Safety**: All file paths are sanitized (backslashes replaced with forward slashes) to support Windows environments in DuckDB SQL.

### 3.3 Type System & Serialization
-   **BigInt**: Native DuckDB returns `BigInt` for large integers.
    -   *Solution*: `sanitizeValue` utility checks `Number.isSafeInteger`. If safe, converts to `Number`; otherwise, converts to `string` for JSON serialization to Frontend.
-   **Dates**: `ingestion.ts` pre-processes JS Date objects to "Wall Time" strings (ISO format) to prevent UTC timezone shifting during storage.
-   **Schema**: `GET_SCHEMA` normalizes DuckDB types (e.g., `VARCHAR`, `BIGINT`) to Wansan internal types.

## 4. Packaging & Cleanup
-   **Dependencies**:
    -   Removed: `@duckdb/duckdb-wasm`, `apache-arrow`.
    -   Added: `@duckdb/node-api`.
-   **Build Config (`electron-builder.yml`)**:
    -   Added `asarUnpack: ["node_modules/@duckdb/node-api"]` to ensure the native binary (`duckdb.node`) is accessible at runtime.
    -   Removed WASM-specific exclusion rules.

## 5. Migration Summary
-   [x] **Phase 1**: Infrastructure & API Parity (Client/Server IPC).
-   [x] **Phase 2**: Ingestion Refactor (Stream & Path-based).
-   [x] **Phase 3**: Main Process Switchover.
-   [x] **Phase 4**: Persistence (File-based DB).
-   [x] **Phase 5**: Cleanup (Delete WASM code).

🚀 Wansan Studio: Native Engine Migration Plan

Goal: Completely replace src/main/database/duckdb.ts (WASM) with src/main/services/db-service (Native), enabling file-based
persistence and handling large datasets.

📦 Phase 1: API Parity (Service Layer)
Goal: Ensure the Native Service supports all method signatures used by the current application, running in `:memory:` mode
initially.

- [x] 1.1 Expand IPC Protocol (`ipc-db.ts`)
    - Add GET_SCHEMA, GET_TABLE_INFO, DROP_TABLE types to DBRequestType.
    - Update entry.ts (Server) to handle these new request types.
    - Update client.ts (Client) to expose corresponding methods (getSchema, dropTable).

- [x] 1.2 Implement Schema Extraction
    - Port the getSchema logic from the old engine to the new entry.ts.
    - Challenge: Native DuckDB returns types differently (e.g., BIGINT vs Int64).
    - Action: Ensure the returned schema format matches exactly what the Frontend (SchemaEditor, Chat) expects.

- [x] 1.3 Implement `NativeDatabaseService` Adapter
    - Create src/main/services/native-db-service.ts.
    - This class should implement the same interface as the old DatabaseService.
    - It acts as a wrapper around dbClient, allowing us to swap the service in src/main/index.ts with one line of code.

  ---

📂 Phase 2: Ingestion Refactor (The Hardest Part)
Goal: Rewrite how files are loaded. WASM used Buffers/FileObjects; Native uses File Paths.

- [x] 2.1 CSV & JSON Ingestion
    - Old: Read file to string/buffer -> Load into virtual WASM FS -> read_csv.
    - New: Pass absolute file path directly to Utility Process.
    - Action: Implement INGEST_FILE command in entry.ts.
    - Use CREATE TABLE x AS SELECT * FROM read_csv_auto('path', all_varchar=true) (safer for type inference).

- [x] 2.2 Excel Ingestion
    - Current: excelWorker parses Excel -> Returns JSON/Arrays -> Inserted row-by-row (Slow).
    - New Strategy:
        1. Main Process uses exceljs (stream) to convert .xlsx -> temporary .csv (in temp/).
        2. Send .csv path to Utility Process for bulk loading (Fast).
    - Task: Create a ExcelToCSV converter in Main Process.

- [x] 2.3 Type Inference & Sampling
    - Ensure getSampleValues (used for AI context) works in the Native Service.
    - Implement DESCRIBE query handling to map Native DuckDB types to Wansan types (Integer, String, Date, etc.).

  ---

🔌 Phase 3: The Switchover (Main Process)
Goal: Point the application to the new engine.

- [x] 3.1 Update IPC Handlers (`services/ipc.ts`)
    - Modify setupIPC to accept NativeDatabaseService instead of DatabaseService.
    - Redirect run-sql, get-schema, delete-table channels to the new engine.

- [x] 3.2 Wiring in `index.ts`
    - Replace this.databaseService = new DatabaseService() with new NativeDatabaseService().
    - Remove WASM initialization logic.

- [x] 3.3 Verification
    - Test: Chat-to-SQL functionality.
    - Test: Dashboard rendering.
    - Test: Data Manager (Schema view).

  ---

💾 Phase 4: Persistence Implementation (v1.3 Spec)
Goal: Stop using `:memory:` and start using `.duckdb` files.

- [ ] 4.1 Project Store Integration
    - When switching projects, send CONNECT { path: '/path/to/project.duckdb' } to Utility Process.
    - Ensure db.close() is called on the old connection before opening a new one.

- [ ] 4.2 "Save" Mechanism
    - Native DuckDB is auto-saving (WAL), but we need to ensure graceful shutdown (CHECKPOINT).

  ---

🧹 Phase 5: Cleanup
Goal: Remove Dead Code.

- [ ] 5.1 Uninstall WASM Dependencies
    - Remove @duckdb/duckdb-wasm, apache-arrow (if not used elsewhere).
- [ ] 5.2 Delete Old Files
    - Delete src/main/database/duckdb.ts.
    - Clean up electron-builder.yml (remove WASM unpacking rules).

# 🛠️ Spec: Migrate to DuckDB-WASM

> **Goal**: Replace `duckdb` (Native) with `@duckdb/duckdb-wasm` to eliminate installation issues and app crashes.
> **Scope**: Main Process `DatabaseService`.

## 1. Architecture Change

*   **Old**: Main Process loads `duckdb.node` (C++).
*   **New**: Main Process loads `duckdb-wasm` via a Worker.
    *   Since we are in the Main Process (Node.js environment), we use the `@duckdb/duckdb-wasm/dist/duckdb-node-blocking` or async bundle.

## 2. Dependencies
`npm uninstall duckdb`
`npm install @duckdb/duckdb-wasm apache-arrow`

## 3. Implementation (`src/main/services/database.ts`)

DuckDB-WASM requires an asynchronous initialization sequence.

```typescript
import * as duckdb from '@duckdb/duckdb-wasm';
import { createRequire } from 'module';
import path from 'path';
import { Worker } from 'worker_threads'; // Node Worker

const require = createRequire(import.meta.url);

// Locate Bundles manually (Vite trickery might be needed)
const DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm'));

export class DatabaseService {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private isReady = false;

  async init() {
    // 1. Resolve Bundle Paths
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES); 
    // OR: Use local files if you prefer offline (Recommended for Electron)
    
    // 2. Create Worker
    const worker = new Worker(bundle.mainWorker!); 
    const logger = new duckdb.ConsoleLogger();
    
    // 3. Instantiate
    this.db = new duckdb.AsyncDuckDB(logger, worker);
    await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    
    // 4. Connect
    this.conn = await this.db.connect();
    this.isReady = true;
  }

  async query(sql: string) {
    if (!this.isReady) await this.init();
    
    // WASM returns Arrow Table
    const arrowTable = await this.conn!.query(sql);
    // Convert Arrow to JSON
    return arrowTable.toArray().map(row => row.toJSON()); 
  }
  
  async exec(sql: string) {
    if (!this.isReady) await this.init();
    await this.conn!.query(sql); // WASM uses query for exec too
  }
}
```

## 4. Ingestion Changes
*   **CSV**: `db.registerFileText('data.csv', csvContent)` -> `INSERT INTO ... SELECT * FROM read_csv_auto('data.csv')`.
*   **JSON**: Same logic. Register virtual file, then load.
*   **Excel**: `read-excel-file` (Node lib) -> JSON -> DuckDB. (WASM doesn't have `st_read` spatial extension).

## 5. Challenges & Fixes
*   **Offline Support**: We cannot rely on jsDelivr. We must copy the WASM files to `extraResources` or bundle them.
*   **Node Worker**: `worker_threads` vs Web Worker. DuckDB-WASM supports Node.

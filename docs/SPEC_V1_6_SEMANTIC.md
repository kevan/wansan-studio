# 📦 Spec: v1.6 Semantic & Connect (语义与连接)

> **Version**: 1.0 (Draft)
> **Theme**: "Understanding Data" & "Breaking Silos"
> **Core Value**: Improving AI accuracy through semantic metadata, and expanding data reach to local databases.

---

## 1. Semantic Layer (语义层)

**Goal**: Solve the "AI hallucination" problem where the AI cannot map user intent (e.g., "营收") to physical columns (e.g., `xsqk`).

### 1.1 Data Structure Update (`TableSchema`)

We extend the `ColumnSchema` to hold semantic metadata and clean up legacy fields.

```typescript
// src/shared/types.ts

export interface ColumnSemantic {
  /** 
   * User-friendly aliases or synonyms 
   * e.g. ["营收", "收入", "Sales Revenue"] for column "amt"
   */
  aliases?: string[];
  
  /** 
   * High-level business type hint for visualization
   * e.g. "Currency", "City", "User_ID", "Category"
   */
  businessType?: string;
  
  /**
   * Description of the column's business logic
   */
  description?: string;
  
  /**
   * Whether this column is visible to the AI Context.
   * If false, it is EXCLUDED from the prompt sent to LLM.
   * Default: true.
   */
  isVisibleToAI?: boolean;
}

export interface ColumnSchema {
  name: string;
  type: string; // DuckDB Type
  // ... existing fields
  
  /** @deprecated Use relations structure instead */
  isKey?: boolean; 
  
  /** @deprecated Use semantic.aliases instead */
  alias?: string; 

  semantic?: ColumnSemantic; // [NEW]
}
```

### 1.2 AI Auto-Tagging (On-Demand)

*   **Trigger**: A "✨ Analyze Semantics" button in the Schema Editor toolbar.
*   **Input**:
    *   Table Name.
    *   Column Names & Types.
    *   **Sample Data** (Top 10 rows).
*   **Prompt**:
    > "Analyze the following schema and data samples. 
    > 1. Infer the business meaning of each column.
    > 2. Suggest 2-3 synonyms (aliases) in the user's language (Chinese).
    > 3. Identify sensitive or technical columns (IDs, Hashes, System Logs) and mark `isVisibleToAI: false`."
*   **Output**: JSON list of `ColumnSemantic` updates.
*   **Action**: Frontend merges the suggestions into the store. User can manually review/revert.

### 1.3 Prompt Injection

When generating analysis plans (`askAI`), the system prompt generator (`generateSystemPrompt`) must now:
1.  **Filter**: Exclude columns where `isVisibleToAI === false`.
2.  **Annotate**: Append aliases to column descriptions.
    *   *Format*: `Column: "amt" (Type: DOUBLE, Aliases: ["营收", "收入"])`

---

## 2. Engine Expansion: Connectors (数据库连接)

**Goal**: Pull data from local MySQL/PostgreSQL databases into Wansan for analysis.

### 2.1 Connection Management

Users should not re-enter credentials every time. We persist connection profiles securely.

*   **Storage**: Global `SettingsStore` (Metadata) + `secure-store` (Passwords).
*   **Structure**:
    ```typescript
    interface DBConnectionConfig {
      id: string;
      name: string; // e.g. "Prod Master DB"
      type: 'mysql' | 'postgres';
      host: string;
      port: number;
      user: string;
      database: string;
      // Password is NEVER stored here. It is stored in Keychain via `db_pass_${id}`
    }
    ```

### 2.2 Architecture: Node Adapter (Snapshot Mode)

We do **NOT** use DuckDB native scanners. We use Node.js drivers to stream data into a local DuckDB table.

*   **Drivers**:
    *   `pg`: PostgreSQL client (Lazy import).
    *   `mysql2`: MySQL client (Lazy import).
*   **Flow**:
    1.  **Connect**: User selects a saved profile -> Main process retrieves password -> Connects.
    2.  **Select**: List tables. User selects **ONE** table (v1.6 scope).
    3.  **Ingest**:
        *   Node.js executes `SELECT * FROM table`.
        *   Stream rows -> `DuckDB Appender` -> Local `.duckdb` file.
    4.  **Metadata**: Create a `FileNode` with `sourceType: 'postgres'` (or 'mysql').

### 2.3 Data Type Mapping

Node drivers return JS types. We must map them to DuckDB types strictly to prevent precision loss.

| Source (SQL) | JS Type | Target (DuckDB) | Strategy |
| :--- | :--- | :--- | :--- |
| `VARCHAR`, `TEXT` | `string` | `VARCHAR` | Direct. |
| `INT`, `BIGINT` | `number`/`string` | `BIGINT` | Handle JS safe integer limits. |
| `DECIMAL` | `string` | `DECIMAL` | **Critical**: Keep precision. |
| `DATE` | `Date` (or string) | `DATE` | Extract `YYYY-MM-DD` part only. |
| `TIME` | `string` | `TIME` | Keep as string `HH:mm:ss`. |
| `DATETIME`, `TIMESTAMP` | `Date` | `TIMESTAMP` | Convert to UTC Epoch Micros (BigInt). |
| `BOOL` | `boolean` | `BOOLEAN` | Direct. |
| `BLOB`, `BYTEA` | `Buffer` | `BLOB` | Encode as Hex/Base64 if needed. |
| `UUID` | `string` | `UUID` | DuckDB native UUID type. |
| `JSON` | `object` | `VARCHAR` | `JSON.stringify`. |

---

## 3. UI Changes

### 3.1 Schema Editor 2.0
*   **Grid Layout**: Updated column list to show "Alias" and "Visibility" controls.
*   **Eye Icon**: A toggle icon 👁️/👁️‍🗨️ to set `isVisibleToAI`.
*   **Edit Mode**: Click alias/description to edit inline.

### 3.2 Ingestion Wizard Upgrade
*   **Physical Ignore**: In the "Preview" step, add a checkbox column "Import?".
    *   If unchecked: The column is dropped during `CREATE TABLE` (via `SELECT * EXCLUDE` or explicit column list).
*   **Connector Tab**: Add a new tab "Database" alongside "File Upload".

---

## 4. Implementation Plan

1.  **Phase 1: Semantic Core**
    *   Update `TableSchema` types.
    *   Upgrade Schema Editor UI.
    *   Implement `analyzeSemantics` API (AI Bridge).
2.  **Phase 2: Prompt Engineering**
    *   Update `generateSystemPrompt` to respect visibility and aliases.
3.  **Phase 3: Connectors**
    *   Install `pg`, `mysql2`.
    *   Implement `DBConnectorService` in Main process.
    *   Add Connector UI in Wizard.

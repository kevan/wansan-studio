# 📦 Spec: v1.6 Semantic & Connect (语义与连接)

> **Version**: 1.1 (Implemented)
> **Theme**: "Understanding Data" & "Breaking Silos"
> **Core Value**: Improving AI accuracy through semantic metadata, and expanding data reach to local databases via a unified high-performance pipeline.

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
*   **Input**: Table Name, Column Names & Types, Sample Data.
*   **Prompt**: "Analyze schema and samples to infer business meaning, suggest aliases, and identify sensitive columns."
*   **Output**: JSON list of `ColumnSemantic` updates.

---

## 2. Unified Ingestion Pipeline (The "Wansan Flow")

**Goal**: A unified, high-performance architecture to handle ALL data sources (Excel, CSV, JSON, Parquet, Database) with consistent UX.

### 2.1 The 3-Stage Pipeline

Instead of separate logic for files and databases, we enforce a strict 3-stage pipeline:

1.  **Stage 1: Inspect (Lightweight)**
    *   **Goal**: Rapidly identify available resources (Sheets, Tables) without loading data.
    *   **Excel**: Uses `ExcelJS` streaming (or buffer fallback) to read Sheet names only.
    *   **Flat Files**: Identity pass (filename).
    *   **Database**: List tables via SQL `SHOW TABLES`.
    *   **Result**: A list of "Tasks" in the Wizard UI (Status: `waiting_for_sync`).

2.  **Stage 2: Prepare (Staging)**
    *   **Goal**: Standardize all sources into a DuckDB-friendly format (local CSV or direct read).
    *   **Trigger**: **Auto-Preloading** immediately after selection.
    *   **Excel**: Worker converts Sheet -> CSV.
    *   **Database**: Connector streams `SELECT *` -> CSV.
    *   **CSV**: Auto-detects encoding (UTF-8 / GBK / GB18030).
    *   **Parquet**: Zero-copy pass-through.
    *   **Result**: Task becomes `ready`, with row counts and column previews available.

3.  **Stage 3: Ingest (Finalize)**
    *   **Goal**: Create optimized DuckDB tables.
    *   **Action**: `CREATE TABLE final AS SELECT * FROM read_csv_auto('staged.csv')`.
    *   **Feature**: Supports `CAST` for type enforcement and `EXCLUDE` for column ignoring.

### 2.2 Database Connectors (Node Adapter)

We use Node.js drivers (`pg`, `mysql2`) to stream data into the Staging Phase.

*   **Architecture**: `Stream` -> `fs.createWriteStream` -> `DuckDB read_csv_auto`.
*   **Why**: This avoids OOM on large tables and leverages DuckDB's parallel CSV reader for ingestion speed.

### 2.3 File Format Support

| Format | Inspect Strategy | Prepare Strategy | Note |
| :--- | :--- | :--- | :--- |
| **Excel (.xlsx)** | `ExcelJS` Stream | Worker -> CSV | Low memory footprint. |
| **Excel (.xls)** | `ExcelJS` Buffer | Worker -> CSV | Compatibility mode. |
| **CSV** | DuckDB `DESCRIBE` | Identity + Encoding Check | Supports GBK/GB18030. |
| **JSON** | `fs.readFile` | DuckDB `read_json_auto` | Auto-detects array/newline. |
| **Parquet** | DuckDB `DESCRIBE` | DuckDB `read_parquet` | **Zero-Copy**, extremely fast. |

---

## 3. UI/UX Improvements

### 3.1 The "Shopping Cart" Wizard
*   **Unified List**: Files and Database tables coexist in the same task list.
*   **Auto-Preloading**: Tasks automatically transition from `Pending` -> `Preparing` -> `Ready` without blocking the UI.
*   **Non-Blocking**: Users can continue adding sources while previous ones are processing.

### 3.2 Visual Feedback
*   **Real-time Stats**: Row/Column counts displayed immediately upon readiness.
*   **Ignore Column**: In Preview, use a **Ban Icon** (🚫) to explicitly exclude columns. Visual dimming applied to ignored columns.

---

## 4. Implementation Status

*   [x] **Semantic Schema**: `ColumnSemantic` structure added.
*   [x] **AI Analysis**: `analyzeSemantics` API implemented.
*   [x] **Unified Pipeline**: `FileService` refactored to 3-stage architecture.
*   [x] **Parquet Support**: Added via DuckDB Native.
*   [x] **CSV Encoding**: Robust detection for Chinese characters.
*   [x] **Database Connectors**: MySQL/PostgreSQL streaming implementation.
*   [x] **Wizard UX**: Auto-preloading and unified task list.

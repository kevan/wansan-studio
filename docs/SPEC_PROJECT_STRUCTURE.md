# 🏗️ SPEC: Wansan Project Bundle Structure (v1.3)

**Version**: 1.0 (Draft)
**Goal**: Define the physical storage format for Wansan Projects (`.wansan`) to support Native Persistence and Multi-Project Management.

---

## 1. Conceptual Model

A **Project** is no longer just a JSON dump in `localStorage`. It is a **Directory Bundle** (macOS Package style) containing:

1. **Manifest**: Project identity and configuration.
2. **Engine Data**: The native DuckDB file (`source.duckdb`).
3. **App State**: UI state, sessions, and layouts.

### 1.1 The ".wansan" Directory Layout

```text
📂 MyAnalysis.wansan/
  ├── 📄 wansan.json         # [Manifest] The entry point.
  ├── 🗄️ source.duckdb       # [Engine] Native DuckDB file (Binary).
  ├── 💬 session.json        # [State] Chats, Widgets, Layouts.
  ├── 🧠 semantic.json       # [Logic] Global Relations & Metrics (extracted from FileNode).
  └── 🔒 .lock               # [Runtime] Process lock (PID) to prevent concurrent writes.

```

---

## 2. File Specifications

### 2.1 `wansan.json` (The Anchor)

This file is small, human-readable, and version-controlled.

```typescript
interface ProjectManifest {
  meta: {
    id: string;             // UUID
    name: string;           // Display Name
    version: '1.3.0';       // Schema Version
    createdAt: number;      // Timestamp
    updatedAt: number;      // Timestamp
    engine: 'native';       // Engine Type tag
  };
  
  // Static File Assets (Reference Only)
  // Runtime status (loading/error) is NOT persisted here.
  assets: {
    id: string;
    name: string;
    originalPath: string;   // Absolute path to source Excel/CSV
    tableName: string;      // Table name in source.duckdb
    hash?: string;          // For change detection (optional v2)
    
    // Core Schema (Minimal, just for UI listing before DB connects)
    columns: Array<{ name: string; type: string; safeName: string }>;
  }[];
  
  settings: {
    theme?: 'light' | 'dark';
    autoSave?: boolean;
  };
}

```

### 2.2 `semantic.json` (The Brain)

Decoupled from physical files to allow "Cross-File Logic".

```typescript
interface SemanticLayer {
  // Global Relationships
  relations: Array<{
    id: string;
    from: { fileId: string; column: string };
    to:   { fileId: string; column: string };
  }>;

  // Global Metrics (Virtual Columns)
  smartMetrics: Record<string, { // Keyed by ID
    fileId: string;         // Parent Table
    name: string;
    sqlExpression: string;
    description?: string;
  }>;
}

```

### 2.3 `session.json` (The UI State)

Directly mapped from current `useProjectStore` slices, but cleaned.

```typescript
interface SessionState {
  activeSessionId: string;
  sessions: Array<{
    id: string;
    title: string;
    messages: Message[];    // Contains text & reasoning
    layout: any[];          // RGL Layout
  }>;
  
  // The Heavyweight Registry
  // Stores the actual ECharts options and Data Rows.
  widgetRegistry: Record<string, ReportData>; 
}

```

---

## 3. Migration Strategy (v1.2 -> v1.3)

Since v1.2 data lives in `localStorage`, we need a **"One-Time Import"** workflow.

1. **Detection**: App launch -> Check `localStorage.getItem('wansan-storage')`.
2. **Prompt**: "Found legacy project. Converting to new format..."
3. **Conversion Logic**:
* Create `Default Project.wansan`.
* **Data**: Re-ingest all files from `FileNode.path` into `source.duckdb`. (Because v1.2 memory DB is gone).
* **State**: Map `ProjectData` -> `wansan.json` + `session.json`.
* **Cleanup**: Clear `localStorage` after success.



---

## 4. Runtime Behavior (The "ProjectManager")

We need a new Main Process Service: `ProjectManager`.

* **`createProject(name, path)`**: Mkdir, init empty JSONs, init empty DB.
* **`openProject(path)`**:
1. Check `.lock`. If exists & process running -> Error.
2. Write `.lock`.
3. Read JSONs -> Send to Renderer.
4. Tell `NativeDBService` to `CONNECT 'path/source.duckdb'`.


* **`saveProject()`**:
1. Renderer debounces `projectState`.
2. Sends JSON payload to Main.
3. Main writes `wansan.json`, `session.json`. (DB auto-saves via WAL).

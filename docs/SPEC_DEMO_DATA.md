# 🛠️ Spec: Demo Data (Cold Start Experience)

> **Goal**: Provide instant "Time-to-Wow" for new users by loading a pre-configured Superstore dataset.
> **Trigger**: "Load Sample Data" button in Empty State or Sidebar.

## 1. The Dataset
We will use a lightweight version of the classic **"Global Superstore"** sales data.

*   **Format**: JSON (embedded in code) or CSV (bundled in `resources`).
*   **Content**: `Order Date`, `Category`, `Region`, `Sales`, `Profit`. (~50 rows is enough for a demo).

## 2. Implementation Strategy

### 2.1 The Data Loader (`demo-loader.ts`)
A helper function in the Renderer process.

```typescript
import { generateId } from "@/lib/utils";

const DEMO_DATA = [
  { order_date: '2023-01-01', category: 'Furniture', region: 'North', sales: 1200, profit: 200 },
  // ... 50 rows ...
];

export async function loadDemoData() {
  // 1. Create FileNode in Store
  const fileId = generateId();
  const fileNode = {
    id: fileId,
    name: 'Superstore_Demo.csv',
    path: 'DEMO_MEMORY', // Special flag
    status: 'ready',
    tableName: 't_demo_superstore'
  };

  // 2. Ingest into DuckDB (Special IPC channel)
  await window.electron.ingestInMemoryData('t_demo_superstore', DEMO_DATA);

  // 3. Update FileStore
  useFileStore.getState().addFile(fileNode);

  // 4. Pre-fill Suggested Prompts (Hardcoded for speed)
  useFileStore.getState().setSuggestedPrompts([
    "Show total sales by category",
    "Analyze profit trend over time",
    "Which region has the highest sales?"
  ]);
  
  return fileId;
}
```

### 2.2 Backend Support (`src/main/services/database.ts`)
We need a method to load JSON array directly into DuckDB.

```typescript
// IPC Handler: 'ingest-json'
async function ingestJson(tableName: string, rows: any[]) {
  // 1. Create Table from first row keys
  // 2. Batch Insert
  // OR: Write rows to a temp CSV and load it (Simpler for DuckDB)
}
```

## 3. UI Entry Points

### 3.1 Empty State (Chat)
Add a secondary button below the "Ask anything" text.
`[ ⚡ Load Demo Data ]`

### 3.2 Sidebar
If `files.length === 0`, show a pulsating "Try Demo" item in the file list.

## 4. i18n Keys
Add to `common.json`:
*   `demo.load_button`: "Load Sample Data"
*   `demo.loading`: "Loading Superstore..."
*   `demo.success`: "Demo data loaded! Try asking: 'Show sales by category'"

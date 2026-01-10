# 🚀 Wansan Studio: The Future Roadmap

> **Philosophy**: Deepen Intelligence, Broaden Connectivity.

## 📅 v1.2.0: The "Intelligence" Update (智能增强)

**Target**: Q3 2024
**Theme**: Making AI smarter about *business logic*, not just SQL syntax.

### 🧠 1. Custom Instructions & Domain Knowledge
*   **Feature**: "Memory" for the AI.
*   **UI**: Global Settings -> AI -> "Custom Rules".
*   **Usage**: User defines "Fiscal Year starts in April" or "Currency is JPY".
*   **Tech**: Inject these rules into the System Prompt context window.

### 📐 2. Semantic Layer (Lightweight)
*   **Feature**: **Computed Columns (计算列)**.
*   **UI**: Schema Editor supports `Add Formula Column`.
*   **Usage**: Create `profit = revenue - cost`. AI can now query `profit` directly without hallucinating math.
*   **Tech**: DuckDB `ALTER TABLE ADD COLUMN ... GENERATED ALWAYS AS ...`.

### 🧠 3. Parameterized Query Interaction (Human-in-the-Loop)
*   **Problem**: AI hallucinates values (e.g. searching for "华南" when data is "CN-South") or risks privacy by requesting all values.
*   **Solution**: **Smart Filters**. Instead of guessing the SQL `WHERE` clause, AI generates a **Form Schema**.
*   **Flow**:
    1.  AI returns: `{ sql: "SELECT * FROM t WHERE region = {{var}}", params: { var: { col: 'region' } } }`
    2.  Local App: Executes `SELECT DISTINCT region` silently.
    3.  UI: Renders a Dropdown with real values (e.g. "CN-South", "CN-North").
    4.  User: Selects "CN-South".
    5.  App: Injects value -> Executes final SQL.
*   **Value**: Zero privacy leak, 100% accuracy.

### 🔍 4. Drill Down (下钻交互)
*   **Feature**: Click chart to explore.
*   **Interaction**: Click "East Region" bar -> Chat opens with "Filter by Region = East".
*   **Tech**: ECharts `click` event -> `addMessage` with Context.

---

## 📅 v1.3.0: The "Connectivity" Update (连接与分享)

**Target**: Q4 2024
**Theme**: Breaking the "Local-Only" silo (safely).

### 🌍 1. Shareable Web Links
*   **Feature**: One-click publish to `share.wansan.app`.
*   **Tech**: Upload the generated HTML (from v1.1) to Cloudflare KV/R2.
*   **Security**: Password protection / Expiry date.

### 🔌 2. Data Connectors (External Sources)
*   **Feature**: Connect to PostgreSQL / MySQL / Notion.
*   **Tech**: DuckDB `INSTALL postgres`. (Requires Native modules, might need to revisit WASM limitation or use a proxy).

---

## 📅 v2.0.0: The "Enterprise" Update (企业级)

**Target**: 2025
**Theme**: Performance & Collaboration.

### 🚀 1. True Persistence (.duckdb)
*   **Feature**: Instant open for 1GB+ files.
*   **Tech**: Migrate from In-Memory Re-ingest to DuckDB File Mode (OPFS/Native).

### 🤝 2. Team Workspace
*   **Feature**: Shared Projects via P2P Sync.
*   **Tech**: CRDTs (Yjs/Automerge) for real-time dashboard collaboration.

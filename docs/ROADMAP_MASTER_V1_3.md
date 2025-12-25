# 🗺️ Wansan Studio: Master Roadmap (Post-v1.2)

> **Strategic Focus**: **Scalability & Connectivity**.
> **Core Shift**: From "In-Memory Toy" to "File-Based Powerhouse".

---

## 📦 v1.3.0: The "Persistence" Update (核心基石)

**Goal**: Eliminate memory limits and startup latency. Enable true multi-project management.

### 1. Engine Upgrade (Architecture)
*   **Feature**: **Native Persistence (.duckdb)**.
    *   Migrate from `:memory:` to on-disk database files.
    *   Benefit: Instant startup for 1GB+ datasets. Zero re-ingestion time.
*   **Feature**: **Multi-Project Isolation**.
    *   **Structure**: One Project = One Folder (`.wansan` bundle).
    *   **Isolation**: Physical separation of `.duckdb` files prevents cross-project pollution.

### 2. Data Capabilities (Local)
*   **Feature**: **Append Data (追加数据)**.
    *   Leverage persistence to perform `INSERT INTO` without re-parsing old files.
    *   Solve the "Monthly Report" accumulation problem.
*   **Feature**: **Import Wizard**.
    *   Support selecting specific Sheets from Excel.
    *   Support Column Type override during import.

### 3. Workflow UI
*   **Feature**: **Project Launcher (Welcome Screen)**.
    *   "Recent Projects", "Create New", "Open from Disk".

---

## ☁️ v1.4.0: The "Connectivity" Update (连接与分享)

**Goal**: Break the local silo. Share results and connect to live data.

### 1. Sharing
*   **Feature**: **Shareable Web Links**.
    *   Upload generated HTML to Cloudflare R2.
    *   Generate `wansan.app/s/xyz` links with password protection.

### 2. Live Data
*   **Feature**: **Database Connectors (MySQL/PG)**.
    *   Requires Electron Main Process streaming (Node.js driver -> DuckDB).
    *   Real-time query execution.

---

## 🔬 v1.5.0: The "Deep Insight" Update (深度分析)

**Goal**: Advanced BI features for Power Users.

### 1. Interaction
*   **Feature**: **Advanced Drill Down**.
    *   Contextual menu on charts: "Breakdown by..." -> AI suggests dimensions.

### 2. Logic
*   **Feature**: **Project-Level Domain Memory**.
    *   Custom instructions scoped to specific projects (e.g., "Fiscal Year" rules).
*   **Feature**: **Computed Columns (UI Builder)**.
    *   No-code formula builder for metrics (e.g., `profit = rev - cost`).

---

## 🅿️ Parking Lot (待排期 / 探索中)

*   **Plugin System**: Allow 3rd party chart libraries.
*   **Team Sync**: P2P real-time collaboration.
*   **Mobile App**: Viewer app for `.wansan` files.

---

### 🚀 Immediate Next Step (v1.3 Kickoff)

The first step is **Technical Research (Spike)** for DuckDB-WASM File Persistence in Electron. This is the hardest part.

**Shall we start the "Engine Persistence" research task?**

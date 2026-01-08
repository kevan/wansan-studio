# 🗺️ Wansan Studio: Master Roadmap (v1.3 - v1.5)

> **Strategic Focus**: **Experience & Insight**.
> **Status**: v1.4.0 Completed.

---

## ✅ v1.3.0: The "Persistence" Update (Done)

**Goal**: Eliminate memory limits and startup latency.
*   **Native Persistence**: File-based storage (.duckdb).
*   **Multi-Project Architecture**: Project bundles.

---

## ✅ v1.4.0: The "Insight & Storytelling" Update (Done)

**Goal**: Transform "Data Reading" into "Interactive Storytelling".

### 1. AI Business Insight
*   **Insight Protocol**: Structured AI analysis from aggregated data.
*   **Visual Anchoring**: Hover text to highlight chart elements.
*   **Auto-Localization**: EN/ZH support.

### 2. Visualization Engine 2.0
*   **New Charts**: **Rose**, Radar, Combo, Scatter (Smart Axis).
*   **Theme System**: "Airy" design, glassmorphism tooltips.
*   **Interactive Drill-Down**: Context menu on chart elements (Filter, View Data, Breakdown).

---

## ✅ v1.2.5: The "Semantic" Update (Done - Backported)

**Goal**: Define business logic once, reuse everywhere.
*   **Smart Metrics**: User-defined computed columns (DuckDB Views).
*   **Schema Masking**: AI uses `v_orders` instead of raw tables.

---

## ☁️ v1.5.0: The "Connectivity" Update (Next)

**Goal**: Break the local silo. Share results and connect to live data.

### 1. Sharing (Web Export)
*   **Feature**: **Static Report Export**.
    *   Export dashboard as a standalone `.html` file.
    *   Include interactive charts (ECharts) and insights.

### 2. Live Data (Connectors)
*   **Feature**: **Database Connectors (MySQL/PostgreSQL)**.
    *   Direct connection from Electron Main Process.
    *   Real-time query execution.

---

## 🅿️ Parking Lot (Backlog)

*   **Plugin System**: Allow 3rd party chart libraries.
*   **Team Sync**: P2P real-time collaboration.
*   **Cloudflare R2 Sync**: One-click publish.

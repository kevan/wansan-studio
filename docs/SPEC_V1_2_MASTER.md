# 🧠 Wansan Studio v1.2.0: The Analyst Update

> **Release Date**: 2024-12-24
> **Code Name**: "Analyst"
> **Core Value**: Performance meets Intelligence. From a static query tool to a context-aware, high-performance virtual analyst.

## 1. 🚀 Data Engine Re-architecture (性能核心)

We completely rewrote the ingestion pipeline to handle real-world business data with zero friction.

* **Streaming Ingestion (Major Upgrade)**:
* **Excel**: Switched to `ExcelJS` stream processing. Now supports **Million-row files (40MB+)** with instant parsing and minimal memory footprint.
* **Zero-Copy**: For CSV/JSON, DuckDB now reads directly from the disk, eliminating memory overhead.
* **Real-time Feedback**: Added a live progress indicator in the sidebar (e.g., "Processing... 15,200 rows") for large dataset imports.


* **Precision**: Fixed date recognition issues by implementing style-aware parsing (`styles: 'cache'`), ensuring Excel serial numbers convert correctly to `TIMESTAMP`.

## 2. 📐 Semantic Layer & Smart Metrics (语义层)

We bridged the gap between raw data and business logic.

* **AI Metric Generator**:
* **Natural Language to SQL**: Users can simply type "Calculate Gross Margin", and the **Expression-Only Agent** will infer the correct logic (`(revenue - cost) / revenue`) based on available columns.
* **Hybrid Refinement**: Supports mixing SQL and text instructions (e.g., "profit / sales excluding tax") for iterative formula building.


* **Virtual Views**: Introduced `DuckDBViewManager`. The system dynamically builds virtual views (`v_table`) for smart metrics, rebuilding only when logic changes to maximize query performance.

## 3. 🛡️ Intelligence Architecture (智能架构)

### 3.1 The "Sandwich Defense" Protocol

We restructured the AI System Prompt to ensure stability in a **BYOK** environment.

* **Structure**: Top-level Role -> **Domain Layer** (User Rules) -> **Protocol Layer** (Immutable JSON/SQL rules).
* **Business Domain Memory**: Users can define global rules (e.g., "Fiscal year starts in April"). The AI persists this context across sessions.

### 3.2 Shadow Prompt Mechanism

* **Feature**: Decoupled user-facing chat messages from AI instructions.
* **Use Case**: When users click "Focus", the UI shows "🔍 Focus: East", but the AI receives a strict constraint: `Filter by 'East'. Constraint: Maintain visualization type. No raw data.`.

## 4. ⚡ Interactive Exploration (交互体验)

* **Interactive Drill-down**: Charts are no longer static images. Click on any bar or pie sector to trigger a **Context Action Popover** for deep-diving into specific dimensions.
* **Execution Breakdown**: Added detailed timing stats to every report, distinguishing between **AI Thinking Time** and **DB Execution Time**.

## 5. 🛠️ UI/UX Polish (瑞士工艺)

* **SQL Lab**: Fixed editor persistence issues and cleaned up state logic for a smoother coding experience.
* **Smart Filters**: Upgraded to a Sidebar layout to support complex parameter sets, with "Quick Clear" functionality.
* **Swiss Style Inputs**: Standardized all input fields with subtle gray borders and brand-colored focus rings, replacing heavy default styles.

---

### 🔮 What's Next?

* **v1.3.0**: Breaking the local silo with Cloud Connectors (Postgres/MySQL) and Web Sharing.

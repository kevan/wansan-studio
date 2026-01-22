# 🧪 Wansan Studio: Possibilities & Idea Lab (未来可能性)

> **Status**: Living Document / Brainstorming
> **Vision**: A collection of high-potential ideas that are currently outside the immediate roadmap. These concepts range from UX innovations to deep infrastructure pivots.

---

## 🎨 1. Interaction & Interface (交互创新)

### 1.1 Voice-to-Dashboard (语音交互)
*   **Concept**: Since Wansan is a desktop app, it could support native system-level voice commands.
*   **Use Case**: "Hey Wansan, show me the sales trend for last quarter." Ideal for hands-free presentations or accessibility.
*   **Tech**: Web Speech API or Deepgram integration.

### 1.2 Immersive BI (空间计算)
*   **Concept**: 3D data visualization for VR/AR environments (e.g., Apple Vision Pro).
*   **Why**: Breaking the "flat screen" limit to visualize complex multi-dimensional clusters.

### 1.3 Command-Line Interface (Wansan CLI)
*   **Concept**: A CLI tool for developers to run local SQL analysis and generate Markdown reports from the terminal.
*   **Why**: Developer productivity and CI/CD integration for data reports.

---

## 🧠 2. Deep Intelligence (深度智能)

### 2.1 Local RAG (Row + Document Fusion)
*   **Concept**: Combine DuckDB rows with local unstructured documents (PDFs, Wiki, Emails).
*   **Use Case**: "Explain why sales dropped using the comments from the Q3 meeting minutes PDF."
*   **Tech**: Vector embeddings stored in DuckDB via `vss` or separate FAISS index.

### 2.2 Anomaly Auto-Detection (异常主动监测)
*   **Concept**: A background worker that "watches" the data and pushes alerts when it detects outliers or sudden shifts.
*   **Why**: Move from "Pull" (user asks) to "Push" (system notifies).

### 2.3 AI-Powered Data Cleaning (Wansan Prep)
*   **Concept**: A dedicated wizard where AI writes Python/JavaScript code to fix messy Excel files (e.g., un-merging cells, fuzzy deduplication).
*   **Why**: Data cleaning is 80% of the analyst's work.

---

## 🔗 3. Data Loop & Ecosystem (数据闭环与生态)

### 3.1 Reverse ETL (反向同步)
*   **Concept**: After finding insights, push data *back* to operational systems (e.g., HubSpot, Salesforce, Stripe).
*   **Use Case**: Identify "churn risk" users in Wansan -> Push them to a "Send Email" list in Mailchimp.

### 3.2 Visualization Plugin System
*   **Concept**: Allow users to import third-party React components or D3.js scripts as custom chart types.
*   **Why**: Building a community-driven visualization library (e.g., Funnels, Sankey, Heatmaps).

### 3.3 Template Market
*   **Concept**: A platform to share "Analysis Blueprints" (Schema + SQL logic) without sharing the actual data.
*   **Use Case**: A "SaaS Metrics" template that works instantly once the user maps their Stripe CSV.

---

## 🛡️ 4. Privacy & Infrastructure (隐私与基建)

### 4.1 E2EE Cloud Sync (端到端加密)
*   **Concept**: Use client-side encryption keys so even Cloudflare/AWS cannot read the `.wansan` project content.
*   **Why**: The ultimate privacy promise for enterprise users.

### 4.2 Local-First Collaboration (P2P)
*   **Concept**: Use WebRTC or Local Area Network (mDNS) to allow two analysts to work on the same DuckDB instance in real-time without a central server.
*   **Tech**: CRDT (Yjs) + Gun.js or Automerge.

### 4.3 Universal Connector Plugin
*   **Concept**: A WASM-based plugin system to support *any* data source (e.g., Notion, Google Sheets, Airtable) via community-written drivers.

---

## 🛠️ 5. Advanced DuckDB Magic (底层增强)

### 5.1 Geographic Analysis (PostGIS for DuckDB)
*   **Concept**: Use the `spatial` extension for deep geographic querying and map rendering.

### 5.2 Time-Machine (Snapshot Isolation)
*   **Concept**: Ability to revert the entire project state to any point in time, including data, charts, and chat history.

---

## 🌐 6. The Great Web Transformation (Strategic Pivot)

### 6.1 Wansan Web (SaaS Edition)
*   **Concept**: Porting the full experience to the browser (`app.wansan.io`). No download required.
*   **Architecture**: **Web-Native Local-First**.
    *   **Engine**: Replace `DuckDB Native` with **`duckdb-wasm`**.
    *   **Storage**: Use **OPFS** (Origin Private File System) for high-performance persistent storage in the browser.
*   **Why**:
    *   **Zero Friction**: Click link -> Start analyzing. The ultimate conversion funnel.
    *   **Virality**: "Share Link" is infinitely more powerful than "Download DMG".
*   **Challenges**:
    *   **Memory**: Browser WASM limit (2GB-4GB). Cannot handle massive datasets like Desktop.
    *   **Refactor**: Need to abstract `IDataEngine` to support both `Node/C++` (Desktop) and `WASM` (Web) implementations.

### 6.2 The "Figma Model"
*   **Strategy**: Maintain a unified codebase where Web is the default entry point, and Desktop is the "Pro Performance Wrapper".
*   **Sync**: Web version syncs via Cloudflare R2 to allow seamless transition to Desktop for heavy workloads.

---

## ☁️ 7. Wansan Cloud Services (The SaaS Path)

> These features represent a potential pivot towards a "Hybrid" or "SaaS" model, introducing server-side components to enhance connectivity.

### 7.1 Managed AI Gateway
*   **Concept**: A "Zero-Config" mode where users don't need their own OpenAI Key.
*   **Implementation**: Centralized gateway handling billing and routing to LLM providers.
*   **Value**: Lowers entry barrier for non-technical users.

### 7.2 Cloud Project Sync (BYOS)
*   **Concept**: Allow users to configure their own S3-compatible storage (Cloudflare R2, AWS S3) to sync projects across devices.
*   **Feature**: "One-Click Publish" to generate a shareable URL for Web Exports.

### 7.3 Web Viewer (Lite)
*   **Concept**: A server-side component to host and render `.wansan` project exports online, eliminating the need to download HTML files.

### 7.4 Team Collaboration
*   **Concept**: Multi-user access to shared project bundles with permission control (Viewer/Editor).
*   **Value**: Transforming Wansan from a personal tool to a team workspace.

### 7.5 Data Alerts
*   **Concept**: Server-side scheduling agent that checks local (or synced) data and sends emails/Slack notifications when metrics breach thresholds.

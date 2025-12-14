# 📘 00_ARCHITECTURE.md - System Overview & Core Patterns

> **Version**: 1.0 (Post-MVP Consolidation)
> **Status**: Authoritative / Stable
> **Scope**: High-level Architecture, Tech Stack, Process Model, Security.

---

## 1. Project Vision (愿景)

**Wansan (万三)** 是一款 **本地优先 (Local-First)** 的智能商业分析桌面软件。它旨在填补 Excel 与专业 BI 工具之间的鸿沟，让非技术人员通过自然语言对话，在不泄露数据隐私的前提下，快速生成专业级的商业报表。

### 1.1 Core Principles (核心原则)
1.  **Privacy First (隐私至上)**: 原始数据行 (Rows) 永远锁定在用户本地设备，仅 Schema (元数据) 用于 AI 推理。
2.  **Zero Latency (零延迟)**: 利用本地算力 (Local Compute) 进行数据处理，秒级响应大文件分析。
3.  **Ownership (所有权)**: 用户拥有数据、API Key 和生成的报告文件。

---

## 2. Technology Stack (技术栈)

我们采用了 **Electron + React + WASM** 的混合架构，以平衡开发效率、性能与跨平台稳定性。

### 2.1 App Shell (主进程)
*   **Runtime**: **Electron** (v28+ recommended for stability).
*   **Language**: TypeScript (Node.js environment).
*   **Build Tool**: `electron-builder` (supporting ASAR unpack for WASM).

### 2.2 Data Engine (数据引擎)
*   **Database**: **DuckDB-WASM** (`@duckdb/duckdb-wasm`).
    *   *Mode*: **Node Blocking Mode** (`duckdb-node-blocking`).
    *   *Reasoning*: 相比 Native Binding，WASM 提供了绝对的稳定性（无 SIGSEGV 崩溃）和跨平台一致性，牺牲约 20% 性能换取 100% 可靠性。
*   **Ingestion**: `xlsx` (SheetJS) for parsing Excel; `fs` streams for CSV.

### 2.3 Frontend (渲染进程)
*   **Framework**: **React 18** + **Vite**.
*   **UI System**: **Tailwind CSS** + **Shadcn UI** (Radix Primitives).
*   **State Management**:
    *   **Zustand**: 全局应用状态 (UI, Layout, Metadata).
    *   **TanStack Query**: 异步任务管理 (AI Request, SQL Execution).
*   **Visualization**: **Apache ECharts** (Canvas rendering).
*   **Layout Engine**: `react-resizable-panels` (分栏) + `react-grid-layout` (看板拖拽).

---

## 3. Process Architecture (进程架构)

Wansan 遵循严格的 **双进程分离 (Main-Renderer Separation)** 模型，通过 ContextBridge 安全通信。

```mermaid
graph TD
    subgraph "Main Process (Node.js)"
        Main[Main Controller]
        DB[(DuckDB WASM Instance)]
        FS[File System]
        AI[OpenAI API Client]
        
        Main <--> DB
        Main <--> FS
        Main <--> AI
    end

    subgraph "Renderer Process (React)"
        UI[User Interface]
        Store[Zustand Store]
        Chart[ECharts]
    end

    UI -- IPC (Invoke) --> Main
    Main -- IPC (Result/Error) --> UI
```

### 3.1 IPC Communication Pattern
*   **Render -> Main**: 仅发送 **指令** (e.g., `executeSQL`, `analyzeFile`)。
*   **Main -> Render**: 返回 **纯 JSON 数据**。
*   **Security**: 启用 `contextIsolation: true` 和 `nodeIntegration: false`。

---

## 4. UI Framework: The Analyst Workbench (工作台架构)

我们摒弃了传统的 Chatbot 布局，采用了专业的 **三栏式工作台 (3-Column Workbench)** 设计。

### 4.1 Layout Structure
```text
[ Sidebar (250px) ]  |  [ Chat Stream (450px) ]  |  [ Dashboard Canvas (Flex) ]
-------------------  |  -----------------------  |  ---------------------------
- Project Data       |  - Interaction            |  - Deliverable Results
- File Tree          |  - Logic Reasoning        |  - Grid Layout (RGL)
- Schema Editor      |  - Intermediate Charts    |  - A4 / Screen Mode
```

### 4.2 View Modes
1.  **Draft Mode (Chat Focused)**: 用户在中间栏探索数据，右侧看板可折叠。
2.  **Dashboard Mode (Result Focused)**: 右侧看板全屏，中间栏折叠，用于演示或排版。

---

## 5. Persistence Strategy (持久化策略)

为了 MVP 的敏捷性，我们采用了 **混合持久化** 方案。

### 5.1 Metadata Persistence
*   **Mechanism**: `zustand/middleware/persist`.
*   **Storage**: `LocalStorage`.
*   **Content**:
    *   `wansan-files`: 文件路径、Schema 缓存、关联关系。
    *   `wansan-chat`: 完整的对话历史（含缓存的图表数据）。
    *   `wansan-workbench`: 看板布局配置。

### 5.2 Data Session Recovery (Re-Ingestion)
由于 DuckDB 运行在内存模式，应用重启后数据会丢失。
*   **Solution**: **Auto Re-ingest**.
*   **Flow**:
    1.  App Launch -> Hydrate Zustand Stores.
    2.  Check `files` list.
    3.  Silently trigger `reIngestFile(path)` for all files in background.
    4.  UI shows "Restoring Session..." until DB is ready.

---

## 6. Security & Privacy (安全与隐私)

### 6.1 Schema-Only Protocol
*   **Rule**: 严禁将 `SELECT *` 或具体数据行发送给 LLM。
*   **Implementation**: Prompt 仅包含 `Table Name`, `Column Name`, `Column Type`。

### 6.2 BYOK (Bring Your Own Key)
*   **Policy**: Wansan 不提供内置 AI 服务。用户必须在设置中配置自己的 OpenAI/DeepSeek API Key。
*   **Storage**: API Key 存储在本地 `electron-store` (加密文件)，不经过我们的服务器。

### 6.3 Network Sandbox
*   **Whitelist**: Electron 仅允许连接到用户配置的 AI Endpoint (e.g., `api.openai.com`)。所有其他外部请求（除 License 验证）均被拦截。

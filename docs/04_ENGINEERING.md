# 📓 04_ENGINEERING.md - Build, i18n & Engineering

> **Version**: 1.3
> **Status**: Authoritative
> **Scope**: Build Config, Temp Management, i18n.

---

## 1. Build System (构建系统)

v1.3 移除了 WASM 复杂性，转向 Native Node Modules。

### 1.1 `electron-builder` Configuration
*   **Target**: Mac (`.dmg`), Windows (`.nsis`).
*   **ASAR Unpack**:
    *   `node_modules/@duckdb/node-api`: 必须解包以加载 `.node` 二进制文件。
    *   `resources/`: 静态资源。

### 1.2 Multi-Process Model
*   **Main**: 窗口管理，IPC 路由。
*   **Renderer**: React UI。
*   **Utility (DB Service)**: 承载 DuckDB 实例。
*   **Worker (Excel)**: `child_process.fork` 运行 ExcelJS 流式解析，防止主线程卡顿。

---

## 2. Resource Management (资源管理)

### 2.1 TempFileManager (`src/main/utils/temp-manager.ts`)
为了防止临时文件泄漏，我们实施了严格的生命周期管理。

*   **Directory**: 所有临时文件存放在系统临时目录的 `wansan-studio` 子文件夹中。
*   **Lifecycle**:
    *   **Runtime**: 任务完成（成功或取消）后立即删除。
    *   **Boot**: 应用启动时，自动清空整个子文件夹，处理意外退出的残留。

---

## 3. Internationalization (i18n)

### 3.1 Architecture
*   **Stack**: `i18next`.
*   **Namespaces**: `common` (UI), `analysis` (Data), `project` (Launcher/Migration).
*   **Storage**: `useSettingsStore` (Persisted).

### 3.2 AI Localization
*   **Prompt Injection**: 系统根据当前 UI 语言，动态注入 `OUTPUT_RULE`，强制 AI 使用目标语言生成 Summary 和 Title。

---

## 4. Development Guidelines

### 4.1 Code Style
*   **State**: Zustand for global state.
*   **Styling**: Tailwind CSS + Shadcn UI.
*   **Constants**: Use `src/renderer/src/lib/constants.ts` for shared configs (e.g., `COLUMN_TYPE_CONFIG`).

### 4.2 Type Safety
*   **Rule**: All IPC payloads must be typed in `src/shared/electron-api.ts`.
*   **Strictness**: No `any` in core logic. Use `zod` for AI response validation.

---

## 5. Engine Tuning & Limits (性能治理)

基于企业级 SaaS 的经验 (`SPEC_DUCKDB_REPORT.md`)，我们在本地引擎中实施以下限制以保护用户设备。

### 5.1 Memory Governance
*   **Limit**: DuckDB operates on off-heap memory. We should set `SET memory_limit='75%'` (of system RAM) on startup to prevent OS freezing.
*   **Spilling**: Ensure `temp_directory` points to a valid, writable disk path. This allows DuckDB to process datasets larger than RAM by spilling intermediate results to disk.

### 5.2 Resilience
*   **Timeout**: Queries should have a soft timeout (e.g., 600s) to allow users to cancel runaway analytical queries without restarting the app.
*   **Big Result**: Queries returning >1M rows should trigger a warning or switch to "Export Mode" instead of trying to render in the UI.
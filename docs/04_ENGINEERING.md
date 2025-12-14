这是 **Project Wansan 架构全书** 的最后一卷。这份文档关注于让项目“落地”的关键细节——如何构建、如何支持多语言以及如何保证用户数据的持久性。

请保存为 `docs/04_ENGINEERING.md`。

---

# 📓 04_ENGINEERING.md - Build, i18n & Persistence

> **Version**: 1.0
> **Status**: Authoritative
> **Scope**: Electron Builder, WASM Config, i18n, Session Recovery.

---

## 1. Build System (构建系统)

构建是本项目的最大挑战。我们必须确保 DuckDB-WASM 在 Electron ASAR 打包后依然能被正确加载。

### 1.1 `electron-builder` Configuration
**Target**: Mac (`.dmg`), Windows (`.nsis`).

```yaml
# electron-builder.yml
asarUnpack:
  - "node_modules/@duckdb/duckdb-wasm" # CRITICAL: WASM cannot run from ASAR
  - "**/*.wasm"

files:
  - "!**/node_modules/@duckdb/duckdb-wasm/dist/*eh*" # Optimization: Exclude EH bundles
  - "dist"
  - "dist-electron"
```

### 1.2 WASM Path Resolution
在生产环境中，`__dirname` 指向 ASAR 内部。我们需要使用 `app.isPackaged` 判断逻辑来修正路径。
*   **Dev**: 直接解析 `node_modules`。
*   **Prod**: 解析 `resources/app.asar.unpacked/node_modules/...`。

---

## 2. Internationalization (i18n)

我们实现了 **Full-Stack i18n** (UI + AI)。

### 2.1 UI Localization
*   **Stack**: `i18next`, `react-i18next`.
*   **Namespaces**:
    *   `common`: General UI (Buttons, Menus).
    *   `analysis`: Chat & Chart labels.
*   **Storage**: Language preference (`en` | `zh`) persisted in `useWorkbenchStore`.

### 2.2 AI Output Localization
为了防止 AI 用英文回答中文提问，我们在 **System Prompt** 中注入了动态指令：
> "User Language: ${lang}. OUTPUT RULE: The 'summary', 'title' and 'reasoning' fields MUST be in ${lang}."

---

## 3. Persistence & Session Recovery (持久化与恢复)

### 3.1 Hybrid Persistence Strategy
*   **Zustand Persist**: 用于存储 UI 状态（Chat History, File Metadata, Layout）。
    *   *Storage*: `LocalStorage`.
*   **DuckDB Rehydration**: 用于恢复数据状态。
    *   *Why*: DuckDB runs in Memory.
    *   *How*: On app launch, `useSessionRecovery` hook iterates through the file list and re-runs the ingestion pipeline silently.

### 3.2 Integrity Checks
*   **Duplicate Check**: 防止导入相同路径的文件。
*   **Schema Sync**: 如果源文件在关闭期间被修改，Re-ingest 过程会更新 Schema，并在 UI 上标记 `Out of Sync`。

---

## 4. Settings & Configuration (设置)

### 4.1 BYOK Architecture
*   **API Key**: Stored in `electron-store` (encrypted file on disk). Never synced to our servers.
*   **Proxy**: Support custom `Base URL` for users in restricted regions.

### 4.2 Reset Mechanism
*   **DevTools**: Exposed `window.resetApp()` to nuke all LocalStorage and restart, useful for debugging state corruption.

---

## 5. Development Guidelines (开发指南)

### 5.1 Code Style
*   **State**: Always use `Zustand` for global state. Avoid Context API unless necessary.
*   **Async**: Always use `TanStack Query` for data fetching.
*   **Components**: Stick to `Shadcn UI`. Do not introduce new CSS frameworks.

### 5.2 Contribution Workflow
1.  **Feat**: Create a `SPEC_*.md` first.
2.  **Code**: Implement backend logic -> Store -> UI.
3.  **Verify**: Check "Auto-Fix" loop and "Export" consistency.

---

**(End of Engineering Spec)**

至此，**Project Wansan 架构全书** 已全部生成完毕。这 5 份文档构成了项目的完整技术蓝图。祝您的项目维护顺利！🚀

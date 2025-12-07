# Gemini Code Assistant Context

This document provides instructional context about the Wansan Studio project for the Gemini Code Assistant.

## Project Overview

Wansan Studio is a "local-first" business intelligence desktop application. It allows users to import data from files like Excel and CSV, and then use a natural language interface to generate reports and visualizations. The core architecture is built on Electron, ensuring that all data processing happens locally on the user's machine for privacy and security.

### Core Technologies

*   **Application Framework**: [Electron](https://www.electronjs.org/)
*   **Frontend**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/) for building.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Data Engine**: [DuckDB](https://duckdb.org/) (run in the main process for fast, local analytical queries).
*   **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) and [TanStack Query](https://tanstack.com/query/latest) for server state management.

### Architecture

The application follows a standard Electron architecture with three main parts:

1.  **Main Process (`src/main`)**: The Node.js backend of the application. It manages the application lifecycle, creates browser windows, handles native OS integrations, and runs the DuckDB database service.
2.  **Renderer Process (`src/renderer`)**: The React-based user interface. This is the web content that runs inside an Electron `BrowserWindow`. It communicates with the Main process via a secure preload script.
3.  **Preload Script (`src/preload`)**: A script that runs in a privileged context, acting as a secure bridge between the Renderer (web content) and the Main (Node.js) process. It exposes specific APIs from the Main process to the UI using `contextBridge`.

## Building and Running

The project uses `npm` for package management and scripts.

### Development

To run the application in a development environment with hot-reloading:

```bash
npm run dev
```

This command concurrently starts the Vite development server for the renderer process and runs the Electron application.

### Building for Production

To build the application's source code:

```bash
npm run build
```

This transpiles the TypeScript code for both the main and renderer processes into JavaScript and places it in the `dist` directory.

### Packaging for Distribution

To package the application into a distributable format (e.g., `.dmg` for macOS, `.exe` for Windows):

```bash
# For macOS
npm run dist:mac

# For Windows
npm run dist:win

# Generic distribution
npm run dist
```

These commands first run the `build` script and then use `electron-builder` to create the final application package.

## Development Conventions

### Code Style and Formatting

*   **Linting**: The project uses ESLint to enforce code quality. To run the linter:
    ```bash
    npm run lint
    ```
*   **Formatting**: [Prettier](https://prettier.io/) is used for automatic code formatting. To format the entire codebase:
    ```bash
    npm run format
    ```
*   **Type Checking**: To run the TypeScript compiler and check for type errors without emitting files:
    ```bash
    npm run type-check
    ```

### Communication: Main <> Renderer

Communication between the main and renderer processes is handled via Electron's Inter-Process Communication (IPC).

*   **Setup**: The main process defines which channels to listen on in `src/main/services/ipc.ts`.
*   **Exposure**: A secure API is exposed to the renderer process via `window.electronAPI` in `src/preload/index.ts`.
*   **Usage**: The renderer process uses the exposed API, likely through the `src/renderer/hooks/useIPC.ts` hook, to call main process functions and receive data.

### Path Aliases

The project uses path aliases in `tsconfig.json` and `vite.config.ts` for cleaner import statements:

*   `@/`: Maps to `src/renderer/`
*   `@shared/`: Maps to `src/shared/`
*   `@types/`: Maps to `src/types/`

## Session Summary: AI API 增强与测试框架迁移 (2025-12-07)

本次会话中，我们对 Wansan Studio 进行了多项关键改进和现代化升级：

### 📈 AI API 增强 (Bring Your Own Key - BYOK)

*   **灵活配置**: 实现了对第三方 OpenAI 兼容 API 的完整支持，用户现在可以配置自定义的 `API Key`、`Base URL` 和 `Model`。
    *   **核心文件**: `src/main/engine/ai-bridge.ts`, `src/main/services/ai.ts`
    *   **实现细节**:
        *   `ai-bridge.ts` 中的 `getOpenAI` 函数现在支持动态的 `apiKey` 和 `baseURL`。
        *   引入了 `setAIConfig` 函数来集中管理 `apiKey`、`baseURL` 和 `model` 的更新。
        *   `generateAnalysis` 和 `inferRelationships` 函数现在使用可配置的 `currentModel`。
*   **配置持久化**: 通过集成 `electron-store`，AI 配置（`apiKey`, `baseURL`, `model`）现在可以跨应用会话持久化。
    *   **核心文件**: `src/main/services/ai.ts`
    *   **实现细节**: `AIService` 负责从 `electron-store` 加载、保存和应用 AI 配置。
*   **环境变量支持**: `OPENAI_BASE_URL` 和 `OPENAI_MODEL` 已添加到 `.env.example`，并且应用会优先使用用户配置或环境变量中的值。
*   **IPC 暴露**: 新增了 `get-ai-config` 和 `set-ai-config` IPC 通道，以便前端 UI 能够获取和更新 AI 配置。
    *   **核心文件**: `src/main/services/ipc.ts`, `src/preload/index.ts`, `src/renderer/hooks/useIPC.ts`

### 🧪 单元测试框架迁移与增强

*   **引入 Vitest**: 将测试框架从一次性脚本迁移到现代的 [Vitest](https://vitest.dev/)。
    *   **核心文件**: `package.json`, `vitest.config.ts`
    *   **实现细节**:
        *   安装 `vitest` 并创建 `vitest.config.ts`，配置了 Node.js 测试环境、别名解析和更长的测试超时时间（30秒）。
        *   `package.json` 中的 `test` 脚本已更新为 `vitest --run`，确保测试在完成后退出，而非进入监听模式。
*   **鲁棒性测试重构**:
    *   将 `scripts/test-robustness.ts` 的逻辑重构为标准的 Vitest 测试套件 `src/main/engine/__tests__/robustness.test.ts`。
    *   **修复了 ESM 兼容性问题**: 解决了 `duckdb` 和 `fs-extra` 在 ESM 模块导入中的 `SyntaxError` 和 `TypeError`，确保后端核心功能在 ESM 环境下正常运行。
    *   **端到端 AI 验证**: 移除了 AI Key 缺失时的 Mock 逻辑，强制进行真实的 AI 调用，验证 AI 生成的 SQL 在 DuckDB 中的执行。
    *   **增强数据验证**: 在测试中引入了更精细的数据断言，利用 AI 返回的 `viz_config` 动态验证 SQL 聚合结果的正确性。
*   **多表关联测试**: 新增了对多表关联功能（`inferRelationships` 和多表 `generateAnalysis`）的测试。
    *   **核心文件**: `src/main/engine/__tests__/robustness.test.ts`
    *   **实现细节**: 模拟了 `orders.xlsx` 和 `customers.xlsx` 两个文件的导入，断言 `inferRelationships` 能正确识别 `customer_id` 到 `id` 的关联，并验证 AI 生成的多表 JOIN 查询结果的准确性。

### 现代化与兼容性改进

*   **ESM 迁移**: 将整个项目的主进程构建环境迁移到 ESM 模块系统。
    *   **核心文件**: `package.json` (`"type": "module"`), `.eslintrc.js` (重命名为 `.eslintrc.cjs`), `tsconfig.main.json`
    *   **实现细节**: 调整了 TypeScript 编译配置 (`module: NodeNext`, `moduleResolution: NodeNext`)。
*   **构建工具升级**: 将主进程的构建工具从 `tsc` 切换到 `tsup`，以更好地处理 ESM 模块的打包和兼容性问题，并自动处理 `__dirname` 和 `__filename` 的 shim。
    *   **核心文件**: `package.json` (`build:main` 脚本), `tsup.config.ts`

## 会话摘要：语义化表格命名 (2025-12-07)

本次会话的主要目标是改进 Wansan Studio 的表格命名机制，使其从随机命名变为基于文件名的语义化命名，从而提升 LLM 对数据上下文的理解。

### 核心改进点：

*   **`TableSchema` 更新**: 在 `src/shared/types.ts` 中的 `TableSchema` 接口中添加了可选字段 `description`，用于存储原始的用户友好型文件名。
    *   **涉及文件**: `src/shared/types.ts`
*   **摄取逻辑 (Ingestion Logic) 更新**:
    *   在 `src/main/engine/ingestion.ts` 中新增了 `getUniqueTableName` 辅助函数。该函数负责：
        *   将文件名（不含扩展名）进行 SQL 安全处理，包括添加 `t_` 前缀，将空格和特殊字符替换为下划线，并支持中文字符。
        *   通过查询 DuckDB 数据库确保生成的表名唯一性，并在冲突时追加数字后缀（如 `_1`）。
    *   更新了 `ingestExcelFile` 和 `parseCSVFile` 函数 (在 `src/main/services/file.ts` 中调用)，使其能够接受原始文件名作为参数，并利用 `getUniqueTableName` 生成语义化表名，同时将原始文件名作为 `description` 字段存储。
    *   **涉及文件**: `src/main/engine/ingestion.ts`, `src/main/services/file.ts`
*   **AI 桥接 (AI Bridge) 更新**:
    *   修改了 `src/main/engine/ai-bridge.ts` 中的 `serializeSchemas` 函数。在向 LLM 传递表格 Schema 上下文时，现在会包含 `(Source: "文件名")` 这样的描述，以增强 AI 对数据来源的理解。
    *   **涉及文件**: `src/main/engine/ai-bridge.ts`

### 验证:

*   **单元测试**: 更新了 `src/main/engine/__tests__/robustness.test.ts` 中的 `ingestExcelFile` 调用，使其符合新的函数签名。
*   **测试结果**: 运行 `npm test src/main/engine/__tests__/robustness.test.ts` 后，所有测试均通过，确认了语义化命名和上下文传递的正确性，以及 AI 功能的持续稳定。
*   **类型检查**: 运行 `npm run type-check`，确认没有新的 TypeScript 类型错误引入。

### 成果:

现在，Wansan Studio 在数据摄取过程中能够从文件名派生出更具业务意义的表格名称，并将这些名称及其原始文件名作为重要上下文传递给 AI 模型，从而显著提升了 AI 理解用户查询和生成准确 SQL 的能力。

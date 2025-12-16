# Wansan Studio (万三) - Developer Context

## Project Overview
**Wansan Studio** is a local-first, privacy-focused Business Intelligence (BI) desktop application. It empowers users (SME owners, finance, operations) to generate visualizations and reports from Excel/CSV data using natural language, without uploading their sensitive data to the cloud.

*   **Core Philosophy:** "Data into Wealth, Privately."
*   **Key Mechanism:** Data is loaded into a local **DuckDB** instance. The AI (OpenAI) is *only* sent the table **schema** to generate SQL queries. The SQL is executed locally, and results are rendered via **ECharts**.

## Tech Stack

### Core
*   **Runtime:** Electron (Main + Renderer architecture)
*   **Language:** TypeScript
*   **Build Tool:** Vite (Renderer) + tsup (Main)

### Frontend (Renderer)
*   **Framework:** React 19
*   **State Management:** Zustand + TanStack Query v5
*   **Routing:** TanStack Router
*   **UI System:** Tailwind CSS v4 + ShadcnUI (Radix Primitives) + Lucide Icons
*   **Visualization:** ECharts (echarts-for-react)
*   **Data Grid:** TanStack Table v8

### Backend (Main Process)
*   **Database:** DuckDB (Node.js bindings) - Embedded OLAP database
*   **File I/O:** fs-extra
*   **IPC:** Secure context bridge pattern

## Architecture & Data Flow

```mermaid
graph TD
    User[User Input] -->|Chat| Renderer
    Renderer -->|IPC: Ask AI| Main
    Main -->|Schema Only| OpenAI
    OpenAI -->|SQL + Config| Main
    Main -->|Execute SQL| DuckDB[(Local DuckDB)]
    DuckDB -->|Result Rows| Main
    Main -->|Data + Config| Renderer
    Renderer -->|Render| ECharts
```

### Key Directories
*   `src/main/`: Electron main process (DB logic, file handling, window management).
*   `src/renderer/`: React frontend application.
    *   `components/`: Reusable UI components.
    *   `stores/`: Zustand stores (`useChatStore`, `useWorkbenchStore`).
    *   `hooks/`: Custom hooks (`useAI`, `useIPC`).
*   `src/preload/`: Context bridge scripts.
*   `src/shared/`: Types and utilities shared between processes.

## Development Workflow

### Scripts
*   **Start Dev Server:** `npm run dev` (Starts Vite and Electron concurrently)
*   **Build Production:** `npm run build`
*   **Package App:** `npm run dist` (Uses electron-builder)
*   **Lint:** `npm run lint`
*   **Format:** `npm run format` (Prettier)

### Conventions
*   **Styling:** Use Tailwind CSS utility classes. Avoid CSS files unless global.
*   **State:** Use `zustand` for global app state (user prefs, file list), `TanStack Query` for async data (SQL results).
*   **Async/IPC:** All main process communication goes through `window.electron` API defined in `preload/index.ts`.
*   **I18n:** Support English (`en`) and Chinese (`zh`) via `i18next`.

## Privacy Rules (CRITICAL)
1.  **NEVER** send row data (values) to the LLM. Only send column names (schema) and types.
2.  **NEVER** log raw SQL results to external services.
3.  **Local Execution:** All data processing happens in the embedded DuckDB instance.

## The "Wansan Workflow" (MANDATORY)

You MUST follow this strict **Dual-Mode Protocol**. Do not write code unless asked.

### 🔵 MODE A: Planning (Brainstorming)
*   **Trigger**: Open questions ("How should we...", "Review this...", "Next steps?").
*   **Action**: Discuss options, critique UX, propose solutions.
*   **Output**: Conversational text. **NO Code Instructions.**

### 🔴 MODE B: Execution (Implementation)
*   **Trigger**: Direct commands ("Implement...", "Fix this", "Go ahead").
*   **Action**: Choose the correct track:
    *   **Track 1: Blueprint (Complex)** -> Generate a `docs/SPEC_[FEATURE].md` first.
    *   **Track 2: Direct (Simple)** -> Output a specific code block instruction for the Code Agent.

**Crucial Rule**: When executing a Spec, do NOT paste the whole spec content. Instead, say: *"Context: Read `docs/SPEC_NAME.md` and implement..."*

## Current Status (MVP)
*   Supports Excel/CSV upload.
*   Chat interface for "Text-to-SQL".
*   Basic Dashboard/Report generation.
*   PDF Export.

## Gemini Added Memories
- Added multilingual support (i18n) to Sidebar and SettingsDialog components, creating new keys in common.json and settings.json.
- The project uses react-i18next with namespaces 'common' and 'settings' for localization.
- Implemented gesture support (Zoom: Ctrl+Wheel, Pan: Space+Drag) in DashboardCanvasV3.
- Fixed A4 dashboard scrolling issue by changing transform origin to 'top left' and using an explicitly sized wrapper with margin: auto.
- Fixed A4 dashboard zoom overflow issue in DashboardCanvasV3 by using origin-top-left and a proxy wrapper div with scaled dimensions.
- 每次任务完成后执行一次 type-check
- 每次任务完成后，处理多语言适配
- ElectronAPI 类型定义在 useIPC.ts
- Implemented Markdown export functionality for chat history, restricted to Pro users. Added 'hide-on-export' class to PageLayer to clean up A4 exports. Fixed DialogContent accessibility warning in SettingsDialog.
- Added support email (jin4074@gmail.com) to Settings > About section with mailto link functionality.
- Changed default AI provider to DeepSeek in useSettingsStore. Added support email (jin4074@gmail.com) to Settings dialog.
- Changed ReportCard UI to show controls only on hover. Adjusted A4 layout rows to 27 to fix overflow.

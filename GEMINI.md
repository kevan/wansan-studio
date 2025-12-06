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

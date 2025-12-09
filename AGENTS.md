# Repository Guidelines

## Project Structure & Module Organization
- `src/main`: Electron main process, app bootstrap, packaging entry; keep IPC handlers minimal and typed.
- `src/preload`: Bridge definitions for the renderer; add new API surfaces here with explicit channel whitelists.
- `src/renderer`: React UI (TanStack Router/Query, Tailwind utilities), components and pages; `utils` holds helpers like export logic; `stores` houses Zustand state.
- `public`/`assets`: Static files; prefer importing assets from `public` when needed at runtime.
- `docs`: Specs and contributor notes; update when changing behaviors.
- `dist`/`release`: Build outputs (generated); do not edit manually.

## Build, Test, and Development Commands
- `npm run dev`: Run Vite renderer and Electron main concurrently for local development.
- `npm run build`: Production build for renderer (`vite build`) and main (`tsup`).
- `npm run dist` / `dist:mac` / `dist:win`: Package installers via electron-builder.
- `npm test`: Run Vitest in run mode; ensure new logic has coverage.
- `npm run lint` / `lint:fix`: ESLint across `src`; use `lint:fix` before committing.
- `npm run type-check`: TypeScript `--noEmit` sanity check; run when touching types or IPC contracts.
- `npm run format`: Prettier sweep for source and docs.

## Coding Style & Naming Conventions
- TypeScript-first with ES modules; 2-space indent; prefer const, arrow functions, and explicit return types in shared utilities.
- React: functional components, hooks-only state; keep components small and co-locate styles/hooks next to usage.
- Naming: components in `PascalCase`, hooks `useSomething`, helper modules `camelCase`; file extensions `.ts`/`.tsx`.
- Styling: Tailwind utility classes; avoid inline styles except for dynamic layout needs.

## Testing Guidelines
- Framework: Vitest. Add `.test.ts`/`.test.tsx` near implementation or under `src/__tests__`.
- Cover data transforms, store logic, and export helpers; mock Electron APIs in renderer tests.
- Keep tests deterministic; seed sample data for chart/layout cases.

## Commit & Pull Request Guidelines
- Commits in repo history are short, imperative summaries (e.g., `resize`, `export`); follow that tone and keep scope tight.
- PRs should include: brief description of behavior change, linked issue/task, before/after notes or screenshots for UI, and test/lint results (`npm test`, `npm run lint`, `npm run type-check`).
- Call out any platform-specific impacts (mac/win packaging) and new environment variables or IPC channels.

# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript UI (Vite). Source in `frontend/src/` with components grouped by domain (e.g., `frontend/src/components/diff/`, `frontend/src/components/sidebar/`).
- `core/`: Node + TypeScript backend (Express). Source in `core/src/` with feature folders (e.g., `core/diffs/`).
- `tsconfig.base.json`: Shared TypeScript compiler options for all packages.
- `bun.lock`: Workspace lockfile at repo root.

## Architecture Overview
- `core` computes diffs and serves them over HTTP (Express on `:3001`).
- `frontend` renders diffs with `@pierre/diffs` and consumes `core` via fetch.
 - Review panel modes:
   - Explain: general chat that knows the open diff and can answer about the whole commit too.
   - Quiz: evaluates the entire change set (not just the currently open diff).

## Build, Test, and Development Commands
- Use Bun for all installs and scripts (do not use npm/yarn/pnpm).
- `bun install`: Install all workspace dependencies at the repo root.
- `bun --cwd frontend run dev`: Start the Vite dev server (default `http://localhost:5173`).
- `bun --cwd core run dev`: Start the Express server (default `http://localhost:3001`).
- `bun --cwd frontend run build`: Type-check and build the frontend.

## Coding Style & Naming Conventions
- TypeScript everywhere. Keep files ASCII-only unless required.
- Indentation: 2 spaces in JSON, 2 spaces in TS/TSX (default for Vite/ESLint).
- Components: `PascalCase` filenames and exports (e.g., `DiffViewer.tsx`).
- Feature folders: `kebab-case` or short nouns (e.g., `components/diff/`, `components/chat/`).
- Prefer small, focused components and explicit props.

## Testing Guidelines
- No test framework is configured yet. When adding tests, keep them close to code:
  - Frontend: `frontend/src/**/__tests__/*.test.tsx`
  - Backend: `core/src/**/__tests__/*.test.ts`
- Add a script in the relevant `package.json` (e.g., `bun test`) when introducing tests.

## Commit & Pull Request Guidelines
- No established commit convention yet. Use clear, scoped messages:
  - Example: `feat(frontend): add diff viewer scaffold`
- PRs should include:
  - Brief description of changes and motivation.
  - Screenshots for UI changes.
  - Linked issue or task if applicable.

## Configuration & Environment
- Backend port: `PORT` (default `3001`).
- Frontend expects the backend at `http://localhost:3001`.
- Keep secrets out of git; use `.env` files when needed.

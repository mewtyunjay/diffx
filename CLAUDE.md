# CLAUDE.md

This file provides context for AI assistants working with the diffx codebase.

## Project Overview

**diffx** is a real-time git diff viewer application. It watches a git repository for changes and displays diffs in a web UI with split/unified view modes.

## Architecture

Monorepo with two packages:

- **core/** - Express backend server (port 3001)
- **frontend/** - React + Vite frontend (port 5173)

## Commands

```bash
# Install dependencies
bun install

# Run frontend dev server
bun run dev

# Run backend server
bun run dev:core

# Run both (in separate terminals)
bun run dev:frontend
bun run dev:core
```

## Configuration

Create a `.env` file in the root with:
```
DIFF_REPO_PATH=/path/to/repo/to/watch
```

## Key Files

### Core (Backend)
- `core/src/index.ts` - Express server setup, API routes
- `core/src/diffs/watcher.ts` - File watcher using chokidar, debounced refresh
- `core/src/diffs/gitDiff.ts` - Executes `git diff` commands

### Frontend
- `frontend/src/App.tsx` - Main app, state management, polling logic
- `frontend/src/components/diff/DiffViewer.tsx` - Diff rendering with split/unified toggle
- `frontend/src/components/sidebar/Sidebar.tsx` - File list with change counts

## Dependencies

- **@pierre/diffs** - Git diff parsing and React components for rendering
- **chokidar** - File system watcher
- **express** - Backend server

## API Endpoints

- `GET /health` - Health check
- `GET /diffs/latest` - Returns `{ patch: string, updatedAt: string }`

## Development Notes

- Frontend polls `/diffs/latest` every 1 second
- Watcher debounces file changes by 150ms before computing new diff
- Ignored paths: dotfiles, node_modules, dist, build

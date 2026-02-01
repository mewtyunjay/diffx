# CLAUDE.md

This file provides context for AI assistants working with the diffx codebase.

## Project Overview

**diffx** is a real-time git diff viewer application with AI-powered features. It watches a git repository for changes, displays diffs in a web UI with split/unified view modes, and provides AI-powered code review, explanations, quizzes, and commit message generation.

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
OPENAI_API_KEY=your-openai-api-key
```

## Key Files

### Core (Backend)
- `core/src/index.ts` - Express server setup, API routes
- `core/src/diffs/watcher.ts` - File watcher using chokidar, debounced refresh
- `core/src/diffs/gitDiff.ts` - Executes `git diff` commands
- `core/src/routes/ai.ts` - AI feature endpoints (explain, quiz, code review, commit message)
- `core/src/services/ai/codexClient.ts` - OpenAI/Codex client wrapper
- `core/src/services/ai/codeReview.ts` - Multi-agent code review system
- `core/src/services/ai/commitMessage.ts` - AI commit message generation

### Frontend
- `frontend/src/App.tsx` - Main app, state management, polling logic
- `frontend/src/components/diff/DiffViewer.tsx` - Diff rendering with split/unified toggle
- `frontend/src/components/sidebar/Sidebar.tsx` - File list with staged/unstaged sections, commit/push actions
- `frontend/src/components/sidebar/Accordion.tsx` - Collapsible accordion component
- `frontend/src/components/settings/SettingsDrawer.tsx` - Settings panel for AI features
- `frontend/src/utils/settings.ts` - Settings types and persistence

## AI Features

### Multi-Agent Code Review
The code review system uses 3 specialized agents running in parallel:
- **Bug Hunter Agent** - Detects logic errors, null references, race conditions, resource leaks
- **Security Agent** - Identifies OWASP Top 10 vulnerabilities, hardcoded secrets, injection risks
- **Quality Agent** - Checks code readability, DRY violations, naming conventions, performance

A summary agent then aggregates findings and generates a concise review summary.

### Commit Message Generation
Auto-generates commit messages with options:
- **Follow Previous Style** - Analyzes recent commit messages via `git log` and matches the style
- **Style Options** - Conventional commits, descriptive, or simple
- **Include Body** - Option to add detailed body text
- **Custom Rules** - User-defined instructions

### Explain Feature
AI-powered explanations of diff changes with configurable:
- Scope (file or full diff)
- Tone (concise, balanced, detailed)
- Format (bullets or paragraphs)
- Risk highlighting and next steps

### Quiz Feature
Generates quizzes about the code changes with:
- Configurable question count and difficulty
- Focus areas: comprehension, edge cases, style, bug hunting
- Optional explanations in results

## Settings System

Settings are persisted to localStorage and include:
- Explain settings (scope, tone, format, custom instructions)
- Quiz settings (question count, difficulty, focus, custom rules)
- Commit message settings (follow previous style, style, include body, custom rules)

## Dependencies

- **@pierre/diffs** - Git diff parsing and React components for rendering
- **chokidar** - File system watcher
- **express** - Backend server
- **openai** - OpenAI API client for AI features

## API Endpoints

### Diff Endpoints
- `GET /health` - Health check
- `GET /diffs/latest` - Returns `{ staged: string, unstaged: string, updatedAt: string }`

### Git Endpoints
- `POST /git/stage` - Stage a file. Body: `{ filePath: string }`
- `POST /git/unstage` - Unstage a file. Body: `{ filePath: string }`
- `POST /git/commit` - Create a commit. Body: `{ message: string }`
- `POST /git/push` - Push to remote

### AI Endpoints
- `POST /ai/review` - Explain diff changes. Body: `{ question?: string, scopePreference, tone, format, ... }`
- `POST /ai/quiz` - Generate quiz. Body: `{ questionCount, difficulty, focus, ... }`
- `POST /quiz/results` - Submit quiz answers. Body: `{ quizId, answers }`
- `POST /ai/commit-message` - Generate commit message. Body: `{ commitConfig: { followPreviousStyle, style, includeBody, customRules } }`
- `POST /ai/code-review` - Run multi-agent code review. Body: `{ enableBugHunter?, enableSecurity?, enableQuality? }`

## Development Notes

- Frontend polls `/diffs/latest` every 1 second
- Watcher debounces file changes by 150ms before computing new diff
- Ignored paths: dotfiles, node_modules, dist, build
- AI agents run in parallel using `Promise.all()` for faster reviews
- Commit message style matching fetches last 10 commits via `git log`

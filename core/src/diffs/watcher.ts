import chokidar from 'chokidar'

import { getGitDiff, getGitDiffStaged } from './gitDiff'

type DiffSnapshot = {
  unstaged: string
  staged: string
  updatedAt: string
}

let latest: DiffSnapshot = {
  unstaged: '',
  staged: '',
  updatedAt: new Date(0).toISOString(),
}

let currentRepoPath: string | null = null

const debounceMs = 150
let pendingTimer: NodeJS.Timeout | null = null

async function refresh(repoPath: string) {
  try {
    const [unstaged, staged] = await Promise.all([
      getGitDiff(repoPath),
      getGitDiffStaged(repoPath),
    ])
    latest = {
      unstaged,
      staged,
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to compute git diff:', error)
  }
}

function scheduleRefresh(repoPath: string) {
  if (pendingTimer) {
    clearTimeout(pendingTimer)
  }

  pendingTimer = setTimeout(() => {
    void refresh(repoPath)
  }, debounceMs)
}

export async function startDiffWatcher(repoPath: string) {
  currentRepoPath = repoPath
  await refresh(repoPath)

  const watcher = chokidar.watch(repoPath, {
    ignored: [/(^|[/\\])\../, /node_modules/, /dist/, /build/],
    ignoreInitial: true,
    persistent: true,
  })

  watcher.on('all', () => scheduleRefresh(repoPath))

  return watcher
}

export function getLatestDiff(): DiffSnapshot {
  return latest
}

export function getRepoPath(): string | null {
  return currentRepoPath
}

export function triggerRefresh() {
  if (currentRepoPath) {
    void refresh(currentRepoPath)
  }
}

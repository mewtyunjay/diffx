import chokidar from 'chokidar'

import { getGitDiff } from './gitDiff'

type DiffSnapshot = {
  patch: string
  updatedAt: string
}

let latest: DiffSnapshot = {
  patch: '',
  updatedAt: new Date(0).toISOString(),
}

const debounceMs = 150
let pendingTimer: NodeJS.Timeout | null = null

async function refresh(repoPath: string) {
  try {
    const patch = await getGitDiff(repoPath)
    latest = {
      patch,
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

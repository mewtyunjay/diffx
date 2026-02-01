import { Router } from 'express'

import { getRepoPath } from '../services/diffs/watcher'

export const repoRouter = Router()

repoRouter.get('/repo', (_req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }
  res.json({ path: repoPath })
})

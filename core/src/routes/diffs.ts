import { Router } from 'express'

import { getLatestDiff, getRepoPath } from '../services/diffs/watcher'

export const diffsRouter = Router()

diffsRouter.get('/diffs/latest', (_req, res) => {
  if (!getRepoPath()) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }
  res.json(getLatestDiff())
})

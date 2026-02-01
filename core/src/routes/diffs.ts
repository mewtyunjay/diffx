import { Router } from 'express'

import { buildCombinedDiff } from '../services/ai/diffContext'
import { getLatestDiff, getRepoPath } from '../services/diffs/watcher'
import { computeDiffHash } from '../services/quizResults'

export const diffsRouter = Router()

diffsRouter.get('/diffs/latest', (_req, res) => {
  if (!getRepoPath()) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }
  const latest = getLatestDiff()
  const fullDiff = buildCombinedDiff(latest)
  res.json({ ...latest, diffHash: computeDiffHash(fullDiff) })
})

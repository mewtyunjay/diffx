import { Router } from 'express'

import { triggerRefresh, getLatestDiff, getRepoPath } from '../services/diffs/watcher'
import { buildCombinedDiff } from '../services/ai/diffContext'
import { commitChanges, pushChanges, stageFile, stashChanges, unstageFile } from '../services/git/gitDiff'
import { computeDiffHash, readQuizResults } from '../services/quizResults'

export const gitRouter = Router()

gitRouter.post('/git/stage', async (req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }

  const { filePath } = req.body as { filePath?: string }
  if (!filePath) {
    res.status(400).json({ error: 'filePath is required' })
    return
  }

  try {
    await stageFile(repoPath, filePath)
    triggerRefresh()
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to stage file:', error)
    res.status(500).json({ error: 'Failed to stage file' })
  }
})

gitRouter.post('/git/unstage', async (req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }

  const { filePath } = req.body as { filePath?: string }
  if (!filePath) {
    res.status(400).json({ error: 'filePath is required' })
    return
  }

  try {
    await unstageFile(repoPath, filePath)
    triggerRefresh()
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to unstage file:', error)
    res.status(500).json({ error: 'Failed to unstage file' })
  }
})

gitRouter.post('/git/commit', async (req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  const strictMode = Boolean(req.body?.strictMode)
  if (!message) {
    res.status(400).json({ error: 'Commit message is required' })
    return
  }

  try {
    if (strictMode) {
      const latest = getLatestDiff()
      const fullDiff = buildCombinedDiff(latest)
      const diffHash = computeDiffHash(fullDiff)
      const results = await readQuizResults(repoPath)
      const hasMatch = results.some((result) => result.diffHash === diffHash)
      if (!hasMatch) {
        res.status(403).json({ error: 'Pre-commit quiz must be completed.' })
        return
      }
    }
    await commitChanges(repoPath, message)
    triggerRefresh()
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to commit:', error)
    res.status(500).json({ error: 'Failed to commit' })
  }
})

gitRouter.post('/git/push', async (req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }

  try {
    const strictMode = Boolean(req.body?.strictMode)
    if (strictMode) {
      const latest = getLatestDiff()
      const fullDiff = buildCombinedDiff(latest)
      const diffHash = computeDiffHash(fullDiff)
      const results = await readQuizResults(repoPath)
      const hasMatch = results.some((result) => result.diffHash === diffHash)
      if (!hasMatch) {
        res.status(403).json({ error: 'Pre-commit quiz must be completed.' })
        return
      }
    }
    await pushChanges(repoPath)
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to push:', error)
    res.status(500).json({ error: 'Failed to push' })
  }
})

gitRouter.post('/git/stash', async (req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }

  try {
    await stashChanges(repoPath)
    triggerRefresh()
    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to stash:', error)
    res.status(500).json({ error: 'Failed to stash changes' })
  }
})

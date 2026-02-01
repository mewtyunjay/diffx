import { Router } from 'express'

import { triggerRefresh, getRepoPath } from '../services/diffs/watcher'
import { stageFile, unstageFile } from '../services/git/gitDiff'

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

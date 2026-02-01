import { Router } from 'express'

import { triggerRefresh, getRepoPath } from '../services/diffs/watcher'
import { commitChanges, pushChanges, stageFile, stashChanges, unstageFile } from '../services/git/gitDiff'

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
  if (!message) {
    res.status(400).json({ error: 'Commit message is required' })
    return
  }

  try {
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

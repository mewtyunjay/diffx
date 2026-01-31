import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { stageFile, unstageFile } from './diffs/gitDiff'
import { getLatestDiff, getRepoPath, startDiffWatcher, triggerRefresh } from './diffs/watcher'

const app = express()
const port = Number(process.env.PORT ?? 3001)

const here = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(here, '..', '..')

dotenv.config({ path: path.join(rootDir, '.env') })

const diffRepoPath = process.env.DIFF_REPO_PATH

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

if (!diffRepoPath) {
  console.error('Missing DIFF_REPO_PATH in .env')
} else {
  void startDiffWatcher(diffRepoPath)
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/diffs/latest', (_req, res) => {
  if (!diffRepoPath) {
    res.status(503).json({ error: 'DIFF_REPO_PATH not configured' })
    return
  }
  res.json(getLatestDiff())
})

app.post('/git/stage', async (req, res) => {
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

app.post('/git/unstage', async (req, res) => {
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

app.listen(port, () => {
  console.log(`core server listening on http://localhost:${port}`)
})

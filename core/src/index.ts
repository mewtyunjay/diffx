import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getLatestDiff, startDiffWatcher } from './diffs/watcher'

const app = express()
const port = Number(process.env.PORT ?? 3001)

const here = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(here, '..', '..')

dotenv.config({ path: path.join(rootDir, '.env') })

const diffRepoPath = process.env.DIFF_REPO_PATH

app.use(cors({ origin: 'http://localhost:5173' }))

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

app.listen(port, () => {
  console.log(`core server listening on http://localhost:${port}`)
})

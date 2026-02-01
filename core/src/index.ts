import { createApp } from './app'
import { env } from './config/env'
import { startDiffWatcher } from './services/diffs/watcher'

const app = createApp()

if (!env.diffRepoPath) {
  console.error('Missing DIFF_REPO_PATH in .env')
} else {
  void startDiffWatcher(env.diffRepoPath)
}

app.listen(env.port, () => {
  console.log(`core server listening on http://localhost:${env.port}`)
})

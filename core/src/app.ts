import cors from 'cors'
import express from 'express'

import { env } from './config/env'
import { diffsRouter } from './routes/diffs'
import { gitRouter } from './routes/git'
import { healthRouter } from './routes/health'
import { repoRouter } from './routes/repo'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.corsOrigin }))
  app.use(express.json())

  app.use(healthRouter)
  app.use(diffsRouter)
  app.use(repoRouter)
  app.use(gitRouter)

  return app
}

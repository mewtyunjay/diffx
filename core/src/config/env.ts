import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(here, '..', '..', '..')

dotenv.config({ path: path.join(rootDir, '.env') })

const port = Number(process.env.PORT ?? 3001)
const diffRepoPath = process.env.DIFF_REPO_PATH ?? null
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

export const env = {
  port,
  diffRepoPath,
  corsOrigin,
} as const

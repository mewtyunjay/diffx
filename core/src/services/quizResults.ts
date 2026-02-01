import { promises as fs } from 'fs'
import path from 'path'

type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  answerIndex?: number
}

export type QuizResult = {
  id: number
  score: number
  total: number
  answered: number
  completedAt: string
  questions: QuizQuestion[]
  answers: Record<string, number | null>
}

const RESULTS_DIR_NAME = 'quiz-results'
const RESULTS_FILE_NAME = 'results.json'

function getResultsDir(repoPath: string) {
  return path.join(repoPath, RESULTS_DIR_NAME)
}

function getResultsFile(repoPath: string) {
  return path.join(getResultsDir(repoPath), RESULTS_FILE_NAME)
}

export async function readQuizResults(repoPath: string): Promise<QuizResult[]> {
  const filePath = getResultsFile(repoPath)
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? (parsed as QuizResult[]) : []
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function appendQuizResult(repoPath: string, result: QuizResult): Promise<QuizResult> {
  const dir = getResultsDir(repoPath)
  await fs.mkdir(dir, { recursive: true })
  const existing = await readQuizResults(repoPath)
  const next = [result, ...existing]
  await fs.writeFile(getResultsFile(repoPath), JSON.stringify(next, null, 2), 'utf-8')
  return result
}

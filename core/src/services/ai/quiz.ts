import { getCodexClient } from './codexClient'
import { CODEX_MODELS } from './models'
import { normalizeToText } from './normalize'

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation?: string
}

export type QuizPayload = {
  questions: QuizQuestion[]
}

function parseQuiz(raw: unknown): QuizPayload | null {
  const text = normalizeToText(raw)
  if (!text) return null
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as QuizPayload
    if (!parsed || !Array.isArray(parsed.questions)) return null
    const questions = parsed.questions
      .map((question, index) => {
        if (!question || typeof question !== 'object') return null
        const record = question as Record<string, unknown>
        const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : ''
        const options = Array.isArray(record.options)
          ? record.options.filter((option) => typeof option === 'string').map((option) => option.trim())
          : []
        const answerIndex =
          typeof record.answerIndex === 'number' && Number.isFinite(record.answerIndex)
            ? record.answerIndex
            : -1
        if (!prompt || options.length !== 4 || answerIndex < 0 || answerIndex > 3) {
          return null
        }
        return {
          id: typeof record.id === 'string' && record.id.trim() ? record.id : `q${index + 1}`,
          prompt,
          options,
          answerIndex,
          explanation: typeof record.explanation === 'string' ? record.explanation.trim() : undefined,
        }
      })
      .filter((question): question is QuizQuestion => Boolean(question))
    if (!questions.length) return null
    return { questions }
  } catch {
    return null
  }
}

type QuizInput = {
  repoPath: string | null
  fullDiff: string
  questionCount: number
  rules?: string | null
  includeExplanations?: boolean
}

export async function buildQuiz({
  repoPath,
  fullDiff,
  questionCount,
  rules,
  includeExplanations,
}: QuizInput): Promise<QuizPayload> {
  const codex = getCodexClient(CODEX_MODELS.quiz)
  const thread = codex.startThread()
  const rulesBlock = rules?.trim()
  const includeExplanationsFlag = includeExplanations !== false
  const schema = includeExplanationsFlag
    ? '{"questions":[{"id":"q1","prompt":"...", "options":["A","B","C","D"], "answerIndex":0, "explanation":"..."}]}'
    : '{"questions":[{"id":"q1","prompt":"...", "options":["A","B","C","D"], "answerIndex":0}]}'
  const prompt = [
    'You are DiffX. Create a comprehension quiz about the code changes.',
    'Use ONLY the provided diff context.',
    'Return ONLY JSON with shape:',
    schema,
    `Number of questions: ${questionCount}`,
    `Repository: ${repoPath ?? 'unknown'}`,
    ...(rulesBlock ? ['--- RULES ---', rulesBlock] : []),
    '--- CONTEXT ---',
    fullDiff,
  ].join('\n')

  const response = await thread.run(prompt)
  const parsed = parseQuiz(response)
  if (!parsed) {
    throw new Error('Quiz parsing failed')
  }
  return parsed
}

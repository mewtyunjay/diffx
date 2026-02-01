import { getCodexClient } from './codexClient'
import { normalizeToText } from './normalize'

export type CommitMessageStyle = 'conventional' | 'descriptive' | 'simple'

export type CommitMessagePayload = {
  subject: string
  body: string | null
}

function parseCommitMessage(raw: unknown): CommitMessagePayload | null {
  const text = normalizeToText(raw)
  if (!text) return null
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as CommitMessagePayload
    if (typeof parsed.subject !== 'string' || !parsed.subject.trim()) {
      return null
    }
    return {
      subject: parsed.subject.trim(),
      body: typeof parsed.body === 'string' && parsed.body.trim() ? parsed.body.trim() : null,
    }
  } catch {
    return null
  }
}

type CommitMessageInput = {
  repoPath: string | null
  fullDiff: string
  style: CommitMessageStyle
  includeBody: boolean
  customRules?: string | null
}

export async function generateCommitMessage({
  repoPath,
  fullDiff,
  style,
  includeBody,
  customRules,
}: CommitMessageInput): Promise<CommitMessagePayload> {
  const codex = getCodexClient()
  const thread = codex.startThread()
  const rulesBlock = customRules?.trim()

  const styleInstructions = {
    conventional:
      'Use conventional commits format: type(scope): description. Types: feat, fix, docs, style, refactor, test, chore.',
    descriptive: 'Write a descriptive commit message that explains what changed and why.',
    simple: 'Write a short, simple commit message summarizing the changes.',
  }

  const bodyInstruction = includeBody
    ? 'Include a body with more details about the changes.'
    : 'Do not include a body, only the subject line.'

  const schema = '{"subject":"...", "body":"..." or null}'

  const prompt = [
    'You are DiffX. Generate a git commit message for the provided changes.',
    'Analyze the diff carefully and create an appropriate commit message.',
    'Return ONLY JSON with shape:',
    schema,
    `Style: ${styleInstructions[style]}`,
    bodyInstruction,
    `Repository: ${repoPath ?? 'unknown'}`,
    ...(rulesBlock ? ['--- CUSTOM RULES ---', rulesBlock] : []),
    '--- DIFF ---',
    fullDiff,
  ].join('\n')

  const response = await thread.run(prompt)
  const parsed = parseCommitMessage(response)
  if (!parsed) {
    throw new Error('Commit message generation failed')
  }
  return parsed
}

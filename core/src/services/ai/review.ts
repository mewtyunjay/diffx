import { getCodexClient } from './codexClient'

export type ReviewScope = 'file' | 'repo'

type ScopeDecision = {
  scope: ReviewScope
  reason?: string
}

function heuristicScope(question: string): ReviewScope {
  const lower = question.toLowerCase()
  const repoSignals = [
    'whole',
    'overall',
    'entire',
    'commit',
    'codebase',
    'repo',
    'project',
    'all changes',
    'across files',
  ]
  return repoSignals.some((signal) => lower.includes(signal)) ? 'repo' : 'file'
}

function normalizeToText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.finalResponse === 'string') return record.finalResponse
  if (typeof record.output_text === 'string') return record.output_text
  if (typeof record.text === 'string') return record.text
  if (Array.isArray(record.items)) {
    const parts = record.items
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const message = item as Record<string, unknown>
        return typeof message.text === 'string' ? message.text : null
      })
      .filter((item): item is string => Boolean(item))
    if (parts.length) return parts.join('\n')
  }
  if (Array.isArray(record.output)) {
    const parts = record.output
      .map((item) => (typeof item === 'string' ? item : null))
      .filter((item): item is string => Boolean(item))
    if (parts.length) return parts.join('\n')
  }
  return null
}

function parseJsonDecision(raw: unknown): ScopeDecision | null {
  const text = normalizeToText(raw)
  if (!text) return null
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as ScopeDecision
    if (parsed.scope === 'file' || parsed.scope === 'repo') {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

export async function decideScope(question: string): Promise<ScopeDecision> {
  const codex = getCodexClient()
  const thread = codex.startThread()
  const prompt = [
    'Decide whether the user question needs only the selected file diff or the full repo diff.',
    'Respond ONLY with JSON: {"scope":"file"|"repo","reason":"short reason"}',
    `Question: ${question}`,
  ].join('\n')

  try {
    const response = await thread.run(prompt)
    const parsed = parseJsonDecision(response)
    if (parsed) return parsed
  } catch (error) {
    console.error('Codex scope decision failed:', error)
  }

  return { scope: heuristicScope(question) }
}

type ReviewInput = {
  question: string
  scope: ReviewScope
  repoPath: string | null
  filePath?: string | null
  fileDiff?: string | null
  fullDiff: string
}

export async function answerQuestion({
  question,
  scope,
  repoPath,
  filePath,
  fileDiff,
  fullDiff,
}: ReviewInput): Promise<string> {
  const codex = getCodexClient()
  const thread = codex.startThread()
  const context = scope === 'file' && fileDiff?.trim() ? fileDiff : fullDiff
  const scopeLabel = scope === 'file' && fileDiff?.trim() ? 'file' : 'repo'

  const prompt = [
    'You are DiffX, a supervisor reviewing code changes.',
    'Answer the user question using ONLY the provided diff context.',
    'If the context is insufficient, say what is missing.',
    `Repository: ${repoPath ?? 'unknown'}`,
    `Scope: ${scopeLabel}`,
    `Selected file: ${filePath ?? 'none'}`,
    '--- CONTEXT ---',
    context,
    '--- QUESTION ---',
    question,
  ].join('\n')

  const response = await thread.run(prompt)
  const text = normalizeToText(response)
  return text ?? JSON.stringify(response, null, 2)
}

export type ExplainScopePreference = 'auto' | 'file' | 'repo'
export type ExplainTone = 'concise' | 'balanced' | 'detailed'
export type ExplainFormat = 'bullets' | 'paragraphs'
export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type QuizFocus = 'comprehension' | 'edge-cases' | 'style' | 'bug-hunt'

export type ExplainSettings = {
  scopePreference: ExplainScopePreference
  tone: ExplainTone
  format: ExplainFormat
  includeRisks: boolean
  includeNextSteps: boolean
  customInstructions: string
}

export type QuizSettings = {
  questionCount: number
  difficulty: QuizDifficulty
  focus: QuizFocus
  includeExplanations: boolean
  customRules: string
}

export type Settings = {
  explain: ExplainSettings
  quiz: QuizSettings
}

export const defaultSettings: Settings = {
  explain: {
    scopePreference: 'auto',
    tone: 'concise',
    format: 'bullets',
    includeRisks: true,
    includeNextSteps: false,
    customInstructions: '',
  },
  quiz: {
    questionCount: 5,
    difficulty: 'medium',
    focus: 'comprehension',
    includeExplanations: true,
    customRules: '',
  },
}

const SETTINGS_STORAGE_KEY = 'diffx.settings.v1'

function clampQuestionCount(value: number) {
  if (!Number.isFinite(value)) return defaultSettings.quiz.questionCount
  return Math.min(10, Math.max(1, Math.round(value)))
}

function mergeExplainSettings(partial?: Partial<ExplainSettings>): ExplainSettings {
  return {
    ...defaultSettings.explain,
    ...partial,
  }
}

function mergeQuizSettings(partial?: Partial<QuizSettings>): QuizSettings {
  const merged = {
    ...defaultSettings.quiz,
    ...partial,
  }
  return {
    ...merged,
    questionCount: clampQuestionCount(merged.questionCount),
  }
}

export function mergeSettings(partial?: Partial<Settings>): Settings {
  return {
    explain: mergeExplainSettings(partial?.explain),
    quiz: mergeQuizSettings(partial?.quiz),
  }
}

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return defaultSettings
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<Settings>
    return mergeSettings(parsed)
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors (privacy mode, quota, etc).
  }
}

export function buildExplainInstructions(settings: ExplainSettings): string {
  const lines = [
    `Tone: ${settings.tone}.`,
    `Format: ${settings.format === 'bullets' ? 'Use bullet points' : 'Use short paragraphs'}.`,
  ]

  if (settings.includeRisks) {
    lines.push('Call out risks or regressions if present.')
  } else {
    lines.push('Do not speculate about risks unless explicit in the diff.')
  }

  if (settings.includeNextSteps) {
    lines.push('End with a short next steps section.')
  }

  const base = lines.join(' ')
  const custom = settings.customInstructions.trim()

  if (!custom) return base
  return custom
}

export function buildQuizRules(settings: QuizSettings): string {
  const lines = [
    `Difficulty: ${settings.difficulty}.`,
    `Focus: ${settings.focus.replace('-', ' ')}.`,
    settings.includeExplanations
      ? 'Include a short explanation for each answer.'
      : 'Do not include explanations.',
  ]

  const base = lines.join(' ')
  const custom = settings.customRules.trim()

  if (!custom) return base
  return custom
}

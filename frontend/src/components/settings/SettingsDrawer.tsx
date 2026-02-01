import { useEffect } from 'react'
import {
  buildCommitMessageRules,
  buildExplainInstructions,
  buildQuizRules,
  defaultSettings,
  type CommitMessageStyle,
  type ExplainFormat,
  type ExplainScopePreference,
  type ExplainTone,
  type QuizDifficulty,
  type QuizFocus,
  type Settings,
} from '../../utils/settings'
import './SettingsDrawer.css'

type SettingsDrawerProps = {
  open: boolean
  settings: Settings
  onClose: () => void
  onChange: (next: Settings) => void
  onReset: () => void
}

const scopeOptions: { value: ExplainScopePreference; label: string }[] = [
  { value: 'auto', label: 'Auto (let DiffX decide)' },
  { value: 'file', label: 'Selected file only' },
  { value: 'repo', label: 'Full diff' },
]

const toneOptions: { value: ExplainTone; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
]

const formatOptions: { value: ExplainFormat; label: string }[] = [
  { value: 'bullets', label: 'Bullet points' },
  { value: 'paragraphs', label: 'Paragraphs' },
]

const difficultyOptions: { value: QuizDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const focusOptions: { value: QuizFocus; label: string }[] = [
  { value: 'comprehension', label: 'Comprehension' },
  { value: 'edge-cases', label: 'Edge cases' },
  { value: 'style', label: 'Style & conventions' },
  { value: 'bug-hunt', label: 'Bug hunt' },
]

const commitMessageStyleOptions: { value: CommitMessageStyle; label: string }[] = [
  { value: 'conventional', label: 'Conventional (type(scope): description)' },
  { value: 'descriptive', label: 'Descriptive (explain what and why)' },
  { value: 'simple', label: 'Simple (short summary)' },
]

export function SettingsDrawer({ open, settings, onClose, onChange, onReset }: SettingsDrawerProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const explainPreview = buildExplainInstructions(settings.explain)
  const quizPreview = buildQuizRules(settings.quiz)
  const commitMessagePreview = settings.commitMessage.followPreviousStyle
    ? 'Will analyze recent commit messages to match style.'
    : buildCommitMessageRules(settings.commitMessage)

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <header className="settings-header">
          <div>
            <span className="settings-title">Settings</span>
            <span className="settings-subtitle">Auto-saved to this browser</span>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={onReset} className="settings-reset">
              Reset defaults
            </button>
            <button type="button" onClick={onClose} className="settings-close">
              Close
            </button>
          </div>
        </header>

        <div className="settings-grid">
          <section className="settings-section">
            <div className="settings-section-header">
              <h2>Explain</h2>
              <p>How DiffX answers questions about the diff.</p>
            </div>

            <label>
              Scope preference
              <select
                value={settings.explain.scopePreference}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    explain: { ...settings.explain, scopePreference: event.target.value as ExplainScopePreference },
                  })
                }
              >
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Tone
              <select
                value={settings.explain.tone}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    explain: { ...settings.explain, tone: event.target.value as ExplainTone },
                  })
                }
              >
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Format
              <select
                value={settings.explain.format}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    explain: { ...settings.explain, format: event.target.value as ExplainFormat },
                  })
                }
              >
                {formatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.explain.includeRisks}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    explain: { ...settings.explain, includeRisks: event.target.checked },
                  })
                }
              />
              Highlight risks/regressions
            </label>
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.explain.includeNextSteps}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    explain: { ...settings.explain, includeNextSteps: event.target.checked },
                  })
                }
              />
              Include next steps
            </label>

            <label>
              Custom instructions
              <textarea
                rows={4}
                placeholder="Add extra instructions for DiffX..."
                value={settings.explain.customInstructions}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    explain: { ...settings.explain, customInstructions: event.target.value },
                  })
                }
              />
            </label>

            <div className="settings-preview">
              <span>Preview</span>
              <pre>{explainPreview || defaultSettings.explain.customInstructions}</pre>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-header">
              <h2>Quiz</h2>
              <p>How DiffX generates quizzes about the diff.</p>
            </div>

            <label>
              Question count
              <input
                type="number"
                min={1}
                max={10}
                value={settings.quiz.questionCount}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    quiz: {
                      ...settings.quiz,
                      questionCount: Number(event.target.value || defaultSettings.quiz.questionCount),
                    },
                  })
                }
              />
            </label>

            <label>
              Difficulty
              <select
                value={settings.quiz.difficulty}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    quiz: { ...settings.quiz, difficulty: event.target.value as QuizDifficulty },
                  })
                }
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Focus
              <select
                value={settings.quiz.focus}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    quiz: { ...settings.quiz, focus: event.target.value as QuizFocus },
                  })
                }
              >
                {focusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.quiz.includeExplanations}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    quiz: { ...settings.quiz, includeExplanations: event.target.checked },
                  })
                }
              />
              Include explanations in results
            </label>

            <label>
              Custom rules
              <textarea
                rows={4}
                placeholder="Add extra quiz rules or constraints..."
                value={settings.quiz.customRules}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    quiz: { ...settings.quiz, customRules: event.target.value },
                  })
                }
              />
            </label>

            <div className="settings-preview">
              <span>Preview</span>
              <pre>{quizPreview || defaultSettings.quiz.customRules}</pre>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-header">
              <h2>Commit Message</h2>
              <p>How DiffX generates commit messages.</p>
            </div>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.commitMessage.followPreviousStyle}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    commitMessage: { ...settings.commitMessage, followPreviousStyle: event.target.checked },
                  })
                }
              />
              Follow previous commit messages style
            </label>

            <label>
              Style
              <select
                value={settings.commitMessage.style}
                disabled={settings.commitMessage.followPreviousStyle}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    commitMessage: { ...settings.commitMessage, style: event.target.value as CommitMessageStyle },
                  })
                }
              >
                {commitMessageStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.commitMessage.includeBody}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    commitMessage: { ...settings.commitMessage, includeBody: event.target.checked },
                  })
                }
              />
              Include detailed body
            </label>

            <label>
              Custom instructions
              <textarea
                rows={4}
                placeholder="Add extra instructions for commit message generation..."
                value={settings.commitMessage.customRules}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    commitMessage: { ...settings.commitMessage, customRules: event.target.value },
                  })
                }
              />
            </label>

            <div className="settings-preview">
              <span>Preview</span>
              <pre>{commitMessagePreview}</pre>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-header">
              <h2>Code Review</h2>
              <p>Choose which review agents to run.</p>
            </div>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.codeReview.enableBugHunter}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    codeReview: { ...settings.codeReview, enableBugHunter: event.target.checked },
                  })
                }
              />
              Bug Hunter agent
            </label>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.codeReview.enableSecurity}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    codeReview: { ...settings.codeReview, enableSecurity: event.target.checked },
                  })
                }
              />
              Security agent
            </label>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={settings.codeReview.enableQuality}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    codeReview: { ...settings.codeReview, enableQuality: event.target.checked },
                  })
                }
              />
              Quality agent
            </label>
          </section>
        </div>
      </div>
    </div>
  )
}

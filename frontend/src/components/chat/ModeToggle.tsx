import './ModeToggle.css'

export type Mode = 'learn' | 'quiz'

type ModeToggleProps = {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        type="button"
        className={`mode-toggle-btn ${mode === 'learn' ? 'is-active' : ''}`}
        onClick={() => onModeChange('learn')}
      >
        <span className="mode-toggle-icon">&#128218;</span>
        <span>Learn</span>
      </button>
      <button
        type="button"
        className={`mode-toggle-btn ${mode === 'quiz' ? 'is-active' : ''}`}
        onClick={() => onModeChange('quiz')}
      >
        <span className="mode-toggle-icon">&#10004;</span>
        <span>Quiz</span>
      </button>
    </div>
  )
}

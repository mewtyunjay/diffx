import './DiffToolbar.css'

type DiffToolbarProps = {
  fileName: string | null
  diffMode: 'unified' | 'split'
  onDiffModeChange: (mode: 'unified' | 'split') => void
  hasSelection: boolean
}

export function DiffToolbar({
  fileName,
  diffMode,
  onDiffModeChange,
  hasSelection,
}: DiffToolbarProps) {
  return (
    <div className="diff-toolbar">
      <div className="diff-toolbar-title">
        <div className="diff-toolbar-label">Diff</div>
        <div className="diff-toolbar-file">
          {hasSelection ? fileName : 'Select a file'}
        </div>
      </div>
      <div className="diff-toolbar-controls" role="group" aria-label="Diff view mode">
        <button
          type="button"
          className={`diff-toggle ${diffMode === 'unified' ? 'is-active' : ''}`}
          onClick={() => onDiffModeChange('unified')}
          disabled={!hasSelection}
        >
          Unified
        </button>
        <button
          type="button"
          className={`diff-toggle ${diffMode === 'split' ? 'is-active' : ''}`}
          onClick={() => onDiffModeChange('split')}
          disabled={!hasSelection}
        >
          Split
        </button>
      </div>
    </div>
  )
}

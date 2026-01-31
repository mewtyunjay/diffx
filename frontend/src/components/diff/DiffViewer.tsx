import '@pierre/diffs'
import type { FileDiffMetadata } from '@pierre/diffs'
import { FileDiff } from '@pierre/diffs/react'
import { useMemo, useState } from 'react'

import './DiffViewer.css'

type DiffViewerProps = {
  patch: string
  fileDiffs: FileDiffMetadata[]
  selectedFile: FileDiffMetadata | null
  error: string | null
}

export function DiffViewer({ patch, fileDiffs, selectedFile, error }: DiffViewerProps) {
  const [diffStyle, setDiffStyle] = useState<'split' | 'unified'>('split')

  const fileOptions = useMemo(
    () => ({
      diffStyle,
      disableFileHeader: true,
    }),
    [diffStyle]
  )

  return (
    <div className="diff-viewer">
      {error ? (
        <div className="diff-empty">Error: {error}</div>
      ) : patch.trim().length === 0 ? (
        <div className="diff-empty">No changes detected yet.</div>
      ) : fileDiffs.length === 0 ? (
        <div className="diff-empty">Diff present but no files to render.</div>
      ) : selectedFile == null ? (
        <div className="diff-empty">Select a file to view its diff.</div>
      ) : (
        <div className="diffs-list">
          <section className="diff-card">
            <div className="diff-toolbar">
              <div className="diff-filename">
                {selectedFile.name || selectedFile.prevName || 'Untitled'}
              </div>
              <div className="diff-controls">
                <button
                  type="button"
                  className={`diff-toggle ${diffStyle === 'unified' ? 'is-active' : ''}`}
                  onClick={() => setDiffStyle('unified')}
                >
                  Unified
                </button>
                <button
                  type="button"
                  className={`diff-toggle ${diffStyle === 'split' ? 'is-active' : ''}`}
                  onClick={() => setDiffStyle('split')}
                >
                  Split
                </button>
              </div>
            </div>
            <FileDiff fileDiff={selectedFile} options={fileOptions} />
          </section>
        </div>
      )}
    </div>
  )
}

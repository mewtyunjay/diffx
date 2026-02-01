import '@pierre/diffs'
import type { FileDiffMetadata } from '@pierre/diffs'
import { FileDiff } from '@pierre/diffs/react'
import { useMemo } from 'react'

import './DiffViewer.css'

type DiffViewerProps = {
  selectedFile: FileDiffMetadata | null
  error: string | null
  hasChanges: boolean
  diffMode: 'unified' | 'split'
}

export function DiffViewer({ selectedFile, error, hasChanges, diffMode }: DiffViewerProps) {
  const fileOptions = useMemo(
    () => ({
      diffStyle: diffMode,
      disableFileHeader: true,
    }),
    [diffMode]
  )

  return (
    <div className="diff-viewer">
      {error ? (
        <div className="diff-empty">Error: {error}</div>
      ) : !hasChanges ? (
        <div className="diff-empty">No changes detected yet.</div>
      ) : selectedFile == null ? (
        <div className="diff-empty">Select a file to view its diff.</div>
      ) : (
        <section className="diff-surface" aria-label="File diff">
          <div className="diff-scroll">
            <FileDiff fileDiff={selectedFile} options={fileOptions} />
          </div>
        </section>
      )}
    </div>
  )
}

import { useState } from 'react'
import type { CommitMessageSettings } from '../../utils/settings'
import { Accordion } from './Accordion'
import './Sidebar.css'

export type SidebarFile = {
  key: string
  path: string
  additions: number
  deletions: number
}

type SidebarProps = {
  stagedFiles: SidebarFile[]
  unstagedFiles: SidebarFile[]
  selectedPath: string | null
  repoPath: string | null
  commitMessageSettings: CommitMessageSettings
  onSelectFile: (path: string) => void
  onStageFile: (filePath: string) => void
  onUnstageFile: (filePath: string) => void
  onCommit: (message: string) => Promise<void>
  onPush: () => Promise<void>
}

export function Sidebar({
  stagedFiles,
  unstagedFiles,
  selectedPath,
  repoPath,
  commitMessageSettings,
  onSelectFile,
  onStageFile,
  onUnstageFile,
  onCommit,
  onPush,
}: SidebarProps) {
  const totalFiles = stagedFiles.length + unstagedFiles.length
  const [commitOpen, setCommitOpen] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [commitLoading, setCommitLoading] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [autoGenerateLoading, setAutoGenerateLoading] = useState(false)
  const canCommit = Boolean(repoPath) && stagedFiles.length > 0
  const hasChanges = totalFiles > 0

  const handleCommit = async () => {
    const message = commitMessage.trim()
    if (!message) {
      setCommitError('Commit message is required.')
      return
    }
    setCommitLoading(true)
    setCommitError(null)
    try {
      await onCommit(message)
      setCommitMessage('')
      setCommitOpen(false)
    } catch (error) {
      setCommitError(error instanceof Error ? error.message : 'Failed to commit.')
    } finally {
      setCommitLoading(false)
    }
  }

  const handlePush = async () => {
    setPushLoading(true)
    setPushError(null)
    try {
      await onPush()
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'Failed to push.')
    } finally {
      setPushLoading(false)
    }
  }

  const handleAutoGenerate = async () => {
    if (!hasChanges) return
    setAutoGenerateLoading(true)
    setCommitError(null)
    try {
      const response = await fetch('http://localhost:3001/ai/commit-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitConfig: {
            followPreviousStyle: commitMessageSettings.followPreviousStyle,
            style: commitMessageSettings.style,
            includeBody: commitMessageSettings.includeBody,
            customRules: commitMessageSettings.customRules,
          },
        }),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed to generate commit message (${response.status})`)
      }
      const data = (await response.json()) as { subject?: string; body?: string | null }
      if (typeof data.subject === 'string') {
        const fullMessage = data.body
          ? `${data.subject}\n\n${data.body}`
          : data.subject
        setCommitMessage(fullMessage)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      setCommitError(error instanceof Error ? error.message : 'Failed to generate commit message.')
    } finally {
      setAutoGenerateLoading(false)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">DIFFX</div>
      </div>
      {repoPath ? <div className="sidebar-cwd">{repoPath}</div> : null}
      <div className="sidebar-content">
        {totalFiles === 0 ? (
          <div className="sidebar-empty">No file changes</div>
        ) : (
          <>
            <Accordion title="Staged" count={stagedFiles.length} defaultOpen={true}>
              {stagedFiles.length === 0 ? (
                <div className="sidebar-empty-section">No staged changes</div>
              ) : (
                stagedFiles.map((file) => (
                  <div
                    key={file.key}
                    className={`file-card ${file.path === selectedPath ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="file-card-main"
                      onClick={() => onSelectFile(file.path)}
                    >
                      <div className="file-row">
                        <div className="file-name">{file.path}</div>
                        <div className="file-stats">
                          <span className="file-add">+{file.additions}</span>
                          <span className="file-del">-{file.deletions}</span>
                        </div>
                      </div>
                    </button>
                    <div className="file-actions">
                      <button
                        type="button"
                        className="file-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          onUnstageFile(file.path)
                        }}
                        aria-label="Unstage file"
                        title="Unstage file"
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))
              )}
            </Accordion>

            <Accordion title="Unstaged" count={unstagedFiles.length} defaultOpen={true}>
              {unstagedFiles.length === 0 ? (
                <div className="sidebar-empty-section">No unstaged changes</div>
              ) : (
                unstagedFiles.map((file) => (
                  <div
                    key={file.key}
                    className={`file-card ${file.path === selectedPath ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="file-card-main"
                      onClick={() => onSelectFile(file.path)}
                    >
                      <div className="file-row">
                        <div className="file-name">{file.path}</div>
                        <div className="file-stats">
                          <span className="file-add">+{file.additions}</span>
                          <span className="file-del">-{file.deletions}</span>
                        </div>
                      </div>
                    </button>
                    <div className="file-actions">
                      <button
                        type="button"
                        className="file-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          onStageFile(file.path)
                        }}
                        aria-label="Stage file"
                        title="Stage file"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </Accordion>
          </>
        )}
      </div>
      <div className="sidebar-actions">
        <div className="sidebar-separator" />
        <div className="sidebar-action-row">
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={() => {
              if (!canCommit) return
              setCommitOpen(true)
              setCommitError(null)
            }}
            disabled={!canCommit || commitLoading}
          >
            Commit
          </button>
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={() => void handlePush()}
            disabled={!repoPath || pushLoading}
          >
            Push
          </button>
        </div>
        {pushError ? <div className="sidebar-action-error">{pushError}</div> : null}
        {commitOpen ? (
          <div className="sidebar-commit">
            <label className="sidebar-commit-label" htmlFor="sidebar-commit-message">
              Commit message
            </label>
            <textarea
              id="sidebar-commit-message"
              rows={3}
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Describe what changed"
              disabled={commitLoading}
            />
            {commitError ? <div className="sidebar-action-error">{commitError}</div> : null}
            <div className="sidebar-commit-actions">
              <button type="button" onClick={() => void handleCommit()} disabled={commitLoading}>
                {commitLoading ? 'Committing…' : 'Commit'}
              </button>
              <button
                type="button"
                onClick={() => void handleAutoGenerate()}
                disabled={autoGenerateLoading || !hasChanges}
              >
                {autoGenerateLoading ? 'Generating…' : 'Auto-generate'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommitOpen(false)
                  setCommitError(null)
                }}
                disabled={commitLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

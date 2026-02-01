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
  onSelectFile: (path: string) => void
  onStageFile: (filePath: string) => void
  onUnstageFile: (filePath: string) => void
}

export function Sidebar({
  stagedFiles,
  unstagedFiles,
  selectedPath,
  repoPath,
  onSelectFile,
  onStageFile,
  onUnstageFile,
}: SidebarProps) {
  const totalFiles = stagedFiles.length + unstagedFiles.length

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
    </aside>
  )
}

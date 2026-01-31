import { Accordion } from './Accordion'
import './Sidebar.css'

export type SidebarFile = {
  key: string
  name: string
  additions: number
  deletions: number
}

type SidebarProps = {
  collapsed: boolean
  stagedFiles: SidebarFile[]
  unstagedFiles: SidebarFile[]
  selectedKey: string | null
  onSelectFile: (key: string) => void
  onStageFile: (fileName: string) => void
  onUnstageFile: (fileName: string) => void
  onToggle: () => void
}

export function Sidebar({
  collapsed,
  stagedFiles,
  unstagedFiles,
  selectedKey,
  onSelectFile,
  onStageFile,
  onUnstageFile,
  onToggle,
}: SidebarProps) {
  const totalFiles = stagedFiles.length + unstagedFiles.length

  return (
    <aside className="sidebar" data-collapsed={collapsed} aria-hidden={collapsed}>
      <div className="sidebar-header">
        <button
          className="collapse-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
        <div className="sidebar-title">Files</div>
      </div>
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
                    className={`file-card ${file.key === selectedKey ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="file-card-main"
                      onClick={() => onSelectFile(file.key)}
                    >
                      <div className="file-name">{file.name}</div>
                      <div className="file-stats">
                        <span className="file-add">+{file.additions}</span>
                        <span className="file-del">-{file.deletions}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="file-action file-action-unstage"
                      onClick={(e) => {
                        e.stopPropagation()
                        onUnstageFile(file.name)
                      }}
                      title="Unstage file"
                    >
                      −
                    </button>
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
                    className={`file-card ${file.key === selectedKey ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="file-card-main"
                      onClick={() => onSelectFile(file.key)}
                    >
                      <div className="file-name">{file.name}</div>
                      <div className="file-stats">
                        <span className="file-add">+{file.additions}</span>
                        <span className="file-del">-{file.deletions}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="file-action file-action-stage"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStageFile(file.name)
                      }}
                      title="Stage file"
                    >
                      +
                    </button>
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

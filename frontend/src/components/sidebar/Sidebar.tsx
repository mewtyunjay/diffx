import './Sidebar.css'

type SidebarFile = {
  key: string
  name: string
  additions: number
  deletions: number
}

type SidebarProps = {
  collapsed: boolean
  files: SidebarFile[]
  selectedKey: string | null
  onSelectFile: (key: string) => void
  onToggle: () => void
}

export function Sidebar({ collapsed, files, selectedKey, onSelectFile, onToggle }: SidebarProps) {
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
        {files.length === 0 ? (
          <div className="sidebar-empty">No file changes</div>
        ) : (
          files.map((file) => (
            <button
              type="button"
              key={file.key}
              className={`file-card ${file.key === selectedKey ? 'is-active' : ''}`}
              onClick={() => onSelectFile(file.key)}
            >
              <div className="file-name">{file.name}</div>
              <div className="file-stats">
                <span className="file-add">+{file.additions}</span>
                <span className="file-del">-{file.deletions}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}

import { parsePatchFiles, type FileDiffMetadata } from '@pierre/diffs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chatbox } from './components/chat/Chatbox'
import { ModeToggle, type Mode } from './components/chat/ModeToggle'
import { DiffViewer } from './components/diff/DiffViewer'
import { Sidebar, type SidebarFile } from './components/sidebar/Sidebar'
import './App.css'

type FileWithDiff = SidebarFile & { fileDiff: FileDiffMetadata }

function parseFileDiffs(patchText: string, prefix: string): FileWithDiff[] {
  if (!patchText.trim()) return []
  const parsed = parsePatchFiles(patchText)
  const parsedFiles = parsed.flatMap((entry) => entry.files ?? [])
  return parsedFiles.map((fileDiff, index) => {
    const additions = fileDiff.hunks.reduce(
      (total, hunk) => total + (hunk.additionLines ?? 0),
      0
    )
    const deletions = fileDiff.hunks.reduce(
      (total, hunk) => total + (hunk.deletionLines ?? 0),
      0
    )
    const name = fileDiff.name || fileDiff.prevName || 'Untitled'
    return {
      key: `${prefix}-${name}-${index}`,
      name,
      additions,
      deletions,
      fileDiff,
    }
  })
}

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [unstagedPatch, setUnstagedPatch] = useState('')
  const [stagedPatch, setStagedPatch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('learn')

  const stagedFiles = useMemo(() => parseFileDiffs(stagedPatch, 'staged'), [stagedPatch])
  const unstagedFiles = useMemo(() => parseFileDiffs(unstagedPatch, 'unstaged'), [unstagedPatch])
  const allFiles = useMemo(() => [...stagedFiles, ...unstagedFiles], [stagedFiles, unstagedFiles])

  const selectedFile = useMemo(() => {
    if (!selectedKey) return null
    return allFiles.find((file) => file.key === selectedKey) ?? null
  }, [selectedKey, allFiles])

  const combinedPatch = useMemo(() => {
    return [stagedPatch, unstagedPatch].filter(Boolean).join('\n')
  }, [stagedPatch, unstagedPatch])

  const allFileDiffs = useMemo(() => {
    return allFiles.map((f) => f.fileDiff)
  }, [allFiles])

  const load = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/diffs/latest')
      if (!response.ok) {
        throw new Error(`Failed to load diff (${response.status})`)
      }
      const data = (await response.json()) as { unstaged?: string; staged?: string }
      const unstaged = data.unstaged ?? ''
      const staged = data.staged ?? ''

      setUnstagedPatch(unstaged)
      setStagedPatch(staged)

      const hasContent = unstaged.trim() || staged.trim()
      const stagedParsed = parseFileDiffs(staged, 'staged')
      const unstagedParsed = parseFileDiffs(unstaged, 'unstaged')
      const allParsed = [...stagedParsed, ...unstagedParsed]

      if (hasContent && allParsed.length === 0) {
        setError('Diff loaded but could not be parsed.')
      } else {
        setError(null)
      }

      setSelectedKey((prev) => {
        if (prev && allParsed.some((f) => f.key === prev)) {
          return prev
        }
        if (allParsed.length === 0) {
          return null
        }
        return allParsed[0].key
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diff')
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(load, 1000)
    return () => window.clearInterval(interval)
  }, [load])

  const handleStageFile = useCallback(async (fileName: string) => {
    try {
      const response = await fetch('http://localhost:3001/git/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: fileName }),
      })
      if (!response.ok) {
        throw new Error('Failed to stage file')
      }
      void load()
    } catch (err) {
      console.error('Failed to stage file:', err)
    }
  }, [load])

  const handleUnstageFile = useCallback(async (fileName: string) => {
    try {
      const response = await fetch('http://localhost:3001/git/unstage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: fileName }),
      })
      if (!response.ok) {
        throw new Error('Failed to unstage file')
      }
      void load()
    } catch (err) {
      console.error('Failed to unstage file:', err)
    }
  }, [load])

  return (
    <div className={`app ${isCollapsed ? 'is-collapsed' : ''}`}>
      <Sidebar
        collapsed={isCollapsed}
        stagedFiles={stagedFiles}
        unstagedFiles={unstagedFiles}
        selectedKey={selectedKey}
        onSelectFile={(key) => setSelectedKey(key)}
        onStageFile={handleStageFile}
        onUnstageFile={handleUnstageFile}
        onToggle={() => setIsCollapsed((prev) => !prev)}
      />
      <main className="main">
        <div className="main-content">
          <DiffViewer
            patch={combinedPatch}
            error={error}
            fileDiffs={allFileDiffs}
            selectedFile={selectedFile?.fileDiff ?? null}
          />
        </div>
        <div className="main-chat">
          <Chatbox />
          <ModeToggle mode={mode} onModeChange={setMode} />
        </div>
      </main>
    </div>
  )
}

export default App

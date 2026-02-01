import { parsePatchFiles, type FileDiffMetadata } from '@pierre/diffs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DiffToolbar } from './components/diff/DiffToolbar'
import { DiffViewer } from './components/diff/DiffViewer'
import { Sidebar, type SidebarFile } from './components/sidebar/Sidebar'
import './App.css'

type FileEntry = SidebarFile & { fileDiff: FileDiffMetadata; status: 'staged' | 'unstaged' }

function insertByPath(base: FileEntry[], moved: FileEntry[]): FileEntry[] {
  if (moved.length === 0) return base
  const ordered = [...base]
  const movedSorted = [...moved].sort((a, b) => a.path.localeCompare(b.path))
  movedSorted.forEach((file) => {
    const insertIndex = ordered.findIndex((entry) => entry.path.localeCompare(file.path) > 0)
    if (insertIndex === -1) {
      ordered.push(file)
    } else {
      ordered.splice(insertIndex, 0, file)
    }
  })
  return ordered
}

function parseFileDiffs(
  patchText: string,
  status: 'staged' | 'unstaged'
): FileEntry[] {
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
    const key = `${status}:${name}:${index}`
    return {
      key,
      path: name,
      additions,
      deletions,
      fileDiff,
      status,
    }
  })
}

function App() {
  const [unstagedPatch, setUnstagedPatch] = useState('')
  const [stagedPatch, setStagedPatch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>('split')
  const [pendingStage, setPendingStage] = useState<Set<string>>(new Set())
  const [pendingUnstage, setPendingUnstage] = useState<Set<string>>(new Set())

  const parsedStaged = useMemo(() => parseFileDiffs(stagedPatch, 'staged'), [stagedPatch])
  const parsedUnstaged = useMemo(() => parseFileDiffs(unstagedPatch, 'unstaged'), [unstagedPatch])
  const hasChanges = parsedStaged.length + parsedUnstaged.length > 0

  const stagedFiles = useMemo(() => {
    const base = parsedStaged.filter((file) => !pendingUnstage.has(file.path))
    const moved = parsedUnstaged
      .filter((file) => pendingStage.has(file.path))
      .map((file) => ({ ...file, key: `staged:${file.path}:pending` }))
    return insertByPath(base, moved).map((file) => ({
      key: file.key,
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
    }))
  }, [parsedStaged, parsedUnstaged, pendingStage, pendingUnstage])

  const unstagedFiles = useMemo(() => {
    const base = parsedUnstaged.filter((file) => !pendingStage.has(file.path))
    const moved = parsedStaged
      .filter((file) => pendingUnstage.has(file.path))
      .map((file) => ({ ...file, key: `unstaged:${file.path}:pending` }))
    return insertByPath(base, moved).map((file) => ({
      key: file.key,
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
    }))
  }, [parsedStaged, parsedUnstaged, pendingStage, pendingUnstage])

  const allFiles = useMemo(() => [...parsedStaged, ...parsedUnstaged], [parsedStaged, parsedUnstaged])

  const selectedFile = useMemo(() => {
    if (!selectedPath) return null
    return allFiles.find((file) => file.path === selectedPath) ?? null
  }, [selectedPath, allFiles])

  const selectedFilename =
    selectedFile?.fileDiff.name || selectedFile?.fileDiff.prevName || selectedFile?.path || null

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
      const allPaths = new Set(allParsed.map((file) => file.path))

      setPendingStage((prev) => {
        const next = new Set([...prev].filter((path) => allPaths.has(path)))
        return next.size === prev.size ? prev : next
      })
      setPendingUnstage((prev) => {
        const next = new Set([...prev].filter((path) => allPaths.has(path)))
        return next.size === prev.size ? prev : next
      })

      if (hasContent && allParsed.length === 0) {
        setError('Diff loaded but could not be parsed.')
      } else {
        setError(null)
      }

      setSelectedPath((prev) => {
        if (!prev) {
          return allParsed.length > 0 ? allParsed[0].path : null
        }
        const stillExists = allParsed.some((f) => f.path === prev)
        return stillExists ? prev : (allParsed.length > 0 ? allParsed[0].path : null)
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

  const handleStageFile = useCallback((filePath: string) => {
    setPendingStage((prev) => new Set(prev).add(filePath))
    setPendingUnstage((prev) => {
      const next = new Set(prev)
      next.delete(filePath)
      return next
    })
    fetch('http://localhost:3001/git/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    }).catch((err) => console.error('Failed to stage file:', err))
  }, [])

  const handleUnstageFile = useCallback((filePath: string) => {
    setPendingUnstage((prev) => new Set(prev).add(filePath))
    setPendingStage((prev) => {
      const next = new Set(prev)
      next.delete(filePath)
      return next
    })
    fetch('http://localhost:3001/git/unstage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    }).catch((err) => console.error('Failed to unstage file:', err))
  }, [])

  return (
    <div className="app">
      <Sidebar
        stagedFiles={stagedFiles}
        unstagedFiles={unstagedFiles}
        selectedPath={selectedPath}
        onSelectFile={(path) => setSelectedPath(path)}
        onStageFile={handleStageFile}
        onUnstageFile={handleUnstageFile}
      />
      <main className="main">
        <section className="diff-panel">
          <DiffToolbar
            fileName={selectedFilename}
            diffMode={diffMode}
            onDiffModeChange={setDiffMode}
            hasSelection={selectedFile != null}
          />
          <div className="main-content">
            <DiffViewer
              error={error}
              hasChanges={hasChanges}
              selectedFile={selectedFile?.fileDiff ?? null}
              diffMode={diffMode}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

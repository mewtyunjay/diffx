import { parsePatchFiles, type FileDiffMetadata } from '@pierre/diffs'
import { useEffect, useMemo, useState } from 'react'
import { DiffViewer } from './components/diff/DiffViewer'
import { Sidebar } from './components/sidebar/Sidebar'
import './App.css'

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [patch, setPatch] = useState('')
  const [fileDiffs, setFileDiffs] = useState<FileDiffMetadata[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const files = useMemo(() => {
    return fileDiffs.map((fileDiff, index) => {
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
        key: `${name}-${index}`,
        name,
        additions,
        deletions,
        fileDiff,
      }
    })
  }, [fileDiffs])

  const selectedFile =
    selectedKey == null ? null : files.find((file) => file.key === selectedKey) ?? null

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const response = await fetch('http://localhost:3001/diffs/latest')
        if (!response.ok) {
          throw new Error(`Failed to load diff (${response.status})`)
        }
        const data = (await response.json()) as { patch?: string }
        const patchText = data.patch ?? ''
        const parsed = patchText.trim().length > 0 ? parsePatchFiles(patchText) : []
        const parsedFiles = parsed.flatMap((entry) => entry.files ?? [])
        if (isMounted) {
          setPatch(patchText)
          setFileDiffs(parsedFiles)
          if (patchText.trim().length > 0 && parsedFiles.length === 0) {
            setError('Diff loaded but could not be parsed.')
          } else {
            setError(null)
          }
          setSelectedKey((prev) => {
            if (prev && parsedFiles.length > 0) {
              const prevKeyExists = parsedFiles.some((fileDiff, index) => {
                const name = fileDiff.name || fileDiff.prevName || 'Untitled'
                return `${name}-${index}` === prev
              })
              if (prevKeyExists) {
                return prev
              }
            }
            if (parsedFiles.length === 0) {
              return null
            }
            const firstName =
              parsedFiles[0].name || parsedFiles[0].prevName || 'Untitled'
            return `${firstName}-0`
          })
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load diff')
        }
      }
    }

    void load()
    const interval = window.setInterval(load, 1000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className={`app ${isCollapsed ? 'is-collapsed' : ''}`}>
      <Sidebar
        collapsed={isCollapsed}
        files={files}
        selectedKey={selectedKey}
        onSelectFile={(key) => setSelectedKey(key)}
        onToggle={() => setIsCollapsed((prev) => !prev)}
      />
      <main className="main">
        <DiffViewer
          patch={patch}
          error={error}
          fileDiffs={fileDiffs}
          selectedFile={selectedFile?.fileDiff ?? null}
        />
      </main>
    </div>
  )
}

export default App

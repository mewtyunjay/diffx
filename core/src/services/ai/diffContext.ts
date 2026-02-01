type DiffSnapshot = {
  unstaged: string
  staged: string
}

function normalizePath(filePath: string): string {
  return filePath.replace(/^[.][/\\]/, '').replace(/^[\\/]/, '')
}

function isDiffHeaderForPath(line: string, filePath: string): boolean {
  if (!line.startsWith('diff --git ')) return false
  const normalized = normalizePath(filePath)
  const parts = line.split(' ')
  const aPath = parts[2]?.replace(/^a\//, '') ?? ''
  const bPath = parts[3]?.replace(/^b\//, '') ?? ''
  return aPath === normalized || bPath === normalized
}

export function extractFileDiff(patch: string, filePath: string): string | null {
  if (!patch.trim()) return null
  const lines = patch.split('\n')
  let collecting = false
  let buffer: string[] = []

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (collecting) {
        return buffer.join('\n')
      }
      collecting = isDiffHeaderForPath(line, filePath)
      buffer = [line]
      continue
    }

    if (collecting) {
      buffer.push(line)
    }
  }

  return collecting ? buffer.join('\n') : null
}

export function buildCombinedDiff(snapshot: DiffSnapshot): string {
  const unstaged = snapshot.unstaged.trim() ? snapshot.unstaged : '(none)'
  const staged = snapshot.staged.trim() ? snapshot.staged : '(none)'

  return [
    '--- UNSTAGED ---',
    unstaged,
    '',
    '--- STAGED ---',
    staged,
  ].join('\n')
}

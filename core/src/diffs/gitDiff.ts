import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function getGitDiff(repoPath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['diff', '--no-color', '--no-ext-diff'], {
    cwd: repoPath,
  })

  return stdout
}

export async function getGitDiffStaged(repoPath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['diff', '--cached', '--no-color', '--no-ext-diff'], {
    cwd: repoPath,
  })

  return stdout
}

export async function stageFile(repoPath: string, filePath: string): Promise<void> {
  await execFileAsync('git', ['add', '--', filePath], {
    cwd: repoPath,
  })
}

export async function unstageFile(repoPath: string, filePath: string): Promise<void> {
  await execFileAsync('git', ['reset', 'HEAD', '--', filePath], {
    cwd: repoPath,
  })
}

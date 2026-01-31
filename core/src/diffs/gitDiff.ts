import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function getGitDiff(repoPath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['diff', '--no-color', '--no-ext-diff'], {
    cwd: repoPath,
  })

  return stdout
}

import { Codex } from '@openai/codex-sdk'

let codex: Codex | null = null

export function getCodexClient(): Codex {
  if (!codex) {
    codex = new Codex()
  }
  return codex
}

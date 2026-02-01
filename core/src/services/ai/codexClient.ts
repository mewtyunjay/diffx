import { Codex } from '@openai/codex-sdk'

const codexClients = new Map<string, Codex>()

export function getCodexClient(model?: string): Codex {
  const key = model ?? 'default'
  const existing = codexClients.get(key)
  if (existing) {
    return existing
  }
  const client = model ? new Codex({ model }) : new Codex()
  codexClients.set(key, client)
  return client
}

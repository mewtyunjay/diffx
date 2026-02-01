export function normalizeToText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.finalResponse === 'string') return record.finalResponse
  if (typeof record.output_text === 'string') return record.output_text
  if (typeof record.text === 'string') return record.text
  if (Array.isArray(record.items)) {
    const parts = record.items
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const message = item as Record<string, unknown>
        return typeof message.text === 'string' ? message.text : null
      })
      .filter((item): item is string => Boolean(item))
    if (parts.length) return parts.join('\n')
  }
  if (Array.isArray(record.output)) {
    const parts = record.output
      .map((item) => (typeof item === 'string' ? item : null))
      .filter((item): item is string => Boolean(item))
    if (parts.length) return parts.join('\n')
  }
  return null
}

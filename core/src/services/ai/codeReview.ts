import { getCodexClient } from './codexClient'
import { CODEX_MODELS } from './models'
import { normalizeToText } from './normalize'

export type ReviewCategory = 'bug' | 'security' | 'quality'
export type ReviewSeverity = 'critical' | 'warning' | 'suggestion'

export type ReviewFinding = {
  category: ReviewCategory
  severity: ReviewSeverity
  title: string
  description: string
  file?: string
  line?: number
}

export type ReviewResult = {
  summary: string
  findings: ReviewFinding[]
  stats: {
    bugs: number
    security: number
    quality: number
    critical: number
    warnings: number
    suggestions: number
  }
}

type AgentResult = {
  findings: ReviewFinding[]
}

function parseAgentResponse(raw: unknown, category: ReviewCategory): ReviewFinding[] {
  const text = normalizeToText(raw)
  if (!text) return []

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return []

  try {
    const parsed = JSON.parse(match[0]) as { findings?: unknown[] }
    if (!parsed.findings || !Array.isArray(parsed.findings)) return []

    return parsed.findings
      .map((finding: unknown) => {
        if (!finding || typeof finding !== 'object') return null
        const f = finding as Record<string, unknown>

        const severity = f.severity === 'critical' || f.severity === 'warning' || f.severity === 'suggestion'
          ? f.severity
          : 'suggestion'

        const title = typeof f.title === 'string' ? f.title.trim() : ''
        const description = typeof f.description === 'string' ? f.description.trim() : ''

        if (!title || !description) return null

        return {
          category,
          severity,
          title,
          description,
          file: typeof f.file === 'string' ? f.file : undefined,
          line: typeof f.line === 'number' ? f.line : undefined,
        } as ReviewFinding
      })
      .filter((f): f is ReviewFinding => f !== null)
  } catch {
    return []
  }
}

async function runBugHunterAgent(diff: string, repoPath: string | null): Promise<AgentResult> {
  const codex = getCodexClient(CODEX_MODELS.bugHunter)
  const thread = codex.startThread()

  const prompt = `You are a Bug Hunter agent. Analyze the code diff for potential bugs and issues.

Look for:
- Logic errors and incorrect conditions
- Null/undefined reference risks
- Off-by-one errors and boundary issues
- Race conditions and async problems
- Resource leaks (memory, file handles)
- Error handling gaps
- Edge cases not handled

Return ONLY JSON with this shape:
{"findings": [{"severity": "critical|warning|suggestion", "title": "...", "description": "...", "file": "filename", "line": number}]}

If no issues found, return {"findings": []}

Repository: ${repoPath ?? 'unknown'}

--- DIFF ---
${diff}`

  const response = await thread.run(prompt)
  return { findings: parseAgentResponse(response, 'bug') }
}

async function runSecurityAgent(diff: string, repoPath: string | null): Promise<AgentResult> {
  const codex = getCodexClient(CODEX_MODELS.security)
  const thread = codex.startThread()

  const prompt = `You are a Security Agent. Analyze the code diff for security vulnerabilities.

Look for OWASP Top 10 and common security issues:
- SQL Injection, Command Injection
- Cross-Site Scripting (XSS)
- Insecure authentication/authorization
- Sensitive data exposure (API keys, passwords, tokens)
- Security misconfigurations
- Insecure deserialization
- Using components with known vulnerabilities
- Improper input validation
- Path traversal vulnerabilities
- Hardcoded secrets or credentials

Return ONLY JSON with this shape:
{"findings": [{"severity": "critical|warning|suggestion", "title": "...", "description": "...", "file": "filename", "line": number}]}

If no issues found, return {"findings": []}

Repository: ${repoPath ?? 'unknown'}

--- DIFF ---
${diff}`

  const response = await thread.run(prompt)
  return { findings: parseAgentResponse(response, 'security') }
}

async function runQualityAgent(diff: string, repoPath: string | null): Promise<AgentResult> {
  const codex = getCodexClient(CODEX_MODELS.quality)
  const thread = codex.startThread()

  const prompt = `You are a Code Quality Agent. Analyze the code diff for quality improvements.

Look for:
- Code readability issues
- Naming conventions violations
- DRY principle violations (repeated code)
- SOLID principle violations
- Complex/nested conditionals that could be simplified
- Missing or inadequate comments for complex logic
- Inconsistent code style
- Performance anti-patterns
- Better API/library usage opportunities

Return ONLY JSON with this shape:
{"findings": [{"severity": "critical|warning|suggestion", "title": "...", "description": "...", "file": "filename", "line": number}]}

If no issues found, return {"findings": []}

Repository: ${repoPath ?? 'unknown'}

--- DIFF ---
${diff}`

  const response = await thread.run(prompt)
  return { findings: parseAgentResponse(response, 'quality') }
}

async function generateSummary(findings: ReviewFinding[], repoPath: string | null): Promise<string> {
  if (findings.length === 0) {
    return 'No issues found. The code changes look good!'
  }

  const codex = getCodexClient(CODEX_MODELS.summary)
  const thread = codex.startThread()

  const findingsText = findings.map((f, i) =>
    `${i + 1}. [${f.category.toUpperCase()}/${f.severity}] ${f.title}: ${f.description}`
  ).join('\n')

  const prompt = `You are a Code Review Summarizer. Create a brief 2-3 sentence summary of the code review findings.

Findings:
${findingsText}

Write a concise summary highlighting the most important issues. Be direct and actionable.
Return ONLY the summary text, no JSON or formatting.`

  const response = await thread.run(prompt)
  return normalizeToText(response) || 'Review completed with findings.'
}

export type CodeReviewInput = {
  repoPath: string | null
  fullDiff: string
  enableBugHunter?: boolean
  enableSecurity?: boolean
  enableQuality?: boolean
}

export async function runCodeReview({
  repoPath,
  fullDiff,
  enableBugHunter = true,
  enableSecurity = true,
  enableQuality = true,
}: CodeReviewInput): Promise<ReviewResult> {
  // Run enabled agents in parallel
  const agentPromises: Promise<AgentResult>[] = []

  if (enableBugHunter) {
    agentPromises.push(runBugHunterAgent(fullDiff, repoPath))
  }
  if (enableSecurity) {
    agentPromises.push(runSecurityAgent(fullDiff, repoPath))
  }
  if (enableQuality) {
    agentPromises.push(runQualityAgent(fullDiff, repoPath))
  }

  // Wait for all agents to complete
  const results = await Promise.all(agentPromises)

  // Combine all findings
  const allFindings = results.flatMap(r => r.findings)

  // Sort by severity (critical first, then warning, then suggestion)
  const severityOrder: Record<ReviewSeverity, number> = {
    critical: 0,
    warning: 1,
    suggestion: 2,
  }
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Generate summary
  const summary = await generateSummary(allFindings, repoPath)

  // Calculate stats
  const stats = {
    bugs: allFindings.filter(f => f.category === 'bug').length,
    security: allFindings.filter(f => f.category === 'security').length,
    quality: allFindings.filter(f => f.category === 'quality').length,
    critical: allFindings.filter(f => f.severity === 'critical').length,
    warnings: allFindings.filter(f => f.severity === 'warning').length,
    suggestions: allFindings.filter(f => f.severity === 'suggestion').length,
  }

  return {
    summary,
    findings: allFindings,
    stats,
  }
}

import { Router } from 'express'

import { env } from '../config/env'
import { getLatestDiff, getRepoPath } from '../services/diffs/watcher'
import { buildCombinedDiff, extractFileDiff } from '../services/ai/diffContext'
import { buildQuiz } from '../services/ai/quiz'
import { answerQuestion, decideScope } from '../services/ai/review'
import { generateCommitMessage, type CommitMessageStyle } from '../services/ai/commitMessage'
import { runCodeReview } from '../services/ai/codeReview'
import { appendQuizResult, readQuizResults } from '../services/quizResults'

export const aiRouter = Router()

aiRouter.post('/ai/review', async (req, res) => {
  if (!env.openaiApiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY not configured' })
    return
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
  const filePath = typeof req.body?.filePath === 'string' ? req.body.filePath.trim() : null
  const reviewConfig = req.body?.reviewConfig
  const scopePreference =
    typeof reviewConfig?.scopePreference === 'string' ? reviewConfig.scopePreference : null
  const styleInstructions =
    typeof reviewConfig?.instructions === 'string' ? reviewConfig.instructions.trim() : null

  if (!question) {
    res.status(400).json({ error: 'Question is required' })
    return
  }

  const repoPath = getRepoPath()
  const latest = getLatestDiff()
  const fullDiff = buildCombinedDiff(latest)
  const fileDiff = filePath ? extractFileDiff(`${latest.unstaged}\n${latest.staged}`, filePath) : null

  try {
    const decision =
      scopePreference === 'file' || scopePreference === 'repo'
        ? { scope: scopePreference, reason: 'User preference' }
        : await decideScope(question)
    const answer = await answerQuestion({
      question,
      scope: decision.scope,
      repoPath,
      filePath,
      fileDiff,
      fullDiff,
      styleInstructions,
    })

    res.json({
      scope: decision.scope,
      reason: decision.reason ?? null,
      answer,
    })
  } catch (error) {
    console.error('AI review failed:', error)
    res.status(500).json({ error: 'AI review failed' })
  }
})

aiRouter.post('/ai/quiz', async (req, res) => {
  if (!env.openaiApiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY not configured' })
    return
  }

  const count = Number(req.body?.count)
  const questionCount = Number.isFinite(count) && count > 0 && count <= 10 ? Math.floor(count) : 5
  const quizConfig = req.body?.quizConfig
  const rules = typeof quizConfig?.rules === 'string' ? quizConfig.rules.trim() : null
  const includeExplanations =
    typeof quizConfig?.includeExplanations === 'boolean' ? quizConfig.includeExplanations : undefined
  const repoPath = getRepoPath()
  const latest = getLatestDiff()
  const fullDiff = buildCombinedDiff(latest)

  try {
    const quiz = await buildQuiz({ repoPath, fullDiff, questionCount, rules, includeExplanations })
    res.json(quiz)
  } catch (error) {
    console.error('AI quiz failed:', error)
    res.status(500).json({ error: 'AI quiz failed' })
  }
})

aiRouter.post('/ai/commit-message', async (req, res) => {
  if (!env.openaiApiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY not configured' })
    return
  }

  const commitConfig = req.body?.commitConfig
  const followPreviousStyle =
    typeof commitConfig?.followPreviousStyle === 'boolean' ? commitConfig.followPreviousStyle : true
  const style: CommitMessageStyle =
    commitConfig?.style === 'conventional' ||
    commitConfig?.style === 'descriptive' ||
    commitConfig?.style === 'simple'
      ? commitConfig.style
      : 'conventional'
  const includeBody = typeof commitConfig?.includeBody === 'boolean' ? commitConfig.includeBody : true
  const customRules = typeof commitConfig?.customRules === 'string' ? commitConfig.customRules.trim() : null

  const repoPath = getRepoPath()
  const latest = getLatestDiff()
  const fullDiff = buildCombinedDiff(latest)

  if (!fullDiff.trim()) {
    res.status(400).json({ error: 'No changes to generate commit message for' })
    return
  }

  try {
    const result = await generateCommitMessage({
      repoPath,
      fullDiff,
      followPreviousStyle,
      style,
      includeBody,
      customRules,
    })
    res.json(result)
  } catch (error) {
    console.error('AI commit message generation failed:', error)
    res.status(500).json({ error: 'AI commit message generation failed' })
  }
})

aiRouter.post('/ai/code-review', async (req, res) => {
  if (!env.openaiApiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY not configured' })
    return
  }

  const reviewConfig = req.body?.reviewConfig
  const enableBugHunter = reviewConfig?.enableBugHunter !== false
  const enableSecurity = reviewConfig?.enableSecurity !== false
  const enableQuality = reviewConfig?.enableQuality !== false

  const repoPath = getRepoPath()
  const latest = getLatestDiff()
  const fullDiff = buildCombinedDiff(latest)

  if (!fullDiff.trim()) {
    res.status(400).json({ error: 'No changes to review' })
    return
  }

  try {
    const result = await runCodeReview({
      repoPath,
      fullDiff,
      enableBugHunter,
      enableSecurity,
      enableQuality,
    })
    res.json(result)
  } catch (error) {
    console.error('AI code review failed:', error)
    res.status(500).json({ error: 'AI code review failed' })
  }
})

aiRouter.get('/quiz/results', async (req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(400).json({ error: 'Repository not selected' })
    return
  }

  try {
    const results = await readQuizResults(repoPath)
    res.json({ results })
  } catch (error) {
    console.error('Failed to read quiz results:', error)
    res.status(500).json({ error: 'Failed to read quiz results' })
  }
})

aiRouter.post('/quiz/results', async (req, res) => {
  const repoPath = getRepoPath()
  if (!repoPath) {
    res.status(400).json({ error: 'Repository not selected' })
    return
  }

  const payload = req.body?.result
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ error: 'Result payload is required' })
    return
  }

  try {
    const stored = await appendQuizResult(repoPath, payload)
    res.json({ result: stored })
  } catch (error) {
    console.error('Failed to save quiz result:', error)
    res.status(500).json({ error: 'Failed to save quiz result' })
  }
})

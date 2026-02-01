import { Router } from 'express'

import { env } from '../config/env'
import { getLatestDiff, getRepoPath } from '../services/diffs/watcher'
import { buildCombinedDiff, extractFileDiff } from '../services/ai/diffContext'
import { buildQuiz } from '../services/ai/quiz'
import { answerQuestion, decideScope } from '../services/ai/review'

export const aiRouter = Router()

aiRouter.post('/ai/review', async (req, res) => {
  if (!env.openaiApiKey) {
    res.status(503).json({ error: 'OPENAI_API_KEY not configured' })
    return
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
  const filePath = typeof req.body?.filePath === 'string' ? req.body.filePath.trim() : null

  if (!question) {
    res.status(400).json({ error: 'Question is required' })
    return
  }

  const repoPath = getRepoPath()
  const latest = getLatestDiff()
  const fullDiff = buildCombinedDiff(latest)
  const fileDiff = filePath ? extractFileDiff(`${latest.unstaged}\n${latest.staged}`, filePath) : null

  try {
    const decision = await decideScope(question)
    const answer = await answerQuestion({
      question,
      scope: decision.scope,
      repoPath,
      filePath,
      fileDiff,
      fullDiff,
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
  const repoPath = getRepoPath()
  const latest = getLatestDiff()
  const fullDiff = buildCombinedDiff(latest)

  try {
    const quiz = await buildQuiz({ repoPath, fullDiff, questionCount })
    res.json(quiz)
  } catch (error) {
    console.error('AI quiz failed:', error)
    res.status(500).json({ error: 'AI quiz failed' })
  }
})

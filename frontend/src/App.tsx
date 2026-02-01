import { parsePatchFiles, type FileDiffMetadata } from '@pierre/diffs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DiffToolbar } from './components/diff/DiffToolbar'
import { DiffViewer } from './components/diff/DiffViewer'
import { SettingsDrawer } from './components/settings/SettingsDrawer'
import { Sidebar, type SidebarFile } from './components/sidebar/Sidebar'
import {
  buildExplainInstructions,
  buildQuizRules,
  defaultSettings,
  loadSettings,
  mergeSettings,
  saveSettings,
  type Settings,
} from './utils/settings'
import './App.css'

type FileEntry = SidebarFile & { fileDiff: FileDiffMetadata; status: 'staged' | 'unstaged' }

function insertByPath(base: FileEntry[], moved: FileEntry[]): FileEntry[] {
  if (moved.length === 0) return base
  const ordered = [...base]
  const movedSorted = [...moved].sort((a, b) => a.path.localeCompare(b.path))
  movedSorted.forEach((file) => {
    const insertIndex = ordered.findIndex((entry) => entry.path.localeCompare(file.path) > 0)
    if (insertIndex === -1) {
      ordered.push(file)
    } else {
      ordered.splice(insertIndex, 0, file)
    }
  })
  return ordered
}

function parseFileDiffs(
  patchText: string,
  status: 'staged' | 'unstaged'
): FileEntry[] {
  if (!patchText.trim()) return []
  const parsed = parsePatchFiles(patchText)
  const parsedFiles = parsed.flatMap((entry) => entry.files ?? [])
  return parsedFiles.map((fileDiff, index) => {
    const additions = fileDiff.hunks.reduce(
      (total, hunk) => total + (hunk.additionLines ?? 0),
      0
    )
    const deletions = fileDiff.hunks.reduce(
      (total, hunk) => total + (hunk.deletionLines ?? 0),
      0
    )
    const name = fileDiff.name || fileDiff.prevName || 'Untitled'
    const key = `${status}:${name}:${index}`
    return {
      key,
      path: name,
      additions,
      deletions,
      fileDiff,
      status,
    }
  })
}

function App() {
  const [unstagedPatch, setUnstagedPatch] = useState('')
  const [stagedPatch, setStagedPatch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>('split')
  const [pendingStage, setPendingStage] = useState<Set<string>>(new Set())
  const [pendingUnstage, setPendingUnstage] = useState<Set<string>>(new Set())
  const [repoPath, setRepoPath] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(true)
  const [reviewMode, setReviewMode] = useState<'explain' | 'quiz' | 'review'>('explain')
  const [reviewInput, setReviewInput] = useState('')
  const [reviewLog, setReviewLog] = useState<
    { id: number; role: 'user' | 'assistant'; content: string }[]
  >([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  type QuizQuestion = {
    id: string
    prompt: string
    options: string[]
    answerIndex?: number
    explanation?: string
  }
  type QuizResult = {
    id: number
    score: number
    total: number
    answered: number
    completedAt: string
    questions: QuizQuestion[]
    answers: Record<string, number | null>
  }

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({})
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizView, setQuizView] = useState<'quiz' | 'results'>('quiz')
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])

  type ReviewFinding = {
    category: 'bug' | 'security' | 'quality'
    severity: 'critical' | 'warning' | 'suggestion'
    title: string
    description: string
    file?: string
    line?: number
  }
  type CodeReviewResult = {
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
  const [codeReviewResult, setCodeReviewResult] = useState<CodeReviewResult | null>(null)
  const [codeReviewLoading, setCodeReviewLoading] = useState(false)
  const [codeReviewError, setCodeReviewError] = useState<string | null>(null)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const handleSettingsChange = useCallback((next: Settings) => {
    setSettings(mergeSettings(next))
  }, [])

  const handleSettingsReset = useCallback(() => {
    setSettings(defaultSettings)
  }, [])

  const parsedStaged = useMemo(() => parseFileDiffs(stagedPatch, 'staged'), [stagedPatch])
  const parsedUnstaged = useMemo(() => parseFileDiffs(unstagedPatch, 'unstaged'), [unstagedPatch])
  const hasChanges = parsedStaged.length + parsedUnstaged.length > 0

  const stagedFiles = useMemo(() => {
    const base = parsedStaged.filter((file) => !pendingUnstage.has(file.path))
    const moved = parsedUnstaged
      .filter((file) => pendingStage.has(file.path))
      .map((file) => ({ ...file, key: `staged:${file.path}:pending` }))
    return insertByPath(base, moved).map((file) => ({
      key: file.key,
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
    }))
  }, [parsedStaged, parsedUnstaged, pendingStage, pendingUnstage])

  const unstagedFiles = useMemo(() => {
    const base = parsedUnstaged.filter((file) => !pendingStage.has(file.path))
    const moved = parsedStaged
      .filter((file) => pendingUnstage.has(file.path))
      .map((file) => ({ ...file, key: `unstaged:${file.path}:pending` }))
    return insertByPath(base, moved).map((file) => ({
      key: file.key,
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
    }))
  }, [parsedStaged, parsedUnstaged, pendingStage, pendingUnstage])

  const allFiles = useMemo(() => [...parsedStaged, ...parsedUnstaged], [parsedStaged, parsedUnstaged])

  const selectedFile = useMemo(() => {
    if (!selectedPath) return null
    return allFiles.find((file) => file.path === selectedPath) ?? null
  }, [selectedPath, allFiles])

  const selectedFilename =
    selectedFile?.fileDiff.name || selectedFile?.fileDiff.prevName || selectedFile?.path || null

  const load = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/diffs/latest')
      if (!response.ok) {
        throw new Error(`Failed to load diff (${response.status})`)
      }
      const data = (await response.json()) as { unstaged?: string; staged?: string }
      const unstaged = data.unstaged ?? ''
      const staged = data.staged ?? ''

      setUnstagedPatch(unstaged)
      setStagedPatch(staged)

      const hasContent = unstaged.trim() || staged.trim()
      const stagedParsed = parseFileDiffs(staged, 'staged')
      const unstagedParsed = parseFileDiffs(unstaged, 'unstaged')
      const allParsed = [...stagedParsed, ...unstagedParsed]
      const allPaths = new Set(allParsed.map((file) => file.path))

      setPendingStage((prev) => {
        const next = new Set([...prev].filter((path) => allPaths.has(path)))
        return next.size === prev.size ? prev : next
      })
      setPendingUnstage((prev) => {
        const next = new Set([...prev].filter((path) => allPaths.has(path)))
        return next.size === prev.size ? prev : next
      })

      if (hasContent && allParsed.length === 0) {
        setError('Diff loaded but could not be parsed.')
      } else {
        setError(null)
      }

      setSelectedPath((prev) => {
        if (!prev) {
          return allParsed.length > 0 ? allParsed[0].path : null
        }
        const stillExists = allParsed.some((f) => f.path === prev)
        return stillExists ? prev : (allParsed.length > 0 ? allParsed[0].path : null)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diff')
    }
  }, [])

  const fetchQuiz = useCallback(async () => {
    setQuizLoading(true)
    setQuizError(null)
    setQuizSubmitted(false)
    try {
      const quizRules = buildQuizRules(settings.quiz)
      const response = await fetch('http://localhost:3001/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: settings.quiz.questionCount,
          quizConfig: {
            rules: quizRules,
            includeExplanations: settings.quiz.includeExplanations,
          },
        }),
      })
      if (!response.ok) {
        throw new Error(`Failed to build quiz (${response.status})`)
      }
      const data = (await response.json()) as {
        questions?: {
          id?: string
          prompt?: string
          options?: string[]
          answerIndex?: number
          explanation?: string
        }[]
      }
      const questions =
        data.questions?.filter(
          (question): question is {
            id: string
            prompt: string
            options: string[]
            answerIndex?: number
            explanation?: string
          } =>
            typeof question.id === 'string' &&
            typeof question.prompt === 'string' &&
            Array.isArray(question.options)
        ) ?? []
      setQuizQuestions(questions)
      setQuizAnswers(
        questions.reduce<Record<string, number | null>>((acc, question) => {
          acc[question.id] = null
          return acc
        }, {})
      )
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : 'Failed to load quiz.')
    } finally {
      setQuizLoading(false)
    }
  }, [settings.quiz])

  const loadQuizResults = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/quiz/results')
      if (!response.ok) return
      const data = (await response.json()) as { results?: QuizResult[] }
      if (Array.isArray(data.results)) {
        setQuizResults(data.results)
      }
    } catch (error) {
      console.error('Failed to load quiz results:', error)
    }
  }, [])

  const fetchCodeReview = useCallback(async () => {
    setCodeReviewLoading(true)
    setCodeReviewError(null)
    try {
      const response = await fetch('http://localhost:3001/ai/code-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewConfig: {
            enableBugHunter: settings.codeReview.enableBugHunter,
            enableSecurity: settings.codeReview.enableSecurity,
            enableQuality: settings.codeReview.enableQuality,
          },
        }),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Code review failed (${response.status})`)
      }
      const data = (await response.json()) as CodeReviewResult
      setCodeReviewResult(data)
    } catch (error) {
      setCodeReviewError(error instanceof Error ? error.message : 'Code review failed.')
    } finally {
      setCodeReviewLoading(false)
    }
  }, [settings.codeReview])

  useEffect(() => {
    void load()
    const interval = window.setInterval(load, 1000)
    return () => window.clearInterval(interval)
  }, [load])

  useEffect(() => {
    void loadQuizResults()
  }, [loadQuizResults])

  useEffect(() => {
    let isMounted = true
    fetch('http://localhost:3001/repo')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isMounted || !data || typeof data.path !== 'string') return
        setRepoPath(data.path)
      })
      .catch(() => null)
    return () => {
      isMounted = false
    }
  }, [])

  const handleStageFile = useCallback((filePath: string) => {
    setPendingStage((prev) => new Set(prev).add(filePath))
    setPendingUnstage((prev) => {
      const next = new Set(prev)
      next.delete(filePath)
      return next
    })
    fetch('http://localhost:3001/git/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    }).catch((err) => console.error('Failed to stage file:', err))
  }, [])

  const handleUnstageFile = useCallback((filePath: string) => {
    setPendingUnstage((prev) => new Set(prev).add(filePath))
    setPendingStage((prev) => {
      const next = new Set(prev)
      next.delete(filePath)
      return next
    })
    fetch('http://localhost:3001/git/unstage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    }).catch((err) => console.error('Failed to unstage file:', err))
  }, [])

  const handleCommit = useCallback(
    async (message: string) => {
      const response = await fetch('http://localhost:3001/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!response.ok) {
        let detail = `Failed to commit (${response.status})`
        try {
          const data = (await response.json()) as { error?: string }
          if (typeof data.error === 'string' && data.error.trim()) {
            detail = data.error
          }
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(detail)
      }
      await load()
    },
    [load]
  )

  const handlePush = useCallback(async () => {
    const response = await fetch('http://localhost:3001/git/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      let detail = `Failed to push (${response.status})`
      try {
        const data = (await response.json()) as { error?: string }
        if (typeof data.error === 'string' && data.error.trim()) {
          detail = data.error
        }
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(detail)
    }
  }, [])

  const handleStash = useCallback(async () => {
    const response = await fetch('http://localhost:3001/git/stash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      let detail = `Failed to stash (${response.status})`
      try {
        const data = (await response.json()) as { error?: string }
        if (typeof data.error === 'string' && data.error.trim()) {
          detail = data.error
        }
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(detail)
    }
    await load()
  }, [load])

  const handleReviewSubmit = useCallback(async () => {
    const question = reviewInput.trim()
    if (!question || reviewLoading) return

    setReviewInput('')
    setReviewError(null)
    setReviewLoading(true)
    setReviewLog((prev) => [...prev, { id: Date.now(), role: 'user', content: question }])

    try {
      const instructions = buildExplainInstructions(settings.explain)
      const response = await fetch('http://localhost:3001/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          filePath: selectedPath,
          reviewConfig: {
            scopePreference: settings.explain.scopePreference,
            instructions,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`)
      }

      const data = (await response.json()) as { answer?: string }
      const answer = data.answer ?? 'No response.'
      setReviewLog((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: answer }])
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setReviewLoading(false)
    }
  }, [reviewInput, reviewLoading, selectedPath, settings.explain])

  const handleQuizSelect = useCallback((questionId: string, optionIndex: number) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }, [])

  const handleQuizSubmit = useCallback(() => {
    const total = quizQuestions.length
    const answered = Object.values(quizAnswers).filter((value) => value != null).length
    const score = quizQuestions.reduce((sum, question) => {
      const answer = quizAnswers[question.id]
      if (answer == null) return sum
      if (question.answerIndex == null) return sum
      return sum + (answer === question.answerIndex ? 1 : 0)
    }, 0)
    const completedAt = new Date().toLocaleString()
    const result = {
      id: Date.now(),
      score,
      total,
      answered,
      completedAt,
      questions: quizQuestions,
      answers: quizAnswers,
    }
    setQuizResults((prev) => [result, ...prev])
    fetch('http://localhost:3001/quiz/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    }).catch((error) => console.error('Failed to save quiz result:', error))
    setQuizSubmitted(true)
    setQuizView('results')
  }, [quizAnswers, quizQuestions])

  return (
    <div className="app">
      <Sidebar
        stagedFiles={stagedFiles}
        unstagedFiles={unstagedFiles}
        selectedPath={selectedPath}
        repoPath={repoPath}
        commitMessageSettings={settings.commitMessage}
        onSelectFile={(path) => setSelectedPath(path)}
        onStageFile={handleStageFile}
        onUnstageFile={handleUnstageFile}
        onCommit={handleCommit}
        onPush={handlePush}
        onStash={handleStash}
      />
      <main className="main">
        <div className={`workspace ${reviewOpen ? 'review-open' : 'review-closed'}`}>
          <section className="diff-panel">
            <DiffToolbar
              fileName={selectedFilename}
              diffMode={diffMode}
              onDiffModeChange={setDiffMode}
              hasSelection={selectedFile != null}
            />
            <div className="main-content">
              <DiffViewer
                error={error}
                hasChanges={hasChanges}
                selectedFile={selectedFile?.fileDiff ?? null}
                diffMode={diffMode}
              />
            </div>
          </section>
          <aside className="review-drawer" aria-label="Review panel">
            <section className="review-panel" aria-hidden={!reviewOpen}>
              <div className="review-header">
                <span>Review</span>
                <div className="review-header-actions">
                  <button
                    type="button"
                    className="review-clear"
                    onClick={() => {
                      setReviewLog([])
                      setReviewError(null)
                      setReviewInput('')
                      setQuizQuestions([])
                      setQuizAnswers({})
                      setQuizError(null)
                      setQuizSubmitted(false)
                      setQuizResults([])
                      setQuizView('quiz')
                      setCodeReviewResult(null)
                      setCodeReviewError(null)
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="review-settings"
                    aria-label="Open settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M10.6 2.1h2.8l.5 2.2a7.7 7.7 0 0 1 1.9.8l2-1.2 2 2-1.2 2a7.7 7.7 0 0 1 .8 1.9l2.2.5v2.8l-2.2.5a7.7 7.7 0 0 1-.8 1.9l1.2 2-2 2-2-1.2a7.7 7.7 0 0 1-1.9.8l-.5 2.2h-2.8l-.5-2.2a7.7 7.7 0 0 1-1.9-.8l-2 1.2-2-2 1.2-2a7.7 7.7 0 0 1-.8-1.9L2 13.4v-2.8l2.2-.5a7.7 7.7 0 0 1 .8-1.9l-1.2-2 2-2 2 1.2a7.7 7.7 0 0 1 1.9-.8l.5-2.2Zm1.4 6.4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="review-tabs" role="tablist" aria-label="Review modes">
                <button
                  type="button"
                  role="tab"
                  aria-selected={reviewMode === 'explain'}
                  className={reviewMode === 'explain' ? 'active' : undefined}
                  onClick={() => setReviewMode('explain')}
                >
                  Explain
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reviewMode === 'quiz'}
                  className={reviewMode === 'quiz' ? 'active' : undefined}
                  onClick={() => setReviewMode('quiz')}
                >
                  Quiz
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reviewMode === 'review'}
                  className={reviewMode === 'review' ? 'active' : undefined}
                  onClick={() => setReviewMode('review')}
                >
                  Review
                </button>
              </div>
              <div className="review-body">
                {reviewMode === 'explain' && (
                  <div className="review-log">
                    {reviewLog.length === 0 ? (
                      <p>Ask questions about the current diff or the whole commit.</p>
                    ) : (
                      reviewLog.map((entry) => (
                        <div key={entry.id} className={`review-msg ${entry.role}`}>
                          <span>{entry.role === 'user' ? 'You' : 'DiffX'}</span>
                          <div className="review-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                    {reviewLoading && <p className="review-status">Thinking…</p>}
                    {reviewError && <p className="review-error">{reviewError}</p>}
                  </div>
                )}
                {reviewMode === 'quiz' && (
                  <div className="quiz-panel">
                    {quizView === 'results' ? (
                      <div className="quiz-results">
                        <div className="quiz-results-header">
                          <span>Results</span>
                          <span>{quizResults.length} attempt(s)</span>
                        </div>
                        {quizResults.length === 0 ? (
                          <p>No results yet. Take a quiz first.</p>
                        ) : (
                          <div className="quiz-results-list">
                            {quizResults.map((result, resultIndex) => (
                              <details key={result.id} className="quiz-result-card">
                                <summary>
                                  <span>
                                    Attempt {quizResults.length - resultIndex} • {result.completedAt}
                                  </span>
                                  <span>
                                    Score {result.score}/{result.total} ({result.answered} attempted)
                                  </span>
                                </summary>
                                <div className="quiz-result-questions">
                                  {result.questions.map((question, index) => {
                                    const chosen = result.answers[question.id]
                                    return (
                                      <div key={question.id} className="quiz-result-question">
                                        <div className="quiz-question">
                                          <span className="quiz-index">Q{index + 1}</span>
                                          <p>{question.prompt}</p>
                                        </div>
                                        <div className="quiz-options">
                                          {question.options.map((option, optionIndex) => {
                                            const isSelected = chosen === optionIndex
                                            const isCorrect = question.answerIndex === optionIndex
                                            return (
                                              <div
                                                key={`${question.id}:${optionIndex}`}
                                                className={`quiz-option-result${isSelected ? ' selected' : ''}${
                                                  isCorrect ? ' correct' : ''
                                                }`}
                                              >
                                                <span>{option}</span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                        {question.explanation ? (
                                          <p className="quiz-explanation">{question.explanation}</p>
                                        ) : null}
                                      </div>
                                    )
                                  })}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {quizLoading && <p className="review-status">Generating quiz…</p>}
                        {quizError && <p className="review-error">{quizError}</p>}
                        {!quizLoading && !quizError && quizQuestions.length > 0 && (
                          <div className="quiz-list">
                            {quizQuestions.map((question, index) => (
                              <div key={question.id} className="quiz-card">
                                <div className="quiz-question">
                                  <span className="quiz-index">Q{index + 1}</span>
                                  <p>{question.prompt}</p>
                                </div>
                                <div className="quiz-options">
                                  {question.options.map((option, optionIndex) => (
                                    <button
                                      key={`${question.id}:${optionIndex}`}
                                      type="button"
                                      className={
                                        quizAnswers[question.id] === optionIndex ? 'selected' : undefined
                                      }
                                      onClick={() => handleQuizSelect(question.id, optionIndex)}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {reviewMode === 'review' && (
                  <div className="review-code-panel">
                    {codeReviewLoading && <p className="review-status">Running code review agents...</p>}
                    {codeReviewError && <p className="review-error">{codeReviewError}</p>}
                    {!codeReviewLoading && !codeReviewError && !codeReviewResult && (
                      <p className="review-code-placeholder">
                        Run AI-powered code review to analyze your changes for bugs, security issues, and code quality.
                      </p>
                    )}
                    {!codeReviewLoading && codeReviewResult && (
                      <div className="code-review-results">
                        <div className="code-review-header">
                          <div className="code-review-title">Code Review</div>
                          <div className="code-review-stats">
                            <span className="stat-bugs" title="Bugs">
                              Bugs: {codeReviewResult.stats.bugs}
                            </span>
                            <span className="stat-security" title="Security">
                              Security: {codeReviewResult.stats.security}
                            </span>
                            <span className="stat-quality" title="Quality">
                              Quality: {codeReviewResult.stats.quality}
                            </span>
                            <span className="stat-critical" title="Critical">
                              Critical: {codeReviewResult.stats.critical}
                            </span>
                            <span className="stat-warnings" title="Warnings">
                              Warnings: {codeReviewResult.stats.warnings}
                            </span>
                            <span className="stat-suggestions" title="Suggestions">
                              Suggestions: {codeReviewResult.stats.suggestions}
                            </span>
                          </div>
                          <div className="code-review-summary">
                            <p>{codeReviewResult.summary}</p>
                          </div>
                        </div>
                        {codeReviewResult.findings.length > 0 && (
                          <div className="code-review-findings">
                            {codeReviewResult.findings.map((finding, index) => (
                              <details
                                key={index}
                                className={`code-review-accordion severity-${finding.severity}`}
                              >
                                <summary className="finding-summary">
                                  <span className="finding-badges">
                                    <span className={`finding-badge category-${finding.category}`}>
                                      {finding.category}
                                    </span>
                                    <span className={`finding-badge severity-${finding.severity}`}>
                                      {finding.severity}
                                    </span>
                                  </span>
                                </summary>
                                <div className="finding-body">
                                  <div className="finding-title">{finding.title}</div>
                                  <div className="finding-description">{finding.description}</div>
                                  {finding.file && (
                                    <div className="finding-location">
                                      📄 {finding.file}
                                      {finding.line && `:${finding.line}`}
                                    </div>
                                  )}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {reviewMode === 'review' && (
                <div className="code-review-generate-row">
                  <button
                    type="button"
                    onClick={fetchCodeReview}
                    disabled={codeReviewLoading || !hasChanges}
                  >
                    {codeReviewLoading ? 'Reviewing...' : 'Generate Review'}
                  </button>
                </div>
              )}
              {reviewMode === 'quiz' && (
                <>
                  {quizView === 'quiz' && (
                    <div className="quiz-generate-row">
                      <button type="button" onClick={fetchQuiz} disabled={quizLoading}>
                        Generate quiz
                      </button>
                      <button type="button" onClick={() => setQuizView('results')}>
                        Past results
                      </button>
                    </div>
                  )}
                  {quizView === 'results' && (
                    <div className="quiz-generate-row">
                      <button type="button" onClick={fetchQuiz} disabled={quizLoading}>
                        Generate quiz
                      </button>
                      <button type="button" onClick={() => setQuizView('quiz')}>
                        Back to quiz
                      </button>
                    </div>
                  )}
                  <div className="review-footer">
                    <span>
                      Attempted {Object.values(quizAnswers).filter((value) => value != null).length}/
                      {quizQuestions.length}
                    </span>
                    <div className="quiz-footer-actions">
                      <button
                        type="button"
                        onClick={handleQuizSubmit}
                        disabled={quizQuestions.length === 0}
                      >
                        {quizSubmitted ? 'Submitted' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {reviewMode === 'explain' && (
                <div className="review-chat">
                  <input
                    type="text"
                    placeholder="Ask about these changes"
                    aria-label="Ask about these changes"
                    value={reviewInput}
                    onChange={(event) => setReviewInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleReviewSubmit()
                      }
                    }}
                  />
                  <button type="button" onClick={() => void handleReviewSubmit()}>
                    Send
                  </button>
                </div>
              )}
            </section>
            <button
              type="button"
              className="review-rail"
              aria-label={reviewOpen ? 'Collapse review panel' : 'Expand review panel'}
              onClick={() => setReviewOpen((open) => !open)}
            >
              Review
            </button>
          </aside>
        </div>
      </main>
      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={handleSettingsChange}
        onReset={handleSettingsReset}
      />
    </div>
  )
}

export default App

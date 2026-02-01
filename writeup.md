# DiffX Write-ups

## Project Write-up
DiffX (Diff Explorer) is the missing layer between AI codegen and safe shipping. For junior devs, it turns every diff into a learning loop: file-by-file rendering, chat that explains the change in context, and a quiz that forces recall before they can commit. This directly tackles the comprehension gap that opens when writing is cheap and understanding is not, a risk highlighted by Anthropic’s work on AI assistance and skill formation (https://www.anthropic.com/research/AI-assistance-coding-skills). For senior devs, DiffX protects the scarce resource that matters most: uninterrupted review time. A utilitarian UI, per-diff Q&A, and multi-agent review surface issues fast, while bundled git actions (commit, message generation, push) keep the loop tight and focused. Strict Mode anchors this flow by requiring a quiz tied to the current diff hash before commit/push, so the knowledge check stays locked to the exact change set. Net: juniors learn faster, seniors stay in flow, and teams ship at AI speed without losing human judgment.

## OpenAI Usage Write-up
DiffX was built with OpenAI Codex end-to-end. I used GPT-5.2-Codex for coding and architecture, then wired the product’s core AI features through the Codex SDK: per-diff Q&A (Explain), quiz generation, commit message generation, and a multi-agent code review (bug, security, quality) running in parallel. The SDK’s thread model (startThread() + run()) made it easy to orchestrate these agents inside the backend. I also leveraged Codex as a development partner throughout ideation -> implementation, keeping prompts tight and scoped to the live diff context. Codex’s agent-style workflow is well suited for code review and repo-aware tasks, which maps directly to DiffX’s goals.

| Feature | Model | Rationale |
| --- | --- | --- |
| Bug Hunter | gpt-5.2-codex | Deep logic analysis |
| Security | gpt-5.2-codex | Can't miss vulnerabilities |
| Quality | gpt-5.1-codex-mini | Pattern matching |
| Summary | gpt-5.1-codex-mini | Text aggregation |
| Commit Message | gpt-5.1-codex-mini | Structured, simple |
| Explain/Review | gpt-5.1-codex | Good comprehension needed |
| Quiz Generator | gpt-5.2-codex | Educational quality matters |

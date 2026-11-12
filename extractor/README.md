# GitHub Knowledge Extraction — Phase 2/3 Prototype

Standalone Streamlit prototype for the "Automated Project Knowledge Management System" project.
Connects to a GitHub repo (public or private), pulls commits/PRs/reviews/comments/source code,
and runs it through an LLM to produce cited `KnowledgeItem`s.

See `docs/PROGRESS.md` for the full history of what was tried, what broke, and why things are
built the way they are now.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in tokens, or paste them into the sidebar at runtime
streamlit run app/streamlit_app.py
```

## GitHub auth

Use a **fine-grained personal access token**:
1. https://github.com/settings/tokens?type=beta → "Generate new token"
2. Under "Repository access", select only the specific repo(s) you're testing
3. Under "Permissions", grant read-only: **Contents**, **Pull requests**, **Metadata**

This works for private repos the token owner can already access, without exposing the rest of
their GitHub account. A classic `repo`-scope token is intentionally not used here — it would
grant blanket read access to every private repo the token owner can see.

For the production version, replace this with a GitHub App (org installs it on chosen repos,
backend exchanges a signed JWT for short-lived installation tokens) — noted as future work in
`docs/PROGRESS.md`, not built here since it needs an install flow + webhook receiver.

## LLM provider

Default is **Gemini 2.5 Flash** via its OpenAI-compatible endpoint — get a free key at
https://aistudio.google.com/apikey. Groq is kept as a selectable fallback if you want to compare.

## Files

```
app/
  config.py          # provider registry, token budgets, source-file limits
  token_utils.py      # tiktoken-based (or heuristic) token counting/truncation
  github_client.py     # GitHub REST client: pagination, private-repo auth, source file fetch
  llm_client.py        # provider-agnostic OpenAI-compatible LLM wrapper
  extractor.py          # evidence building + token-budgeted batching + extraction + dedup
  models.py              # KnowledgeItem / Evidence pydantic models
  streamlit_app.py        # UI
docs/
  PROGRESS.md               # full decision log
```

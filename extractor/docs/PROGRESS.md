# Phase 2 & 3 — Progress Log

Automated Project Knowledge Management System — Ramdeobaba University
Owner of Phase 2 (GitHub Integration & Ingestion) and Phase 3 (Knowledge Extraction): Kanak Agrawal

---

## Where this started

Used ChatGPT to sketch a first prototype answering "how will MCP extract things from GitHub,
and how will the LLM extract knowledge from it." It produced a working but minimal Streamlit
app:

- `github_client.py` — GitHub REST API wrapper (classic PAT, single-page fetches, public/private
  repos untested)
- `extractor.py` — builds a text "evidence" blob from commits/PR descriptions/reviews/comments,
  sends it to an LLM (Groq, `openai/gpt-oss-120b`) with a JSON-only system prompt, validates that
  every returned `evidence_ids` entry actually exists
- `models.py` — `KnowledgeItem` Pydantic model (title, knowledge_type, summary, details, module,
  confidence, evidence_ids)
- `streamlit_app.py` — sidebar config (token, LLM key, base URL, model, PR/commit sliders), repo
  URL input, raw evidence viewer, extracted knowledge cards with evidence citations

This correctly demonstrates the core idea: **evidence in → structured, cited knowledge out** —
which is the seminar deliverable (connect repo → ingest → extract → display with evidence).

## Problems found while testing

1. **`kanakagrawal23/automated-answer-evaluation` → 0 PRs, 0 knowledge items.**
   Diagnosis: the repo genuinely has no pull requests (commit-only history), so the extractor had
   nothing but bare commit messages to reason from and correctly declined to fabricate
   TECHNICAL_DECISION items. Not a bug — a demonstration that the pipeline needs PR/review
   discussion (or source code) to explain *why*, not just *what changed*.

2. **`KrishnaV2/duhacks5` → `413 Request too large`, Groq TPM limit 8000, requested 11649.**
   Diagnosis: `build_context()` capped the evidence blob at `[:45000]` **characters**, not tokens.
   A single PR with 23 changed files blew past that in tokens well before hitting the character
   cap. There was no batching — one oversized call meant zero knowledge extracted for that PR.

3. **MCP confusion.** The `mcpServers` JSON ChatGPT included is a config format for AI chat
   clients (Claude Desktop/Claude Code) to use GitHub as a tool — it is not an architecture
   piece for a standalone Streamlit/Spring Boot ingestion service. Clarified that MCP becomes
   relevant later, in **Phase 8 (Project Knowledge Agent)**, not Phase 2/3.

4. **Auth model was a full-scope classic PAT.** Flagged as a real security concern for a
   prototype where users paste tokens into a browser sidebar — a classic `repo`-scope token
   grants read access to *every* repo the token owner can see, private or not.

5. **No source code was ever fetched.** The extractor only ever saw commit messages, PR text,
   and diffs — never actual file contents. That's enough for `TECHNICAL_DECISION` and
   `PROBLEM_RESOLUTION` items, but not for `MODULE_RESPONSIBILITY` items ("this file/module is
   responsible for X"), which need to be read off real code.

## Decisions made and changes shipped

| Area | Before | After | Why |
|---|---|---|---|
| GitHub auth | Classic PAT (full `repo` scope) | Fine-grained PAT scoped to specific repos, read-only (Contents/PRs/Metadata) | Limits blast radius; still works for private repos the token owner can access. GitHub App flagged as the "real" future-work answer (Phase 9-10) |
| Pagination | Single page only | Follows `Link` header via `_get_paginated`, capped by the requested limit | Repos with >100 commits/PRs no longer silently truncate to page 1 |
| Token budgeting | `context[:45000]` character slice | Real token counting (`tiktoken`, falling back to a chars/4 heuristic) + greedy bin-packing into multiple batches, each under a configurable token budget | Fixes the 413 seen on `duhacks5`; large repos degrade to "more LLM calls" instead of "one failed call" |
| LLM provider | Groq `openai/gpt-oss-120b` (8K TPM on free tier) | Default: Gemini 2.5 Flash via its OpenAI-compatible endpoint (huge context window, cheap, strong structured JSON). Groq kept as a selectable fallback. Phi considered and rejected for this task — too weak at long-context structured extraction for a model meant for local/edge use | Removes the token-budget pressure that caused the original crash; keeps the same `openai` SDK call shape so nothing else had to change |
| Source code | Never fetched | `github_client.key_source_files()` walks the repo's git tree via the Contents API and pulls a capped, filtered sample of real source files as additional evidence (`SOURCE:<path>` evidence IDs) | Enables `MODULE_RESPONSIBILITY` extraction, which needs actual code, not just commit talk |
| Evidence merging | N/A (single call) | Knowledge items from all batches are merged and de-duplicated by normalized title | Keeps the final list clean when the same decision surfaces in more than one batch |

## Known limitations / next steps

- Source file selection is a naive "closest to repo root, skip huge/vendor/test dirs" heuristic —
  a real version should prioritize files touched by recent commits/PRs instead.
- Dedup by exact-ish title match is crude; a semantic similarity check (this is where Phase 7's
  pgvector embeddings could double as a dedup mechanism later) would catch paraphrased repeats.
- Fine-grained PAT still requires the *user* to create and paste a token — a GitHub App (Phase
  9-10 candidate) would remove that step entirely and support org-wide installs.
- Not yet wired into the Spring Boot backend / Postgres schema from Phase 0-1 — this is still a
  standalone Streamlit prototype for validating the extraction approach before backend
  integration.

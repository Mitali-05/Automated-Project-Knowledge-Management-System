# Automated Project Knowledge Management System — Working Spec

## 1. Database Schema (for AWS RDS Postgres + pgvector)

Principle: **we store extracted knowledge + lightweight pointers, never raw GitHub content.**
Full commit diffs, PR bodies, file contents etc. are fetched live via MCP/GitHub API when a user
clicks "view source." We only cache a short excerpt when it's cheap and clearly useful.

```sql
-- Org & Identity
organizations (id, name, created_at)
users (id, org_id, name, email, password_hash, created_at)

-- Projects & Access
projects (id, org_id, name, description, created_by, created_at)
project_members (id, project_id, user_id, role ENUM('owner','contributor'), added_at)
-- A project is invisible in listing/search to anyone not in project_members.

-- Repo connections (per-project, multi-repo supported)
project_repositories (
  id, project_id, repo_owner, repo_name,
  connection_type ENUM('mcp','pat','github_app'),
  connection_ref TEXT,          -- MCP server id / token ref / installation id (never raw secret)
  added_at
)

-- Sync tracking
sync_jobs (
  id, project_repository_id, status ENUM('queued','running','done','failed'),
  started_at, finished_at,
  last_synced_commit_sha, last_synced_pr_number, error_message
)

-- Contributors (people, not platform users — derived from GitHub identities)
contributors (
  id, project_id, github_username, mapped_user_id NULLABLE,
  commit_count, pr_count, last_active_at
)

-- Core knowledge model
knowledge_items (
  id, project_id, module_id NULLABLE,
  type ENUM('decision','module_summary','workflow','process','troubleshooting'),
  title, content TEXT, confidence_score FLOAT,
  status ENUM('fresh','stale'), created_at, updated_at
)

knowledge_evidence (
  id, knowledge_item_id,
  source_type ENUM('commit','pull_request','pr_review','pr_comment','jira_issue','ai_prompt'),
  source_ref TEXT,              -- commit SHA / PR number / issue key
  external_url TEXT,            -- direct link back to GitHub/Jira
  excerpt_cache TEXT NULLABLE,  -- short cached snippet ONLY, not full content
  created_at
)

-- Modules (logical grouping of code, not literal folders necessarily)
modules (
  id, project_id, name, path_pattern, description,
  freshness_status ENUM('fresh','stale','undocumented'), last_updated
)

-- Generated documentation
documentation (
  id, project_id, module_id NULLABLE, title, content TEXT,
  generated_by ENUM('ai','hybrid'), version INT,
  generated_at, is_stale BOOLEAN
)

-- Gap detection
knowledge_gaps (
  id, project_id, type ENUM('missing_doc','stale_doc','undocumented_module','single_contributor_risk'),
  description, related_module_id NULLABLE, severity ENUM('low','medium','high'),
  detected_at, resolved BOOLEAN
)

-- RAG
embeddings (
  id, source_type ENUM('knowledge_item','documentation'), source_id,
  vector VECTOR(1536),   -- pgvector column, dim depends on embedding model
  content_hash, created_at
)

-- AI prompt/usage tracking ("Prompts" tab) — Phase 9+/stretch
ai_prompt_sessions (id, project_id, user_id, source_tool ENUM('claude_code','chatgpt','other'), captured_at)
ai_prompts (id, session_id, prompt_text, ai_summary TEXT, created_at)
```

**For your AWS teammate:** standard RDS Postgres (t3/t4g.micro is fine for free tier),
enable the `vector` extension (`CREATE EXTENSION vector;`) once pgvector work starts (Phase 7).
Nothing else RDS-specific — connect via normal Spring Data JPA / JDBC as usual.

---

**Signup / Org handling (clarified):** Signup is per-individual, not per-organization. The
"Organization" field at signup is a lightweight text association for now — on signup, match
against an existing `organizations.name` (case-insensitive) and join it, or create a new one if
no match exists. This is intentionally minimal; a real invite-code / domain-verification flow is
deferred to a later security-hardening phase (org boundaries matter more once cross-org isolation
actually needs enforcing).

## 2. Access Model

- `project_members.role`: **owner** (create/configure project, manage members, connect repos)
  or **contributor** (full read + can trigger sync + use agent).
- No "viewer" tier for now — add later only if a real need shows up.
- A project doesn't appear in search/listing for non-members. Mirrors GitHub private-repo behavior.

---

## 3. Design System — Light theme, lavender + turquoise

- **Primary (lavender):** `#7C6FF0` (buttons, active nav, links)
- **Accent (turquoise):** `#2DD4BF` (highlights, freshness "fresh" badges, secondary CTAs)
- **Background:** `#FAFAFC` (off-white, not stark white)
- **Surface/cards:** `#FFFFFF` with soft shadow (`0 1px 3px rgba(0,0,0,0.06)`), rounded corners (`12–16px`)
- **Text:** `#1E1B2E` primary, `#6B6478` secondary/muted
- **Status colors:** fresh = turquoise, stale = amber `#F5A623`, gap/risk = coral `#F76C6C`
- **Typography:** Inter or Manrope, sans-serif. Headings semi-bold, generous line height.
- **Feel:** clean, airy, enterprise-but-approachable — not playful, not corporate-cold.

---

## 4. Full Page List

| # | Page | Notes |
|---|------|-------|
| 1 | Landing (public) | Logo, tagline, features, About, Documentation, Login |
| 2 | Login | Email + password |
| 3 | Signup | Name, Email, Password, Organization (create org or join existing — **decide**: does signup create a new org, or join via invite code? Flag this for the team) |
| 4 | Dashboard ("My Projects") | Grid of project cards + Create Project button |
| 5 | Create Project | Name, description, add 1+ GitHub repo connections, add initial contributors |
| 6 | Project → Overview | Summary, recent activity snapshot, freshness/gap indicators at a glance |
| 7 | Project → Knowledge | Extracted knowledge items, filterable by module/type, each with evidence links |
| 8 | Project → History | Timeline of commits/PRs/reviews ingested |
| 9 | Project → Jira | (Phase 4+) linked Jira issues |
| 10 | Project → Prompts | Ingested AI-tool usage history + summaries (Phase 9+) — **in scope** |
| 11 | Project → Documentation | Browsable generated docs, per module |
| 12 | Project → Settings | Manage contributors, repo connections, project details |
| 13 | Org Settings | Org members (lightweight for now — see Signup note) |
| 14 | Account/Profile | User's own settings |
| 15 | Global Search | Semantic search across all projects user has access to |

> **Assistant / in-platform agent chat — deferred, undecided.** Not building now. Revisit after
> Prompts (Phase 9) is done; may or may not be added later.

Note: your sketches (1–4) map to pages 4, 1, 6–13 (sidebar), and 3 — treat those sketches as rough intent only, not final layout. Suggestions above extend them (added Documentation, Assistant, Settings, Global Search which weren't in the sketches).

---

## 5. Frontend Handoff Prompts (per page, ready to give your teammate)

> Give these directly to your frontend teammate — usable as-is as build prompts, or as a spec if he's coding by hand.

**Landing Page**
> Build a public landing page for a B2B SaaS product called [Product Name]. Light theme, primary color lavender `#7C6FF0`, accent turquoise `#2DD4BF`, background `#FAFAFC`, font Inter/Manrope. Top nav: logo left, "About" / "Documentation" links center-right, "Login" button far right. Hero section with a one-line tagline: "Zero manual documentation — your engineering activity documents itself." Below it, a 3-column features section (Automatic Knowledge Extraction / Source-Backed Documentation / Knowledge Gap Detection). Clean, airy, enterprise-but-approachable feel, generous whitespace, rounded cards.

**Login**
> Simple centered login card: email + password fields, "Log in" button (lavender), "Don't have an account? Sign up" link below. Light theme per design system.

**Signup**
> Centered signup card: Name, Email, Password, Organization name fields. "Create account" button. Light theme, same palette as login.

**Dashboard**
> Authenticated dashboard page. Top header bar: logo left, account avatar/menu right. "My Projects" heading with a "+ New Project" button aligned right. Below, a responsive grid of project cards — each card shows project name, number of connected repos, a small freshness badge (turquoise "Fresh" / amber "Stale"), and last-synced timestamp. Clicking a card navigates to that project's Overview page.

**Create Project**
> Form page: Project name, description, then a repeatable "Add repository" section (repo owner/name or URL, connection method dropdown) allowing multiple repos to be added to one project. Below that, an "Add contributors" multi-select of org members. Submit button "Create Project."

**Project Detail Shell (Overview/Knowledge/History/Jira/Prompts/Documentation/Assistant/Settings)**
> Build a project detail layout: left sidebar nav with icons + labels for Overview, Knowledge, History, Jira, Documentation, Prompts, Assistant, Settings. Top bar shows project name + a freshness/health indicator. Main content area swaps per tab. Use light theme, lavender for active nav item, turquoise accents for status indicators.

**Knowledge Tab**
> List/grid of knowledge item cards: title, type badge (Decision / Module Summary / Workflow / Process / Troubleshooting), short content preview, and a small "Evidence" link/icon that opens a side panel showing the linked GitHub commit/PR with a direct link back to GitHub.

**History Tab**
> Vertical timeline of ingested activity — commits and PRs as timeline entries, each with author, timestamp, short message/title, and a link to GitHub.

---

## 6. Revised Phase Plan

- **Phase 0 — Foundation:** repo setup, Spring Boot + RDS Postgres connection, React+TS skeleton, auth (signup/login), org/project/member schema.
- **Phase 1 — Org/Project Shell:** Dashboard, Create Project (multi-repo), project detail shell w/ sidebar nav, contributor-based access.
- **Phase 2 — GitHub Ingestion ⭐ seminar:** per-project MCP/API repo connections, sync jobs, normalize into `sync_jobs`/`contributors`, no raw content storage.
- **Phase 3 — Knowledge Extraction ⭐ seminar:** AI extraction → `knowledge_items` + `knowledge_evidence`, Knowledge + History tabs live, evidence links back to GitHub.
- **Phase 4 — Jira Integration:** same ingestion pattern, Jira tab.
- **Phase 5 — Unified Knowledge Model:** merge GitHub+Jira knowledge, consistent evidence linking.
- **Phase 6 — Documentation + Freshness/Gaps:** `documentation`, `knowledge_gaps`, Documentation tab, gap indicators on Overview/Dashboard.
- **Phase 7 — RAG:** pgvector embeddings, semantic search page.
- **Phase 8 — AI Prompt Tracking:** Prompts tab, starting with whichever AI tool exposes history feasibly (e.g. Claude Code sessions).
- **Phase 9 — AWS Async, Polish, Testing, Security, Deployment.** Org/security hardening (real invite flow, cross-org isolation checks) belongs here too.
- **Phase 10 — Knowledge Agent (deferred/undecided):** in-platform chat assistant, only if time and scope allow after everything above is solid.

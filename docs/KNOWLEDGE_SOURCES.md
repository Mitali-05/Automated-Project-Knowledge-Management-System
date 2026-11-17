# Knowledge sources and report scope

## Current behaviour

A PRISM project can link multiple GitHub repositories. Repository extraction does not depend on Jira. Knowledge is stored under the project with repository evidence, while the JSON report and PDF/PPTX export are currently stored per repository. A consolidated cross-repository report has not been implemented. Jira OAuth, project mapping, issue/comment snapshot synchronization and source-linked knowledge are implemented. Ask PRISM retrieves these facts through its existing keyword ranking. Jira sync queues regeneration of each saved repository report with a clearly labeled project-wide Jira appendix. A cross-repository architectural synthesis and Jira vector index remain outside this implementation.

The intended combined report should distinguish Jira requirements and discussions from GitHub implementation evidence. It must not infer that a Done ticket proves a working implementation, or that an issue-key mention proves a complete feature. With zero Jira connections, the report should simply describe the available GitHub evidence and its coverage. Jira must never become a prerequisite for GitHub extraction.

## File selection and model responsibilities

The GitHub reader obtains the default-branch tree. Navigation hints prioritize manifests, README and deployment configuration, then entry points, routers, controllers, services, workers, producers, consumers, models and migrations. Generated/vendor paths rank last. At most 200 prioritized paths appear in the initial prompt. This is a navigation policy, not proof that a file is important or that every subsystem was inspected.

LLM1 selects files through read-only tools, follows execution paths and synthesizes knowledge items, handover text and Mermaid code. Successful file reads are recorded. Runtime coverage checks require up to three distinct source files when available and a manifest when present. Every knowledge or additional diagram citation must point to an actually inspected file. A missing reference triggers bounded follow-up reads. A small item count is allowed if that is all the inspected evidence supports; there is no fake minimum.

LLM2 audits the generated report and file-path evidence. It does not independently read the whole repository or execute it. Its verdict is an AI assessment, not production certification. Syntax/schema correction uses the same auditor, with bounded attempts. A rejected audit remains a failure.

The PDF/PPTX exporters own typography, white backgrounds, pagination and diagram rendering. They do not discover architectural facts. Mermaid CLI produces the actual images. The backend stores the generated report and files in PostgreSQL. Redis, if introduced later, should cache authorized responses rather than become the source of truth.

## Document design revision

The deck groups related sections in two columns, consolidates source responsibilities and moves detailed citations into speaker notes and the reference appendix. It does not create separate slides for an audience label or unmeasured ROI, and it does not decorate the review with AI score radar charts or source-count pie charts. Body text remains 18-20 pt, titles 32 pt and cover text 44 pt in Arial. All backgrounds remain white.

The PDF uses continuous text sections instead of forcing each short section onto a new page. Architecture, sequence and focused technical views retain dedicated landscape pages with explanations of their mechanisms and limitations. PDF body text is 11 pt Arial, section headings 17 pt and title 30 pt. Dark ink on white and pale blue tables preserve contrast.

Additional diagrams are optional, capped at three, independently source-cited and shown in the web report as well as exports. They should explain query processing, failure behaviour or data transitions rather than repeat the system overview. Complex systems should use multiple focused views instead of one crowded graph or an oversimplified chain.

## Regeneration without another model call

Run `extractor/scripts/regenerate_report_exports.py` with a saved report JSON, repository owner/name and a new output folder. It generates both exports using the application exporters. It refuses to overwrite existing outputs and writes neither file until both exports succeed. It does not call a model or write to the database.

The manually reviewed DocuMind reference in `docs/reviews/documind-source-review.json` uses the eight files captured in the successful 16 November 2026 extraction. It is a review input, not application seed data, and is never loaded automatically. Its expanded findings were not independently re-audited by LLM2. Regenerating it does not replace reports already saved in PRISM.

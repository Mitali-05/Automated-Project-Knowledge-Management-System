# Report generation and acceptance

## The prompt to edit

`extractor/app/prompts/report_authoring.md` is the full seven-step authoring prompt.
`agent_prompts.py` loads it and appends JSON Schema generated from the actual
Pydantic models. There is no separate hand-maintained sample-project schema.
Restart the Python worker after editing; the prompt is loaded when Python imports
the module. The worker revision hash includes the prompt and publication code.

The configured report model remains `LLM1_MODEL`; this change does not switch to a
larger model. A lightweight model writes factual narrative and Mermaid. Deterministic
application code sets typography, page sizes, colours, tables, cards and image fit.
Do not ask a text-only response to certify pixels it has not received.

## What runs automatically

1. Resolve public or authorized private GitHub access for the repository.
2. Explore source with file tools and record successful reads. Read dependencies of
   claimed behaviours, including helpers and event consumers.
3. Model produces report JSON using the seven-step prompt and actual schema.
4. Validate field types, successful-read citations and sequence limits. Syntax and
   diagram errors receive at most two corrections using the same source context.
   Provider errors and exhausted corrections fail visibly; no substitute report.
5. Render diagrams with local Mermaid and a fixed light theme. Check fitted label
   geometry for the presentation; unreadable views go back for bounded correction.
6. Calculate inspected-source KLOC in code. Run the separate AI review with its
   stated report-text/path-check limits. It is not an independent AST/runtime audit.
7. Render PDF and PPTX. Reopen the serialized PDF to require unrotated A4 portrait
   pages and on-page text. Reopen PPTX to check 16:9 white slides, Arial text,
   object bounds and measured text-box height. Existing contrast/diagram tests
   check the fixed palette and proportional fit. Never shrink fonts to hide overflow.
8. Both files must generate successfully before the worker uploads either replacement.
   SYNCED is reported only after all required uploads succeed. Separate network
   uploads are not an atomic database transaction; an upload failure stays failed.

Jira remains optional. Its source snapshot is included as requirements/status
traceability, not implementation proof. It appears once in the report screen's
Overview section and is grouped into compact deck rows. Descriptions/comments are
omitted when absent. A Jira refresh uses saved repository analysis rather than
rerunning repository exploration. Multiple repositories keep their source identity.

## Cloud prerequisites

- Install `extractor/requirements.txt`, including PyMuPDF for serialized PDF checks.
- Install the actual Arial font files on the export host with an appropriate
  licence. Both exporters require Arial and fail if it is missing; there is no
  silent platform-font substitution.
- Install Node, `@mermaid-js/mermaid-cli` and its Chromium/browser dependencies.
  `mmdc` must be on PATH. Browser launch failures are infrastructure errors, not
  permission to generate an unrelated diagram.
- Configure the chosen model/API key securely. Do not copy secrets into prompts,
  source reviews, exports, screenshots or tracked files.
- Check database migrations, token handling, authorization and deployment separately.
  A clean-looking document is not a project security or production certification.

Geometry checks detect known layout failures; they do not prove every diagram is
semantically correct or every layout aesthetically good. Maintain representative
source fixtures and inspect rendered regression outputs when changing the design.
Do not label these checks as a visual model audit.

## Tests

From `extractor` in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe scripts/smoke_report_exports.py
```

The first command uses synthetic/mocked inputs. The second uses real Mermaid and
serializes both formats, without GitHub, model or database access. Neither proves
that the configured model follows the new prompt on a live repository.

For an isolated real-model test, prepare JSON mapping exact repository paths to
their complete captured file text, then run:

```powershell
.\.venv\Scripts\python.exe scripts/smoke_report_model.py `
  --source-json "path\to\captured-sources.json" `
  --owner "repository-owner" --repo "repository-name" `
  --output "path\to\new-review-folder"
```

This calls the configured report model, applies correction/rendering/publication
checks, and saves local outputs only if successful. It never calls the separate
verification model or changes database data. The output folder must be new.
Failures remain failures; no manually authored report is substituted.

## Applying this change to PRISM downloads

Install updated dependencies and restart the worker, then use **Sync now** to
produce and persist a new report for the repository. **Reload saved report** only
fetches the existing saved report; it does not rerun the model or update old PDF/PPTX
blobs. Editing a prompt cannot retroactively correct previous generated claims.

UI regression screenshots and local smoke outputs belong in `.local-audit/`, which
is ignored by Git. Do not push them or credentials.

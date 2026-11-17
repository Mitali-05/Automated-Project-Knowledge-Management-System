# PRISM presentation design specification

This is PRISM's own design system, informed by the structure of public company
presentations. It does not claim to reproduce another company's proprietary
template, font sizes, branding, or certification.

## Reference and structure

Reference: [Atlassian FY26 Investor Forum](https://s206.q4cdn.com/270053503/files/doc_presentation/2026/FY26-TEAM-Investor-Forum.pdf).
Use clear topic headings, generous whitespace, legible charts, and explicit
distinctions between findings and proposed plans. Do not copy logos or claims.

Deck order: project cover, problem and approach, measured source size and inspection
coverage, verified technology tags, architecture, execution sequence, focused
subsystem views, capability cards, evaluation and evidence limits, risks and next
steps. Jira requirements are optional cards when connected. Detailed handover,
source references and complete findings live in speaker notes and the PDF.

## Canvas and layout

- Widescreen 16:9: 13.333333 by 7.5 inches.
- Horizontal safe margins: 0.75 inch on each side.
- Section label: y=0.30 inch. Title: y=0.70 inch, at most two lines.
- Body: y=1.95 inch, width=11.833333 inches, height=4.70 inches.
- Body line spacing: 27 pt. Maximum 12 lines per text slide.
- Footer: y=6.94 inch; page number aligned at the right.
- Editable rounded cards in a two-column grid with pale blue, green, amber and lavender fills.
- At most four cards per slide. Card labels and copy use 18 pt Arial. Main copy is one
  concise sentence, with complete original content retained in speaker notes.
- Technology tags use a four-column grid, at most two lines per tag.

## Typography

All native slide text uses Arial, explicitly assigned, including footers. Arial
must be installed on the export host for line measurement. Missing fonts produce
an error; the generator does not silently substitute a different font.

| Role | Size | Weight | Use |
| --- | --- | --- | --- |
| Cover title | 44 pt | Bold | Project name, up to four lines |
| Slide title | 32 pt | Bold | Short topic heading, at most two lines |
| Cover subtitle / section heading | 24 pt | Regular | Engineering handover subtitle |
| Body | 20 pt | Regular | Narrative, instructions, evidence details |
| Section label / caption | 14 pt | Bold label, regular caption | Context above title; chart captions |
| Footer / page number | 11 pt | Regular | Repository identifier and pagination only |

Wrap using actual font measurements with a 5% width reserve. Do not reduce body
size to fit more text. Continue onto another slide instead. Preserve complete source content in speaker notes and the PDF. Legacy long fields
use clearly shortened excerpts on the slide; new extraction prompts request
complete slide sentences of at most 18 words. Do not invent missing metrics.
Long paths may wrap inside a token for visibility. Small footer text must never
carry the main message or essential evidence.

## Colour and contrast

| Element | Background | Foreground |
| --- | --- | --- |
| Cover | White `#FFFFFF` | Navy `#101F3D` |
| Content slide | White `#FFFFFF` | Navy title `#101F3D` |
| Body text | White `#FFFFFF` | Slate `#334155` |
| Secondary text / footer | White `#FFFFFF` | Slate `#475569` |
| Section label / emphasis | White `#FFFFFF` | Blue `#0052CC` |
| Warning, when needed | Pale amber `#FFF4D6` | Dark amber `#7A4100` |
| Positive status, when needed | Pale green `#E3FCEF` | Dark green `#006644` |

All listed text/background pairs must have contrast of at least 4.5:1, including
headings. Never put white text on pale fills, use colour as the only status cue,
or place text over a busy diagram. Always retain a written status label.

## Charts, diagrams, and evidence

Images must retain their original aspect ratio. Fit them into the content area,
centre them, and keep captions separate. One main chart or diagram per slide.
No stretching, cropping away evidence, alternate renderer, or fabricated diagram
when rendering fails. Raster diagram/chart label sizes are controlled by their
source renderer; the native 20 pt body rule does not guarantee raster legibility.
Review these separately at presentation size. A dense diagram may require source
restructuring or multiple focused diagrams rather than a smaller font. Preserve
the full graph; do not automatically slice it into disconnected cropped panels.

Do not display model-generated trust, coverage or hallucination percentages as
measured results. Recorded file reads and distinct cited paths may be counted;
they do not establish behavioural correctness. Label confidence as AI-reported.
Do not automatically
claim "Tier-1 Production Standard", certification, confidentiality, independently
verified accuracy, quantified ROI, or a committed roadmap. Values and content
come from the extraction result; style constants are the only fixed inputs.

## Validation

Check font roles, contrast, slide geometry, complete text pagination, source image
proportions, absent hardcoded certification banners, and visible rendering.
Run `python -m unittest discover -s tests -v` from `extractor/`.
Existing downloads and database report blobs do not update when this file changes;
regenerate reports through a new extraction to persist the new deck.

The editable model instructions are in
`extractor/app/prompts/report_authoring.md`; the loader appends the real application
schema. See `REPORT_GENERATION.md` for the complete flow, cloud prerequisites,
isolated model test and distinction between content review and serialized checks.

## PDF report and sequence-diagram contract

- PDF uses A4 portrait with 48 pt horizontal margins and 52 pt vertical margins.
- Architecture, sequence, and optional dependency/evolution diagrams get dedicated
  A4 portrait pages. Fit diagrams proportionally inside the same portrait page;
  never widen the page or switch its orientation. Tables use pale headers and dark text; all page backgrounds
  are white. Long paragraphs and table rows can continue onto another page.
- PDF typeface is embedded Arial: title 30 pt, section 17 pt, subsection 12 pt,
  body 11 pt with 16 pt leading, table 10 pt, caption 9.5 pt, running footer 9 pt.
- Mermaid typography and colours come from `REPORT_THEME` in the renderer, not
  from model-generated style directives. Diagram body text is nominally 24 px;
  the render scale is 2. Actor boxes use `#F4F8FD`, dark text `#172B4D`, and blue
  borders `#0052CC`. White is the canvas colour.
- Render at native diagram dimensions with responsive `useMaxWidth` disabled.
  Do not use CLI `--size`: that scales the entire SVG, including typography, and
  invalidates a font-size calculation based on the configured 24 px text size.
- Sequence diagrams require `sequenceDiagram`, `autonumber`, at most four
  participants (including implicit participants) and twelve messages. An absent
  sequence is an export error. Inspection-only diagrams must explicitly say so.
- The PDF exporter rejects pictures whose nominal scaled diagram font would be
  below 10 pt. This estimate is a guard, not OCR or proof of every label's size.
  Readability still requires an actual rendered inspection.
- The slide exporter uses the same nominal-font calculation with an 18 pt
  minimum. Overly dense diagrams fail instead of being stretched or shrunk.
- No fallback renderer, fabricated replacement diagram, or invented historical
  timeline is used. Unknown response codes and retry guarantees stay unverified.

## Test the actual local rendering toolchain

From `extractor/`, run:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe scripts/smoke_report_exports.py
```

The second command uses a clearly labelled synthetic fixture and the real Mermaid
CLI to generate PDF and PPTX into a fresh temporary directory. It does not call
GitHub, the model, or the database. It verifies the rendering/export toolchain;
an application sync remains a separate integration test. Restart the bridge to
load changed prompts and export code before requesting a new repository sync.

## Output-schema corrections

`technical_debt_and_fragility` is an array of strings, not nested objects. The
runner validates the actual Pydantic model. When JSON/schema validation fails,
it logs the exact error path and requests at most two corrections from the same
configured model with the existing source context and the generated JSON schema.
Correction requests expose no source-inspection tools. Application code never
coerces risk objects into strings, switches providers, or substitutes a default
report. Unread-evidence and sequence checks still apply after schema validation.
Exhausted corrections and provider failures remain extraction failures.

Sequence-contract failures also use this bounded correction step. The diagnostic
lists all detected participants, including implicit endpoints. The model must
revise only the sequence to depict a smaller supported interaction. Application
code checks that every other report field stays unchanged; it rejects revisions
that remove findings or alter other report content. Unread evidence never passes
validation, and participant/message limits are never relaxed.

Unread citation errors return to the source-inspection loop for at most two
follow-ups within the existing exploration-step limit. The agent must actually
read the missing files and reassess the claims before final validation. If it
ignores the request or cannot provide supported evidence, the extraction fails.
This does not relabel unread files as inspected or restart all exploration.
# Verification response handling

The verifier receives the generated `VerificationReport` JSON Schema. JSON syntax and schema errors receive at most two correction requests to the same configured auditor using the original audit payload. No source exploration is repeated for this correction. Comments, unknown fields, invalid verdicts, non-finite JSON values and stringified numeric fields are rejected rather than silently rewritten or discarded. Known verdicts cannot change during schema correction. A valid rejected audit, unsupported production certification or transport failure is not retried as a formatting problem. Exhausted correction errors include a specific diagnostic in the sync failure message; raw model content is not embedded in JSON parse exception messages.


## Measured code size

The runner computes physical lines and nonblank lines from distinct inspected
source bodies, including SQL and excluding README/configuration files. KLOC is
physical lines divided by 1,000. Label it inspected-source KLOC, never repository
KLOC. Old reports without measurements show Not measured. No audit score becomes
an invented test-coverage, throughput or model-accuracy result.

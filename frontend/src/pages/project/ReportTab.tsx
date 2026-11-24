import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Cpu, Download, FileCode, FileText, Presentation, ShieldCheck } from 'lucide-react'
import { reportApi } from '../../api/endpoints'
import type { ExtractionReport, RepositoryReport } from '../../api/types'
import { MermaidDiagram } from '../../components/report/MermaidDiagram'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Alert, EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { cn } from '../../lib/cn'
import { errorMessage, formatDate } from '../../lib/format'
import type { ProjectContext } from './ProjectLayout'

type Section = 'overview' | 'architecture' | 'handover' | 'verification'
const sections: { key: Section; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'handover', label: 'Developer handover' },
  { key: 'verification', label: 'Verification' },
]

function Prose({ text }: { text?: string }) {
  if (!text?.trim()) return <p className="text-sm text-text-muted">Not available.</p>
  return <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary break-words">{text.replace(/\\n/g, '\n')}</p>
}

function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <Card className="p-4">
      <p className="truncate text-lg font-bold text-text-primary">{value ?? '-'}</p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
    </Card>
  )
}

function Overview({ r }: { r: ExtractionReport }) {
  const m = r.analytics_metrics
  const d = r.presentation_deck
  const cards: [string, string | undefined][] = [
    ['Executive pitch', d?.executive_pitch], ['Business value', d?.business_value],
    ['Technical challenges', d?.technical_challenges], ['Future scope', d?.future_scope],
  ]
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>What this system does</CardTitle></CardHeader><CardContent className="space-y-4">
        <Prose text={r.problem_statement} />
        {!!r.tech_stack?.length && <div className="flex flex-wrap gap-2">{r.tech_stack.map((t) => <Badge key={t} variant="primary">{t}</Badge>)}</div>}
      </CardContent></Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Complexity" value={m?.estimated_complexity} />
        <Metric label="Core modules" value={m?.core_module_count} />
        <Metric label="Data-flow complexity" value={m?.data_flow_complexity} />
      </div>
      {m?.security_posture && <Card><CardHeader><CardTitle>Security observations</CardTitle></CardHeader><CardContent><Prose text={m.security_posture} /></CardContent></Card>}
      {!!m?.key_patterns_used?.length && (
        <div><h3 className="mb-2 text-sm font-semibold">Patterns used</h3><div className="flex flex-wrap gap-2">{m.key_patterns_used.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}</div></div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(([title, text]) => (
          <Card key={title}><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent><Prose text={text} /></CardContent></Card>
        ))}
      </div>
      {d?.roi_summary && <Alert tone="info">{d.roi_summary}</Alert>}
    </div>
  )
}

function Architecture({ r }: { r: ExtractionReport }) {
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>System architecture</CardTitle></CardHeader><CardContent>
        {r.architecture_mermaid_chart ? <MermaidDiagram code={r.architecture_mermaid_chart} title="System architecture diagram" /> : <Prose />}
        {r.architecture_explanation && <Prose text={r.architecture_explanation} />}
      </CardContent></Card>
      {r.technical_diagrams?.map((view) => <Card key={view.title}><CardHeader><CardTitle>{view.title}</CardTitle></CardHeader><CardContent className="space-y-4">
        <MermaidDiagram code={view.mermaid} title={view.title} />
        <Prose text={view.explanation} />
        <p className="break-words text-xs text-text-muted">Sources: {view.evidence_ids.join(', ')}</p>
      </CardContent></Card>)}
      {r.milestone_timeline_mermaid_chart && (
        <Card><CardHeader><CardTitle>Evolution timeline</CardTitle></CardHeader><CardContent>
          <MermaidDiagram code={r.milestone_timeline_mermaid_chart} title="Evolution timeline" />
        </CardContent></Card>
      )}
    </div>
  )
}

function Handover({ r }: { r: ExtractionReport }) {
  const g = r.developer_handover_guide
  if (!g) return <Prose />
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Local setup</CardTitle></CardHeader><CardContent><Prose text={g.local_setup_prerequisites} /></CardContent></Card>

      {!!g.directory_tour?.length && (
        <Card><CardHeader><CardTitle>Directory tour</CardTitle></CardHeader><CardContent>
          <ul className="divide-y divide-surface-border">
            {g.directory_tour.map((d) => (
              <li key={d.folder_path} className="grid gap-1 py-3 text-sm md:grid-cols-[minmax(0,260px)_1fr] md:gap-4">
                <code className="break-all rounded bg-primary-light-indigo px-2 py-1 text-xs font-semibold text-primary-indigo">{d.folder_path}</code>
                <span className="text-text-secondary">{d.architectural_role}</span>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}

      {g.directory_dependency_chart && (
        <Card><CardHeader><CardTitle>Module dependencies</CardTitle></CardHeader><CardContent>
          <MermaidDiagram code={g.directory_dependency_chart} title="Module dependency diagram" />
        </CardContent></Card>
      )}

      {!!g.critical_workflows?.length && (
        <Card><CardHeader><CardTitle>Critical workflows</CardTitle></CardHeader><CardContent className="space-y-4">
          {g.critical_workflows.map((w) => (
            <div key={w.workflow_name} className="rounded-lg border border-surface-border p-4">
              <p className="font-semibold">{w.workflow_name}</p>
              <p className="mt-1 text-xs text-text-muted">Entry point: <code className="break-all">{w.entry_point}</code></p>
              <p className="mt-2 text-sm text-text-secondary">{w.execution_path}</p>
            </div>
          ))}
          {g.execution_sequence_chart && <MermaidDiagram code={g.execution_sequence_chart} title="Execution sequence diagram" />}
          {r.sequence_explanation && <Prose text={r.sequence_explanation} />}
        </CardContent></Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Testing</CardTitle></CardHeader><CardContent><Prose text={g.testing_instructions} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">CI / CD</CardTitle></CardHeader><CardContent><Prose text={g.cicd_instructions} /></CardContent></Card>
      </div>

      {!!g.technical_debt_and_fragility?.length && (
        <Card><CardHeader><CardTitle>Technical debt and fragility</CardTitle></CardHeader><CardContent>
          <ul className="space-y-2">
            {g.technical_debt_and_fragility.map((t, i) => (
              <li key={i} className={cn('rounded-lg border-l-4 bg-surface-background p-3 text-sm break-words', /high/i.test(t) ? 'border-red-400' : /medium/i.test(t) ? 'border-amber-400' : 'border-surface-border')}>{t}</li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  )
}

function Verification({ r }: { r: ExtractionReport }) {
  const v = r.verification_report
  const inspected = [...new Set(r.inspected_files ?? [])]
  const cited = [...new Set(r.knowledge_items?.flatMap(k => k.evidence_ids) ?? [])]
  const verdict = v?.verdict === 'REJECTED' ? 'AI review rejected'
    : v?.verdict === 'AUDIT_FAILED' ? 'AI review failed'
    : v ? 'AI review with limitations' : 'No AI review attached'
  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Review scope and limitations</CardTitle></CardHeader><CardContent className="space-y-4">
        <Badge variant={v?.verdict === 'REJECTED' || v?.verdict === 'AUDIT_FAILED' ? 'danger' : 'warning'}>{verdict}</Badge>
        <div className="rounded-lg border border-blue-200 bg-[#eff6ff] p-4 text-sm leading-relaxed text-[#1e3a8a]">
          <p className="font-semibold">Source references and an AI review are not runtime tests</p>
          <p className="mt-2">The reviewer receives extracted report text and file-path checks. It does not independently inspect full source bodies, execute the application or perform an AST audit. Path existence does not prove a behavioural claim.</p>
        </div>
        {v?.verification_agent_notes && <Prose text={v.verification_agent_notes} />}
        <p className="text-sm text-text-secondary">Production readiness, retrieval quality, security and performance require separate execution evidence. Model-generated trust, coverage and hallucination percentages are not displayed as measured results.</p>
      </CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label="Files recorded as read by the extraction runner" value={inspected.length} />
        <Metric label="Distinct paths cited by knowledge items" value={cited.length} />
      </div>
      {!!v?.audit_findings?.length && <Card><CardHeader><CardTitle>AI review findings</CardTitle></CardHeader><CardContent>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">{v.audit_findings.map((finding, i) => <li key={i}>{finding}</li>)}</ul>
      </CardContent></Card>}
      {v?.ml_audit && <Card><CardHeader><CardTitle className="flex flex-wrap items-center gap-2"><Cpu className="h-4 w-4" aria-hidden />Model and evaluation notes</CardTitle></CardHeader><CardContent className="space-y-3">
        {!!v.ml_audit.detected_frameworks?.length && <div className="flex flex-wrap gap-2">{v.ml_audit.detected_frameworks.map(fw => <Badge key={fw} variant="outline">{fw}</Badge>)}</div>}
        {v.ml_audit.notes && <p className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-sm leading-relaxed text-[#334155]">{v.ml_audit.notes}</p>}
        <p className="text-sm text-text-secondary">Evaluation must match the task. Embedding retrieval needs a labeled query set and ranking metrics; classifier accuracy or ROC-AUC should not be inferred from embedding code.</p>
      </CardContent></Card>}
      {(inspected.length > 0 || cited.length > 0) && <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileCode className="h-4 w-4" aria-hidden />Source inventory</CardTitle></CardHeader><CardContent>
        <p className="mb-3 text-sm text-text-secondary">{inspected.length ? 'Recorded successful file reads. This inventory is not a full-source or AST audit.' : 'Cited paths only. This older report has no recorded file-read inventory.'}</p>
        <ul className="space-y-2">{(inspected.length ? inspected : cited).map(path => <li key={path} className="break-all rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2 font-mono text-xs text-[#334155]">{path}</li>)}</ul>
      </CardContent></Card>}
    </div>
  )
}

export default function ReportTab() {
  const { detail } = useOutletContext<ProjectContext>()
  const projectId = detail.project.id
  const { data, loading, error, reload } = useAsync(() => reportApi.list(projectId), [projectId])
  const [pickedRepo, setPickedRepo] = useState<number | null>(null)
  const [section, setSection] = useState<Section>('overview')
  const [busy, setBusy] = useState<string | null>(null)
  const [dlError, setDlError] = useState<string | null>(null)

  if (loading && !data) return <LoadingState rows={2} label="Loading project reports…" />
  if (error || !data) return <ErrorState message={error ?? 'Could not load the report'} onRetry={reload} />
  if (data.length === 0) {
    return (
      <EmptyState icon={<FileText size={36} />} title="No report yet"
        description={detail.project.syncStatus === 'Syncing'
          ? 'Extraction is running. The architecture report appears here when it finishes, which can take several minutes.'
          : 'The full report (architecture, developer handover and verification) is created when a repository is extracted. Use "Sync now" on the Overview tab, and make sure the extractor is running.'} />
    )
  }

  const current: RepositoryReport = data.find((d) => d.repositoryId === pickedRepo) ?? data[0]
  const r = current.report

  const download = async (kind: 'pdf' | 'pptx') => {
    setBusy(kind)
    setDlError(null)
    try {
      await reportApi.download(projectId, current.repositoryId, kind, `${current.owner}-${current.name}-${kind === 'pdf' ? 'report.pdf' : 'deck.pptx'}`)
    } catch (err) {
      setDlError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {data.length > 1 ? (
            <select aria-label="Repository" value={current.repositoryId} onChange={(e) => setPickedRepo(Number(e.target.value))}
              className="h-9 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-indigo">
              {data.map((d) => <option key={d.repositoryId} value={d.repositoryId}>{d.owner}/{d.name}</option>)}
            </select>
          ) : <h2 className="text-base sm:text-lg font-bold">{current.owner}/{current.name}</h2>}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted"><ShieldCheck size={14} aria-hidden /> Generated {formatDate(current.generatedAt)} from the saved source analysis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={reload} isLoading={loading}>Reload</Button>
          <Button variant="outline" size="sm" onClick={() => void download('pdf')} isLoading={busy === 'pdf'} disabled={!current.files.includes('pdf')}><Download size={14} aria-hidden /> PDF</Button>
          <Button variant="outline" size="sm" onClick={() => void download('pptx')} isLoading={busy === 'pptx'} disabled={!current.files.includes('pptx')}><Presentation size={14} aria-hidden /> PPTX</Button>
        </div>
      </div>
      {dlError && <Alert>{dlError}</Alert>}

      <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-surface-border -mx-2 px-2 sm:mx-0 sm:px-0" role="tablist" aria-label="Report sections">
        {sections.map((s) => (
          <button key={s.key} role="tab" aria-selected={section === s.key} onClick={() => setSection(s.key)}
            className={cn('whitespace-nowrap border-b-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors', section === s.key ? 'border-primary-indigo text-primary-indigo font-semibold' : 'border-transparent text-text-secondary hover:text-text-primary')}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'overview' && <Overview r={r} />}
      {section === 'architecture' && <Architecture r={r} />}
      {section === 'handover' && <Handover r={r} />}
      {section === 'verification' && <Verification r={r} />}
      {section === 'overview' && !!r.jira_context?.length && <Card><CardHeader><CardTitle>Jira requirements and discussions</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm text-text-secondary">Project-wide Jira snapshot included in this report. Ticket status does not verify implementation or test success.</p>
        {r.jira_context.map(issue => <details key={issue.issue_key} className="border-b border-surface-border pb-3">
          <summary className="cursor-pointer text-sm font-medium">{issue.issue_key}  /  {issue.summary}  /  {issue.status}</summary>
          <div className="mt-3 space-y-3 text-sm">
            {issue.source_url && <a className="text-primary-indigo underline" href={issue.source_url} target="_blank" rel="noreferrer">Open source issue</a>}
            {issue.description?.trim() && <div><h4 className="mb-1 font-semibold">Description</h4><Prose text={issue.description} /></div>}
            {issue.acceptance_criteria?.trim() && <div><h4 className="mb-1 font-semibold">Acceptance criteria</h4><Prose text={issue.acceptance_criteria} /></div>}
            {issue.comments?.trim() && <div><h4 className="mb-1 font-semibold">Discussion</h4><Prose text={issue.comments} /></div>}
            {!issue.description?.trim() && !issue.acceptance_criteria?.trim() && !issue.comments?.trim() && <p className="text-text-secondary">Only the issue summary and board status were supplied in this snapshot.</p>}
          </div>
        </details>)}
      </CardContent></Card>}
    </div>
  )
}

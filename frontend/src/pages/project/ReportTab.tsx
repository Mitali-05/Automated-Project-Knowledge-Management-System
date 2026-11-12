import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, FileText, Presentation, ShieldCheck } from 'lucide-react'
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
  return <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{text.replace(/\\n/g, '\n')}</p>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Complexity" value={m?.estimated_complexity} />
        <Metric label="Core modules" value={m?.core_module_count} />
        <Metric label="Data-flow complexity" value={m?.data_flow_complexity} />
        <Metric label="Security posture" value={m?.security_posture} />
      </div>
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
      </CardContent></Card>
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
              <p className="mt-1 text-xs text-text-muted">Entry point: <code>{w.entry_point}</code></p>
              <p className="mt-2 text-sm text-text-secondary">{w.execution_path}</p>
            </div>
          ))}
          {g.execution_sequence_chart && <MermaidDiagram code={g.execution_sequence_chart} title="Execution sequence diagram" />}
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
              <li key={i} className={cn('rounded-lg border-l-4 bg-surface-background p-3 text-sm', /high/i.test(t) ? 'border-red-400' : /medium/i.test(t) ? 'border-amber-400' : 'border-surface-border')}>{t}</li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  )
}

function Verification({ r }: { r: ExtractionReport }) {
  const v = r.verification_report
  if (!v) return <Alert tone="info">The verification agent did not run for this extraction, so there is no audit to show.</Alert>
  const pct = (n?: number) => (n === undefined ? '-' : `${Math.round(n * 10) / 10}%`)
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-6 p-6">
        <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary-indigo/30 bg-primary-light-indigo">
          <span className="text-2xl font-bold text-primary-indigo">{v.overall_trust_score !== undefined ? Math.round(v.overall_trust_score) : '-'}</span>
          <span className="text-[10px] text-text-muted">trust score</span>
        </div>
        <div className="min-w-0 flex-1">
          <Badge variant={v.verdict === 'REJECTED' ? 'danger' : v.verdict === 'VERIFIED_WITH_WARNINGS' ? 'warning' : 'success'}>{(v.verdict ?? 'UNKNOWN').replace(/_/g, ' ')}</Badge>
          <p className="mt-2 text-sm text-text-secondary">An independent second AI agent checked every claim against the real repository tree. {v.verification_agent_notes}</p>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Evidence precision" value={pct(v.evidence_precision_score)} />
        <Metric label="Subsystem coverage" value={pct(v.subsystem_recall_coverage)} />
        <Metric label="Hallucination rate" value={pct(v.hallucination_rate)} />
        <Metric label="Verified / unsupported" value={`${v.verified_claims_count ?? 0} / ${v.unsupported_claims_count ?? 0}`} />
      </div>
      {!!v.audit_findings?.length && (
        <Card><CardHeader><CardTitle>Audit findings</CardTitle></CardHeader><CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-secondary">{v.audit_findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </CardContent></Card>
      )}
      {v.ml_audit?.notes && <p className="text-xs text-text-muted">ML audit: {v.ml_audit.notes}</p>}
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

  if (loading && !data) return <LoadingState rows={2} />
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {data.length > 1 ? (
            <select aria-label="Repository" value={current.repositoryId} onChange={(e) => setPickedRepo(Number(e.target.value))}
              className="h-9 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-indigo">
              {data.map((d) => <option key={d.repositoryId} value={d.repositoryId}>{d.owner}/{d.name}</option>)}
            </select>
          ) : <h2 className="text-lg font-bold">{current.owner}/{current.name}</h2>}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted"><ShieldCheck size={14} aria-hidden /> Generated {formatDate(current.generatedAt)} from the repository's code</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void download('pdf')} isLoading={busy === 'pdf'} disabled={!current.files.includes('pdf')}><Download size={16} aria-hidden /> PDF report</Button>
          <Button variant="outline" onClick={() => void download('pptx')} isLoading={busy === 'pptx'} disabled={!current.files.includes('pptx')}><Presentation size={16} aria-hidden /> PowerPoint deck</Button>
        </div>
      </div>
      {dlError && <Alert>{dlError}</Alert>}

      <div className="flex gap-1 overflow-x-auto border-b border-surface-border" role="tablist" aria-label="Report sections">
        {sections.map((s) => (
          <button key={s.key} role="tab" aria-selected={section === s.key} onClick={() => setSection(s.key)}
            className={cn('whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors', section === s.key ? 'border-primary-indigo text-primary-indigo' : 'border-transparent text-text-secondary hover:text-text-primary')}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'overview' && <Overview r={r} />}
      {section === 'architecture' && <Architecture r={r} />}
      {section === 'handover' && <Handover r={r} />}
      {section === 'verification' && <Verification r={r} />}
    </div>
  )
}

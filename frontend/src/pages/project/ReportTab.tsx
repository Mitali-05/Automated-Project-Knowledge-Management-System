import { useState, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  Code2,
  Cpu,
  Download,
  FileBarChart,
  FileCode,
  FileText,
  FolderTree,
  GitBranch,
  Layers,
  Lightbulb,
  Lock,
  Presentation,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  TestTube2,
  Users,
  Workflow,
  Wrench,
} from 'lucide-react'
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

function Prose({ text }: { text?: string }) {
  if (!text?.trim()) return <p className="text-sm text-text-muted">Not available in this snapshot.</p>
  return <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary break-words">{text.replace(/\\n/g, '\n')}</p>
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone = 'indigo',
}: {
  icon: typeof Layers
  label: string
  value: string | number
  subtext?: string
  tone?: 'indigo' | 'emerald' | 'blue' | 'violet'
}) {
  const styles = {
    indigo: 'bg-primary-light-indigo text-primary-indigo border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    violet: 'bg-purple-50 text-purple-700 border-purple-100',
  }[tone]
  return (
    <Card className="p-4 sm:p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3.5">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', styles)}>
          <Icon size={19} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl sm:text-2xl font-bold leading-tight text-text-primary">{value}</p>
          <p className="mt-0.5 text-xs font-semibold text-text-secondary">{label}</p>
          {subtext && <p className="mt-1 text-[11px] text-text-muted line-clamp-2">{subtext}</p>}
        </div>
      </div>
    </Card>
  )
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
  className,
}: {
  icon: typeof Layers
  title: string
  badge?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b border-surface-border/60 pb-3.5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon size={17} className="text-primary-indigo shrink-0" aria-hidden />
          <span>{title}</span>
        </CardTitle>
        {badge}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

function Overview({ r, onOpenSection }: { r: ExtractionReport; onOpenSection: (s: Section) => void }) {
  const m = r.analytics_metrics
  const d = r.presentation_deck
  const sm = r.source_metrics
  const inspectedCount = [...new Set(r.inspected_files ?? [])].length
  const citedCount = [...new Set(r.knowledge_items?.flatMap((k) => k.evidence_ids ?? []) ?? [])].length
  const diagramCount = (r.architecture_mermaid_chart ? 1 : 0) + (r.technical_diagrams?.length ?? 0)
  const findings = r.knowledge_items ?? []
  const debtCount = r.developer_handover_guide?.technical_debt_and_fragility?.length ?? 0

  const strategicCards: { title: string; text?: string; icon: typeof Lightbulb; border: string }[] = [
    { title: 'Business Value', text: d?.business_value, icon: Rocket, border: 'border-t-emerald-500' },
    { title: 'Engineering Challenges', text: d?.technical_challenges, icon: Wrench, border: 'border-t-amber-500' },
    { title: 'Future Scope', text: d?.future_scope, icon: Lightbulb, border: 'border-t-indigo-500' },
  ].filter((c) => Boolean(c.text?.trim()))

  return (
    <div className="space-y-6">
      {/* Executive KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={FileCode}
          tone="indigo"
          label="Inspected Scope"
          value={inspectedCount > 0 ? `${inspectedCount} files` : `${sm?.source_files ?? 0} files`}
          subtext={
            sm?.kloc !== undefined
              ? `${sm.source_files ?? inspectedCount} source files • ${sm.kloc} KLOC (${sm.physical_lines ?? 0} lines)`
              : `${citedCount} distinct cited source paths`
          }
        />
        <KpiCard
          icon={Boxes}
          tone="blue"
          label="Architecture & Modules"
          value={m?.core_module_count ?? '-'}
          subtext={m?.estimated_complexity ? `Complexity: ${m.estimated_complexity}` : 'Core inspected modules'}
        />
        <KpiCard
          icon={BookOpen}
          tone="emerald"
          label="Extracted Findings"
          value={findings.length}
          subtext={`${citedCount} cited artifacts${debtCount > 0 ? ` • ${debtCount} risk item${debtCount === 1 ? '' : 's'}` : ''}`}
        />
        <KpiCard
          icon={Workflow}
          tone="violet"
          label="Visual Diagrams"
          value={diagramCount}
          subtext={`${r.developer_handover_guide?.critical_workflows?.length ?? 0} documented workflows`}
        />
      </div>

      {/* Executive Summary & System Purpose */}
      <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-surface-card via-surface-card to-indigo-50/35">
        <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-surface-border/60 pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles size={18} className="text-primary-indigo shrink-0" aria-hidden />
              <span>Executive Overview & System Scope</span>
            </CardTitle>
            {d?.target_audience && (
              <p className="flex items-center gap-1.5 text-xs text-text-muted">
                <Users size={13} className="text-primary-indigo" aria-hidden />
                <span>Audience: {d.target_audience}</span>
              </p>
            )}
          </div>
          {m?.estimated_complexity && (
            <Badge variant="primary" className="self-start sm:self-center">
              {m.estimated_complexity} Complexity
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {d?.executive_pitch && (
            <div className="rounded-xl border border-indigo-200/80 bg-primary-light-indigo/45 px-4 py-3 text-sm font-medium text-text-primary leading-relaxed">
              {d.executive_pitch}
            </div>
          )}
          <Prose text={r.problem_statement} />
          {!!r.tech_stack?.length && (
            <div className="pt-2 border-t border-surface-border/60">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Verified Technology Stack</p>
              <div className="flex flex-wrap gap-2">
                {r.tech_stack.map((t) => (
                  <Badge key={t} variant="primary">{t}</Badge>
                ))}
              </div>
            </div>
          )}
          {!!m?.key_patterns_used?.length && (
            <div className="pt-2 border-t border-surface-border/60">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Observed Architectural Patterns</p>
              <div className="flex flex-wrap gap-2">
                {m.key_patterns_used.map((p) => (
                  <Badge key={p} variant="outline">{p}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Architecture Preview + Data Flow & Security Posture */}
      <div className="grid gap-5 lg:grid-cols-12">
        {r.architecture_mermaid_chart && (
          <SectionCard
            icon={Layers}
            title="Primary System Architecture"
            className="lg:col-span-7"
            badge={
              <Button variant="ghost" size="sm" onClick={() => onOpenSection('architecture')} className="text-xs text-primary-indigo">
                <span>All diagrams ({diagramCount})</span>
                <ArrowRight size={13} aria-hidden />
              </Button>
            }
          >
            <MermaidDiagram code={r.architecture_mermaid_chart} title="System architecture overview diagram" />
            {r.architecture_explanation && (
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-text-secondary">
                {r.architecture_explanation.replace(/\\n/g, ' ')}
              </p>
            )}
          </SectionCard>
        )}

        <div className={cn('space-y-4', r.architecture_mermaid_chart ? 'lg:col-span-5' : 'lg:col-span-12')}>
          <SectionCard icon={Activity} title="Data-Flow Profile">
            <Prose text={m?.data_flow_complexity} />
          </SectionCard>
          <SectionCard icon={Lock} title="Security Posture">
            <Prose text={m?.security_posture} />
          </SectionCard>
        </div>
      </div>

      {/* Extracted Knowledge Findings Inside Report */}
      {findings.length > 0 && (
        <SectionCard
          icon={BookOpen}
          title="Key Extracted Findings & Evidence"
          badge={<Badge variant="primary">{findings.length} finding{findings.length === 1 ? '' : 's'}</Badge>}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {findings.map((k, idx) => (
              <div
                key={`${k.title}-${idx}`}
                className="flex flex-col justify-between rounded-xl border border-surface-border bg-surface-background/50 p-4 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="primary">{k.knowledge_type}</Badge>
                    {k.business_impact && (
                      <Badge variant={/high|critical/i.test(k.business_impact) ? 'warning' : 'outline'}>
                        Impact: {k.business_impact}
                      </Badge>
                    )}
                    {k.module && (
                      <code className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-text-secondary border border-surface-border break-all">
                        {k.module}
                      </code>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-text-primary">{k.title}</h4>
                  <p className="text-xs leading-relaxed text-text-secondary">{k.summary}</p>
                </div>
                {!!k.evidence_ids?.length && (
                  <div className="pt-2 border-t border-surface-border/60 flex flex-wrap gap-1.5">
                    {k.evidence_ids.map((ev) => (
                      <span
                        key={ev}
                        className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 font-mono text-[11px] text-text-secondary border border-surface-border break-all"
                      >
                        <FileCode size={11} className="text-primary-indigo shrink-0" aria-hidden />
                        <span>{ev}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Strategic & Handover Highlights */}
      {strategicCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {strategicCards.map(({ title, text, icon: CardIcon, border }) => (
            <Card key={title} className={cn('border-t-2', border)}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <CardIcon size={15} className="text-primary-indigo shrink-0" aria-hidden />
                  <span>{title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Prose text={text} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {d?.roi_summary && !/undetermined|unknown|not measured/i.test(d.roi_summary.trim()) && (
        <Alert tone="info">{d.roi_summary}</Alert>
      )}
    </div>
  )
}

function Architecture({ r }: { r: ExtractionReport }) {
  return (
    <div className="space-y-6">
      <SectionCard icon={Layers} title="System Architecture">
        <div className="space-y-4">
          {r.architecture_mermaid_chart ? (
            <MermaidDiagram code={r.architecture_mermaid_chart} title="System architecture diagram" />
          ) : (
            <Prose />
          )}
          {r.architecture_explanation && <Prose text={r.architecture_explanation} />}
        </div>
      </SectionCard>

      {r.technical_diagrams?.map((view) => (
        <SectionCard
          key={view.title}
          icon={Workflow}
          title={view.title}
          badge={<Badge variant="outline" className="uppercase text-[10px]">{view.kind}</Badge>}
        >
          <div className="space-y-4">
            <MermaidDiagram code={view.mermaid} title={view.title} />
            <Prose text={view.explanation} />
            {!!view.evidence_ids?.length && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-surface-border/60">
                <span className="text-xs font-semibold text-text-muted mr-1">Cited sources:</span>
                {view.evidence_ids.map((id) => (
                  <code key={id} className="rounded bg-surface-background px-2 py-0.5 text-[11px] text-text-secondary border border-surface-border break-all">
                    {id}
                  </code>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      ))}

      {r.milestone_timeline_mermaid_chart && (
        <SectionCard icon={GitBranch} title="Repository Component Timeline">
          <MermaidDiagram code={r.milestone_timeline_mermaid_chart} title="Evolution timeline" />
        </SectionCard>
      )}
    </div>
  )
}

function Handover({ r }: { r: ExtractionReport }) {
  const g = r.developer_handover_guide
  if (!g) return <Prose />
  return (
    <div className="space-y-6">
      <SectionCard icon={Terminal} title="Local Setup & Prerequisites">
        <Prose text={g.local_setup_prerequisites} />
      </SectionCard>

      {!!g.directory_tour?.length && (
        <SectionCard icon={FolderTree} title="Directory Tour" badge={<Badge variant="primary">{g.directory_tour.length} paths</Badge>}>
          <ul className="divide-y divide-surface-border">
            {g.directory_tour.map((d) => (
              <li key={d.folder_path} className="grid gap-1 py-3 text-sm md:grid-cols-[minmax(0,260px)_1fr] md:gap-4 items-start">
                <code className="break-all rounded-md bg-primary-light-indigo px-2.5 py-1 text-xs font-semibold text-primary-indigo">
                  {d.folder_path}
                </code>
                <span className="text-text-secondary leading-relaxed">{d.architectural_role}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {g.directory_dependency_chart && (
        <SectionCard icon={Code2} title="Module Dependencies">
          <MermaidDiagram code={g.directory_dependency_chart} title="Module dependency diagram" />
        </SectionCard>
      )}

      {!!g.critical_workflows?.length && (
        <SectionCard icon={Workflow} title="Critical Execution Workflows">
          <div className="space-y-4">
            {g.critical_workflows.map((w) => (
              <div key={w.workflow_name} className="rounded-xl border border-surface-border bg-surface-background/50 p-4">
                <p className="font-semibold text-text-primary">{w.workflow_name}</p>
                <p className="mt-1 text-xs text-text-muted">
                  Entry point: <code className="rounded bg-white px-1.5 py-0.5 border border-surface-border break-all">{w.entry_point}</code>
                </p>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{w.execution_path}</p>
              </div>
            ))}
            {g.execution_sequence_chart && <MermaidDiagram code={g.execution_sequence_chart} title="Execution sequence diagram" />}
            {r.sequence_explanation && <Prose text={r.sequence_explanation} />}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard icon={TestTube2} title="Testing Instructions">
          <Prose text={g.testing_instructions} />
        </SectionCard>
        <SectionCard icon={Rocket} title="CI / CD Pipeline">
          <Prose text={g.cicd_instructions} />
        </SectionCard>
      </div>

      {!!g.technical_debt_and_fragility?.length && (
        <SectionCard icon={AlertTriangle} title="Risks, Fragility & Proposed Remediations">
          <ul className="space-y-2.5">
            {g.technical_debt_and_fragility.map((t, i) => (
              <li
                key={i}
                className={cn(
                  'rounded-xl border border-surface-border border-l-4 bg-surface-background p-3.5 text-sm leading-relaxed break-words',
                  /high/i.test(t) ? 'border-l-red-500' : /medium/i.test(t) ? 'border-l-amber-500' : 'border-l-indigo-400'
                )}
              >
                {t}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function Verification({ r }: { r: ExtractionReport }) {
  const v = r.verification_report
  const inspected = [...new Set(r.inspected_files ?? [])]
  const cited = [...new Set(r.knowledge_items?.flatMap((k) => k.evidence_ids ?? []) ?? [])]
  const verdict =
    v?.verdict === 'REJECTED'
      ? 'AI review rejected'
      : v?.verdict === 'AUDIT_FAILED'
      ? 'AI review failed'
      : v
      ? 'AI review with limitations'
      : 'No AI review attached'
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard icon={FileCode} tone="indigo" label="Files Recorded as Inspected" value={inspected.length} subtext="Captured repository reads" />
        <KpiCard icon={CheckCircle2} tone="emerald" label="Distinct Cited Source Paths" value={cited.length} subtext="Referenced across knowledge items" />
      </div>

      <SectionCard
        icon={ShieldCheck}
        title="Review Scope & Evidence Boundaries"
        badge={<Badge variant={v?.verdict === 'REJECTED' || v?.verdict === 'AUDIT_FAILED' ? 'danger' : 'warning'}>{verdict}</Badge>}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-[#eff6ff] p-4 text-sm leading-relaxed text-[#1e3a8a]">
            <p className="font-semibold">Source references and an AI review are not runtime tests</p>
            <p className="mt-1.5">
              The reviewer receives extracted report text and file-path checks. It does not independently inspect full source bodies, execute the application or perform an AST audit. Path existence does not prove a behavioural claim.
            </p>
          </div>
          {v?.verification_agent_notes && <Prose text={v.verification_agent_notes} />}
          <p className="text-sm text-text-secondary">
            Production readiness, retrieval quality, security and performance require separate execution evidence. Model-generated trust, coverage and hallucination percentages are not displayed as measured results.
          </p>
        </div>
      </SectionCard>

      {!!v?.audit_findings?.length && (
        <SectionCard icon={AlertTriangle} title="AI Review Findings">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
            {v.audit_findings.map((finding, i) => (
              <li key={i}>{finding}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      {v?.ml_audit && (
        <SectionCard icon={Cpu} title="Model & Evaluation Notes">
          <div className="space-y-3">
            {!!v.ml_audit.detected_frameworks?.length && (
              <div className="flex flex-wrap gap-2">
                {v.ml_audit.detected_frameworks.map((fw) => (
                  <Badge key={fw} variant="outline">{fw}</Badge>
                ))}
              </div>
            )}
            {v.ml_audit.notes && (
              <p className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-sm leading-relaxed text-[#334155]">
                {v.ml_audit.notes}
              </p>
            )}
            <p className="text-sm text-text-secondary">
              Evaluation must match the task. Embedding retrieval needs a labeled query set and ranking metrics; classifier accuracy or ROC-AUC should not be inferred from embedding code.
            </p>
          </div>
        </SectionCard>
      )}

      {(inspected.length > 0 || cited.length > 0) && (
        <SectionCard icon={FileCode} title="Source Inventory" badge={<Badge variant="outline">{inspected.length || cited.length} paths</Badge>}>
          <p className="mb-3 text-sm text-text-secondary">
            {inspected.length
              ? 'Recorded successful file reads. This inventory is not a full-source or AST audit.'
              : 'Cited paths only. This older report has no recorded file-read inventory.'}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(inspected.length ? inspected : cited).map((path) => (
              <li
                key={path}
                className="break-all rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2 font-mono text-xs text-[#334155]"
              >
                {path}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
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
      <EmptyState
        icon={<FileText size={36} />}
        title="No report yet"
        description={
          detail.project.syncStatus === 'Syncing'
            ? 'Extraction is running. The architecture report appears here when it finishes, which can take several minutes.'
            : 'The full report (architecture, developer handover and verification) is created when a repository is extracted. Use "Sync now" on the Overview tab, and make sure the extractor is running.'
        }
      />
    )
  }

  const current: RepositoryReport = data.find((d) => d.repositoryId === pickedRepo) ?? data[0]
  const r = current.report

  const diagramCount = (r.architecture_mermaid_chart ? 1 : 0) + (r.technical_diagrams?.length ?? 0)
  const workflowCount = r.developer_handover_guide?.critical_workflows?.length ?? 0
  const inspectedCount = [...new Set(r.inspected_files ?? [])].length

  const sections: { key: Section; label: string; icon: typeof FileBarChart; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: FileBarChart },
    { key: 'architecture', label: 'Architecture', icon: Layers, count: diagramCount || undefined },
    { key: 'handover', label: 'Developer handover', icon: FolderTree, count: workflowCount || undefined },
    { key: 'verification', label: 'Verification', icon: ShieldCheck, count: inspectedCount || undefined },
  ]

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
      {/* Polished Report Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-surface-card via-surface-card to-indigo-50/40 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-indigo text-white shadow-md shadow-primary-indigo/25">
            <FileBarChart size={22} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {data.length > 1 ? (
                <select
                  aria-label="Repository"
                  value={current.repositoryId}
                  onChange={(e) => setPickedRepo(Number(e.target.value))}
                  className="h-9 rounded-lg border border-surface-border bg-surface-card px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-indigo"
                >
                  {data.map((d) => (
                    <option key={d.repositoryId} value={d.repositoryId}>
                      {d.owner}/{d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <h2 className="text-base sm:text-lg font-bold break-all text-text-primary">
                  {current.owner}/{current.name}
                </h2>
              )}
              <Badge variant="success">Ready</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" aria-hidden />
              <span>Generated {formatDate(current.generatedAt)} from saved source analysis</span>
              {r.source_metrics?.kloc !== undefined && (
                <span>• {r.source_metrics.source_files ?? inspectedCount} source files ({r.source_metrics.kloc} KLOC)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reload} isLoading={loading}>
            {!loading && <RefreshCw size={14} aria-hidden />}
            <span>Reload</span>
          </Button>
          <Button
            size="sm"
            onClick={() => void download('pdf')}
            isLoading={busy === 'pdf'}
            disabled={!current.files.includes('pdf')}
            className="shadow-sm shadow-primary-indigo/20"
          >
            <Download size={14} aria-hidden /> Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void download('pptx')}
            isLoading={busy === 'pptx'}
            disabled={!current.files.includes('pptx')}
          >
            <Presentation size={14} aria-hidden /> Export PPTX
          </Button>
        </div>
      </div>

      {dlError && <Alert>{dlError}</Alert>}

      {/* Pill-Style Segmented Tab Strip */}
      <div
        className="flex gap-1.5 overflow-x-auto scrollbar-none rounded-xl border border-surface-border bg-surface-background p-1.5"
        role="tablist"
        aria-label="Report sections"
      >
        {sections.map((s) => {
          const active = section === s.key
          const Icon = s.icon
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSection(s.key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer',
                active
                  ? 'bg-surface-card text-primary-indigo font-semibold shadow-xs border border-indigo-100'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-card/60'
              )}
            >
              <Icon size={15} aria-hidden />
              <span>{s.label}</span>
              {s.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    active ? 'bg-primary-light-indigo text-primary-indigo' : 'bg-surface-border/70 text-text-muted'
                  )}
                >
                  {s.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {section === 'overview' && <Overview r={r} onOpenSection={setSection} />}
      {section === 'architecture' && <Architecture r={r} />}
      {section === 'handover' && <Handover r={r} />}
      {section === 'verification' && <Verification r={r} />}

      {section === 'overview' && !!r.jira_context?.length && (
        <SectionCard icon={FileText} title="Jira Requirements & Discussions" badge={<Badge variant="outline">{r.jira_context.length} issues</Badge>}>
          <p className="mb-4 text-sm text-text-secondary">
            Project-wide Jira snapshot included in this report. Ticket status does not verify implementation or test success.
          </p>
          <div className="space-y-2">
            {r.jira_context.map((issue) => (
              <details key={issue.issue_key} className="rounded-lg border border-surface-border px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                  {issue.issue_key} / {issue.summary} / {issue.status}
                </summary>
                <div className="mt-3 space-y-3 text-sm">
                  {issue.source_url && (
                    <a className="text-primary-indigo underline font-medium" href={issue.source_url} target="_blank" rel="noreferrer">
                      Open source issue
                    </a>
                  )}
                  {issue.description?.trim() && (
                    <div>
                      <h4 className="mb-1 font-semibold">Description</h4>
                      <Prose text={issue.description} />
                    </div>
                  )}
                  {issue.acceptance_criteria?.trim() && (
                    <div>
                      <h4 className="mb-1 font-semibold">Acceptance criteria</h4>
                      <Prose text={issue.acceptance_criteria} />
                    </div>
                  )}
                  {issue.comments?.trim() && (
                    <div>
                      <h4 className="mb-1 font-semibold">Discussion</h4>
                      <Prose text={issue.comments} />
                    </div>
                  )}
                  {!issue.description?.trim() && !issue.acceptance_criteria?.trim() && !issue.comments?.trim() && (
                    <p className="text-text-secondary">Only the issue summary and board status were supplied in this snapshot.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

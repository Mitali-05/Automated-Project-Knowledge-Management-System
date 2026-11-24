import { PublicPage } from '../components/layout/PublicPage'

const sections = [
  { title: 'Getting started', body: ['Create an account. If your organization is new, you become its first member and receive an invite code. If it already exists, enter the invite code a teammate shares with you.', 'From the dashboard choose "Create project", give it a name, add one or more GitHub repository links, and pick the teammates who should have access.'] },
  { title: 'How knowledge is produced', body: ['When a project is created or synced, its repositories are queued. A separate extraction service reads the repository activity and sends back structured knowledge items, each with links to the commits or pull requests that support it.', 'Sync status per repository is shown as Pending, Syncing, Synced or Failed.'] },
  { title: 'Access model', body: ['Only project members can access a project. Owners manage project settings, repositories and members. Contributors can also request a sync. Viewers can read knowledge and reports, download exports, and use Ask PRISM.'] },
  { title: 'Connect private and organization repositories', body: ['Open your workspace or organization settings and connect the PRISM GitHub App. In GitHub, install it for the account or organization that owns the repository and grant access to the repositories you want to sync.', 'Return to PRISM, select the repository when creating a project, or add it in project settings. If installation requires approval, ask a GitHub organization owner to approve it.'] },
  { title: 'Ask PRISM and citations', body: ['Ask a question from the project’s Ask PRISM tab. Semantic search retrieves relevant indexed project knowledge by meaning. The assistant uses that context to answer, and citations point to supporting knowledge and sources when available.', 'Check the cited file or issue before acting on an answer. Newly changed files may require another sync.'] },
  { title: 'Drift and freshness', body: ['The Overview tab tracks the age of knowledge and checks whether supporting files have changed since the extraction baseline. Changed sources may be stale, deleted sources may be outdated, and sources without a baseline are unknown.', 'Recheck drift to refresh the comparison. Sync to extract updated knowledge.'] },
  { title: 'Export architecture reports', body: ['After a successful sync, open Report and select a repository. Use PDF report for the technical brief or PowerPoint deck for the architecture slides. If an export is unavailable, check the repository sync status.'] },
  { title: 'What PRISM stores', body: ['Extracted knowledge and links to evidence. Raw repository content is not copied into PRISM.'] },
]

export default function DocsPage() {
  return (
    <PublicPage>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-20 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
        {sections.map((s) => (
          <section key={s.title} className="rounded-2xl border border-surface-border bg-surface-card/80 p-6 shadow-sm backdrop-blur-xl">
            <h2 className="mb-2 text-xl font-semibold">{s.title}</h2>
            {s.body.map((p) => <p key={p} className="mb-2 leading-relaxed text-text-secondary last:mb-0">{p}</p>)}
          </section>
        ))}
      </div>
    </PublicPage>
  )
}

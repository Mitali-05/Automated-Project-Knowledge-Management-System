import { PublicPage } from '../components/layout/PublicPage'

const sections = [
  { title: 'Getting started', body: ['Create an account. If your organization is new, you become its first member and receive an invite code. If it already exists, enter the invite code a teammate shares with you.', 'From the dashboard choose "Create project", give it a name, add one or more GitHub repository links, and pick the teammates who should have access.'] },
  { title: 'How knowledge is produced', body: ['When a project is created or synced, its repositories are queued. A separate extraction service reads the repository activity and sends back structured knowledge items, each with links to the commits or pull requests that support it.', 'Sync status per repository is shown as Pending, Syncing, Synced or Failed.'] },
  { title: 'Access model', body: ['A project has owners and contributors. Only they can see it; to everyone else it does not exist. Owners can edit settings, manage repositories and members, and delete the project. Contributors can read everything and request a sync.'] },
  { title: 'Freshness', body: ['Fresh: updated within 30 days. Stale: within 90 days. Outdated: older than that.'] },
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

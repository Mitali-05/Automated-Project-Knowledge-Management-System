import { PageContainer, PageHeader } from '../../components/layout/PageContainer'
import { Card, CardContent } from '../../components/ui/Card'

const faqs = [
  ['How do I add teammates?', 'Share your organization invite code (Organization page). They enter it when signing up. Then add them to a project from its Settings tab.'],
  ['Why can a teammate not see my project?', 'Projects are visible only to their owner and contributors. Add them as a contributor in the project Settings.'],
  ['What does "Pending" mean for a repository?', 'The repository is queued. The extraction service picks it up, marks it Syncing, and then Synced or Failed.'],
  ['What do Fresh, Stale and Outdated mean?', 'Fresh: updated within 30 days. Stale: within 90 days. Outdated: older than that.'],
  ['Does PRISM store my source code?', 'No. It stores extracted knowledge and links to evidence on GitHub.'],
]

export default function HelpPage() {
  return (
    <PageContainer narrow>
      <PageHeader title="Help" subtitle="Answers to common questions." />
      {faqs.map(([q, a]) => (
        <Card key={q}><CardContent className="p-6"><h2 className="font-semibold">{q}</h2><p className="mt-1 text-sm text-text-secondary">{a}</p></CardContent></Card>
      ))}
    </PageContainer>
  )
}

import { motion } from 'framer-motion'
import { PublicPage } from '../components/layout/PublicPage'

const sections = [
  { title: 'The problem', body: 'Software knowledge is created continuously through commits, pull requests and reviews, yet most organisations rely on people to document it by hand. Documentation falls behind, and the reasoning behind decisions ends up buried in history or in a few engineers\' memories.' },
  { title: 'Our approach', body: 'Connect an existing repository once and let the platform extract knowledge from real engineering activity. PRISM stores the extracted knowledge together with pointers to its evidence. It does not keep a copy of your source code; the original is always one click away on GitHub.' },
  { title: 'Where we are', body: 'Today PRISM covers GitHub repositories: knowledge items with evidence and freshness, a project history timeline and role-based access. Jira integration, generated documentation and semantic search are available today. AI-tool prompt history is in development.' },
]

export default function AboutPage() {
  return (
    <PublicPage>
      <div className="container mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            About <span className="bg-gradient-to-r from-primary-indigo to-primary-violet bg-clip-text text-transparent">PRISM</span>
          </h1>
          <p className="text-lg text-text-secondary">Built by four computer science students as a 7th-semester Honors Major Project.</p>
        </motion.div>
        <div className="space-y-6">
          {sections.map((s, i) => (
            <motion.section key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-2xl border border-surface-border bg-surface-card/80 p-8 shadow-sm backdrop-blur-xl">
              <h2 className="mb-2 text-xl font-bold">{s.title}</h2>
              <p className="leading-relaxed text-text-secondary">{s.body}</p>
            </motion.section>
          ))}
        </div>
      </div>
    </PublicPage>
  )
}

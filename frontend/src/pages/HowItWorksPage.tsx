import { motion } from 'framer-motion'
import { BookOpen, FolderPlus, GitBranch, RefreshCw } from 'lucide-react'
import { PublicPage } from '../components/layout/PublicPage'

const steps = [
  { icon: FolderPlus, title: 'Create a project', text: 'Name it, add one or more GitHub repository links and choose the teammates who should have access.' },
  { icon: GitBranch, title: 'Connect your repositories', text: 'Public repositories work with just a link. For private ones, connect the PRISM GitHub App for your organization.' },
  { icon: RefreshCw, title: 'PRISM extracts knowledge', text: 'The extraction service reads commits and pull requests, then reports structured knowledge and activity back to the project.' },
  { icon: BookOpen, title: 'Explore with evidence', text: 'Browse knowledge by type, check freshness, and open the exact commit or pull request behind every item.' },
]

export default function HowItWorksPage() {
  return (
    <PublicPage>
      <div className="container mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:py-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            How <span className="bg-gradient-to-r from-primary-indigo to-primary-violet bg-clip-text text-transparent">PRISM</span> works
          </h1>
          <p className="text-lg text-text-secondary">From connected repositories to a living knowledge base in four steps.</p>
        </motion.div>
        <ol className="relative space-y-10 border-l-2 border-primary-indigo/20 pl-10">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <motion.li key={title} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }} className="relative">
              <span className="absolute -left-[3.35rem] flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-indigo to-primary-violet text-white shadow-md"><Icon size={18} aria-hidden /></span>
              <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-indigo">Step {i + 1}</p>
                <h2 className="mb-2 text-xl font-bold">{title}</h2>
                <p className="leading-relaxed text-text-secondary">{text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </PublicPage>
  )
}

import { motion } from 'framer-motion'
import { Code2, Database, GitPullRequest, Network, Search, Shield } from 'lucide-react'
import { AnimatedCard } from '../components/ui/Card'
import { PublicPage } from '../components/layout/PublicPage'

const features = [
  { icon: Network, title: 'Automatic Knowledge Extraction', description: 'PRISM reads your GitHub commits and pull requests and extracts decisions, workflows and module summaries without manual entry.', color: 'text-primary-indigo bg-indigo-50' },
  { icon: Database, title: 'Source-Backed Knowledge', description: 'Every knowledge item points to the commits or pull requests it came from, so you can verify it on GitHub instead of taking it on trust.', color: 'text-white bg-gradient-to-br from-primary-indigo to-primary-violet' },
  { icon: Search, title: 'Freshness Tracking', description: 'Items are marked Fresh, Stale or Outdated from the age of their supporting activity, so out-of-date knowledge is visible.', color: 'text-primary-violet bg-violet-50' },
  { icon: GitPullRequest, title: 'On-Demand Sync', description: 'Add several repositories to one project and trigger a sync whenever you want; sync status is tracked per repository.', color: 'text-emerald-600 bg-emerald-50' },
  { icon: Shield, title: 'Contributor-Based Access', description: 'A project is visible only to its owner and contributors. Everyone else cannot even tell it exists.', color: 'text-amber-600 bg-amber-50' },
  { icon: Code2, title: 'No Raw Content Stored', description: 'PRISM keeps extracted knowledge and pointers to evidence, not copies of your source code or full GitHub content.', color: 'text-rose-600 bg-rose-50' },
]

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } }

export default function FeaturesPage() {
  return (
    <PublicPage>
      <div className="container mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-indigo/20 bg-indigo-50 px-3 py-1 text-sm font-medium text-primary-indigo">
            <Code2 size={16} aria-hidden /> What PRISM does today
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Everything you need to <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary-indigo to-primary-violet bg-clip-text text-transparent">manage technical context</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-lg text-text-secondary">
            Replace hand-written wikis with knowledge built directly from your engineering activity.
          </motion.p>
        </div>
        <motion.div variants={container} initial="hidden" animate="visible" className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, color }) => (
            <motion.div key={title} variants={item}>
              <AnimatedCard className="group flex h-full flex-col p-8">
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${color}`}><Icon size={24} aria-hidden /></div>
                <h3 className="mb-3 text-xl font-bold transition-colors group-hover:text-primary-indigo">{title}</h3>
                <p className="flex-1 leading-relaxed text-text-secondary">{description}</p>
              </AnimatedCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </PublicPage>
  )
}

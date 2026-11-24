import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, GitPullRequest, Lock, Network, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { AnimatedCard } from '../components/ui/Card'
import { PublicPage } from '../components/layout/PublicPage'

const features = [
  { icon: Network, title: 'Auto Knowledge Extraction', text: 'Extract decisions, workflows and module knowledge from your commits and pull requests - no manual entry.', color: 'bg-blue-50 text-primary-blue' },
  { icon: RefreshCw, title: 'Always Up to Date', text: 'Re-sync on demand. Every item shows how fresh it is, so stale knowledge is easy to spot.', color: 'bg-indigo-50 text-primary-indigo' },
  { icon: GitPullRequest, title: 'Evidence on Everything', text: 'Each knowledge item links back to the commit or pull request it came from, one click away on GitHub.', color: 'bg-violet-50 text-primary-violet' },
  { icon: Lock, title: 'Private by Default', text: 'Projects are visible only to their project members - like private repositories.', color: 'bg-emerald-50 text-emerald-600' },
]

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  return (
    <PublicPage blobs={false}>
      <section className="relative overflow-hidden pb-16 sm:pb-28 pt-12 sm:pt-20 lg:pt-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-light-indigo/60 via-surface-background to-surface-background" />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="max-w-2xl">
              <p className="mb-4 sm:mb-5 inline-block rounded-full border border-primary-indigo/20 bg-primary-light-indigo px-3 py-1 text-xs font-semibold text-primary-indigo">
                Zero manual documentation
              </p>
              <h1 className="mb-5 sm:mb-6 text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-text-primary">
                Automated Project <br />
                <span className="bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet bg-clip-text text-transparent">Knowledge Management</span>
              </h1>
              <p className="mb-6 sm:mb-8 max-w-xl text-base sm:text-lg leading-relaxed text-text-secondary">
                Connect your GitHub repositories once. PRISM extracts and organises your project knowledge from real engineering activity and keeps it up to date.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/register"><Button size="lg" className="w-full gap-2 sm:w-auto h-12">Get Started Free <ArrowRight size={18} aria-hidden /></Button></Link>
                <Link to="/how-it-works"><Button variant="outline" size="lg" className="w-full sm:w-auto h-12">See how it works</Button></Link>
              </div>
            </motion.div>

            <motion.div style={{ opacity, scale }} className="relative mx-auto w-full min-w-0 max-w-2xl">
              <div className="relative rotate-1 rounded-xl border border-surface-border bg-surface-card p-2 shadow-2xl transition-transform duration-500 hover:rotate-0">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet opacity-20 blur-lg" />
                <img src="/hero-illustration.jpg" alt="PRISM dashboard illustration" width={900} height={672} className="relative z-10 h-auto w-full rounded-lg object-contain" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-surface-border bg-surface-card py-14 sm:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text, color }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}>
                <AnimatedCard className="h-full p-5 sm:p-6">
                  <div className={`mb-5 sm:mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}><Icon size={24} aria-hidden /></div>
                  <h3 className="mb-2 text-base sm:text-lg font-semibold">{title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">{text}</p>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-12">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <p className="mb-4 sm:mb-6 text-sm text-text-muted">Built with</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-10 gap-y-3 text-base sm:text-lg font-semibold text-text-secondary">
            {['React', 'TypeScript', 'Spring Boot', 'PostgreSQL', 'GitHub', 'Google Gemini', 'Python Extractor', 'Vector RAG'].map((t) => <span key={t}>{t}</span>)}
          </div>
          <p className="mt-6 text-xs text-text-muted">Connect Jira, explore interactive architecture diagrams, and export PDF reports and PowerPoint decks.</p>
        </div>
      </section>
    </PublicPage>
  )
}

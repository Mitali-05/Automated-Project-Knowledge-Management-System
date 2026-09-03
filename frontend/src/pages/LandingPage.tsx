import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Network, 
  Search, 
  GitPullRequest, 
  Database,
  ArrowRight,
  GitBranch,
  LayoutGrid
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AnimatedCard } from '../components/ui/Card';
import { PublicNavbar } from '../components/layout/PublicNavbar';

export const LandingPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="min-h-screen bg-surface-background text-text-primary selection:bg-primary-indigo selection:text-white flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-light-indigo/40 via-surface-background to-surface-background"></div>
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-2xl"
              >
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary mb-6 leading-[1.1]">
                  Automated Project <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet">
                    Knowledge Management
                  </span>
                </h1>
                <p className="text-lg text-text-secondary mb-8 leading-relaxed max-w-xl">
                  Connect your GitHub repositories and Jira projects. We automatically extract, organize, and keep your project knowledge up to date.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto gap-2">
                      Get Started Free <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    View Demo
                  </Button>
                </div>
                <div className="mt-10 flex items-center gap-4 text-sm text-text-muted">
                  <span>Integrates with:</span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1.5 text-text-secondary font-medium"><GitBranch size={16} /> GitHub</span>
                    <span className="flex items-center gap-1.5 text-text-secondary font-medium"><LayoutGrid size={16} /> Jira</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                style={{ opacity, scale }}
                className="relative hidden lg:block"
              >
                <div className="relative rounded-xl border border-surface-border bg-surface-card shadow-2xl p-2 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet opacity-20 blur-lg"></div>
                  <div className="relative rounded-lg overflow-hidden border border-surface-border bg-surface-background flex flex-col h-[400px]">
                    <div className="h-10 border-b border-surface-border bg-surface-card flex items-center px-4 gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                      </div>
                    </div>
                    <div className="flex flex-1">
                      <div className="w-48 border-r border-surface-border bg-surface-card p-4 flex flex-col gap-3">
                        <div className="h-4 w-24 bg-surface-border rounded"></div>
                        <div className="h-4 w-32 bg-primary-light-indigo rounded"></div>
                        <div className="h-4 w-20 bg-surface-border rounded"></div>
                        <div className="h-4 w-28 bg-surface-border rounded"></div>
                      </div>
                      <div className="flex-1 p-6 flex flex-col gap-6">
                        <div className="flex gap-4">
                          <div className="h-24 flex-1 rounded-lg bg-surface-card border border-surface-border p-4 flex flex-col gap-2 shadow-sm">
                            <div className="h-3 w-16 bg-surface-border rounded"></div>
                            <div className="h-6 w-12 bg-primary-blue/80 rounded"></div>
                          </div>
                          <div className="h-24 flex-1 rounded-lg bg-surface-card border border-surface-border p-4 flex flex-col gap-2 shadow-sm">
                            <div className="h-3 w-20 bg-surface-border rounded"></div>
                            <div className="h-6 w-16 bg-primary-indigo/80 rounded"></div>
                          </div>
                        </div>
                        <div className="flex-1 rounded-lg bg-surface-card border border-surface-border p-4 shadow-sm flex flex-col gap-3">
                          <div className="h-4 w-32 bg-surface-border rounded mb-2"></div>
                          <div className="h-12 w-full bg-surface-background rounded flex items-center px-4 gap-3 border border-surface-border">
                            <div className="h-6 w-6 rounded bg-primary-light-violet"></div>
                            <div className="h-3 w-48 bg-surface-border rounded"></div>
                          </div>
                          <div className="h-12 w-full bg-surface-background rounded flex items-center px-4 gap-3 border border-surface-border">
                            <div className="h-6 w-6 rounded bg-primary-light-blue"></div>
                            <div className="h-3 w-36 bg-surface-border rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 bg-surface-card border-y border-surface-border">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl font-bold text-text-primary mb-4"
              >
                Everything you need to manage technical context
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-text-secondary"
              >
                CodeVault turns fragmented tools into a unified engineering knowledge base.
              </motion.p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary-light-blue flex items-center justify-center mb-6 text-primary-blue">
                  <Network size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Automatic Knowledge</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Extract technical decisions and processes automatically.</p>
              </AnimatedCard>

              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary-light-indigo flex items-center justify-center mb-6 text-primary-indigo">
                  <Database size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Source-Backed</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Keep documentation connected to engineering activity.</p>
              </AnimatedCard>

              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary-light-violet flex items-center justify-center mb-6 text-primary-violet">
                  <Search size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Knowledge Gap</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Identify missing or stale documentation.</p>
              </AnimatedCard>

              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-surface-background flex items-center justify-center mb-6 text-text-secondary border border-surface-border">
                  <GitPullRequest size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">Continuous Sync</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Keep knowledge aligned with the evolution of your code.</p>
              </AnimatedCard>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-background py-12 border-t border-surface-border">
        <div className="container mx-auto max-w-7xl px-4 text-center text-text-muted">
          <p>© 2026 CodeVault. Built around the tools your engineering teams already use.</p>
        </div>
      </footer>
    </div>
  );
};

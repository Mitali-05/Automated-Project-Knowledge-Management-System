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
  Shield,
  Sparkles,
  RefreshCw,
  Lock
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
        {/* Hero Section */}
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
              </motion.div>

              {/* Hero Image — PRISM Illustration */}
              <motion.div 
                style={{ opacity, scale }}
                className="relative hidden lg:block"
              >
                <div className="relative rounded-xl border border-surface-border bg-surface-card shadow-2xl p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet opacity-20 blur-lg"></div>
                  <img src="/hero-illustration.jpg" alt="PRISM Dashboard" className="relative z-10 w-full h-auto object-contain rounded-lg" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section id="features" className="py-24 bg-surface-card border-y border-surface-border">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center mb-6 text-primary-blue">
                  <Network size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Auto Knowledge Extraction</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Automatically extract decisions and insights from your engineering tools and repositories.</p>
              </AnimatedCard>

              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center mb-6 text-primary-indigo">
                  <RefreshCw size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Always Up to Date</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Continuous synchronization ensures your knowledge base stays fresh and never goes stale.</p>
              </AnimatedCard>

              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-violet-50 flex items-center justify-center mb-6 text-primary-violet">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
                <p className="text-text-secondary text-sm leading-relaxed">AI helps you leverage your scattered information, generate actionable documentation.</p>
              </AnimatedCard>

              <AnimatedCard className="p-6">
                <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-6 text-emerald-600">
                  <Lock size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Your data stays securely within your organization. Full control over access and permissions.</p>
              </AnimatedCard>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 bg-white">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-text-muted mb-8">
              Trusted by engineering teams:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-16">
              <div className="flex items-center gap-2">
                <img 
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original-wordmark.svg" 
                  alt="GitHub" 
                  className="h-10 opacity-80 hover:opacity-100 transition-opacity" 
                />
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jira/jira-original-wordmark.svg" 
                  alt="Jira" 
                  className="h-10 opacity-80 hover:opacity-100 transition-opacity" 
                />
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-plain-wordmark.svg" 
                  alt="AWS" 
                  className="h-10 opacity-80 hover:opacity-100 transition-opacity" 
                />
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original-wordmark.svg" 
                  alt="PostgreSQL" 
                  className="h-10 opacity-80 hover:opacity-100 transition-opacity" 
                />
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/spring/spring-original-wordmark.svg" 
                  alt="Spring Boot" 
                  className="h-10 opacity-80 hover:opacity-100 transition-opacity" 
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-card py-12 border-t border-surface-border">
        <div className="container mx-auto max-w-7xl px-4 text-center text-text-muted">
          <p>© 2026 PRISM. Built around the tools your engineering teams already use.</p>
        </div>
      </footer>
    </div>
  );
};

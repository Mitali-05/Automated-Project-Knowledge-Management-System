import React from 'react';
import { motion } from 'framer-motion';
import { 
  Network, 
  Search, 
  GitPullRequest, 
  Database,
  Shield,
  Zap,
  Code2
} from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { AnimatedCard } from '../components/ui/Card';

const features = [
  {
    icon: <Network size={24} />,
    title: "Automatic Knowledge Extraction",
    description: "PRISM reads your GitHub PRs and Jira issues, automatically extracting architectural decisions and process changes without manual entry.",
    iconColor: "text-primary-indigo",
    iconBg: "bg-indigo-50",
    delay: 0.1
  },
  {
    icon: <Database size={24} />,
    title: "Source-Backed Documentation",
    description: "Every piece of documentation is cryptographically linked to the exact pull request or ticket that originated it, ensuring 100% traceability.",
    iconColor: "text-white",
    iconBg: "bg-gradient-to-br from-primary-indigo to-primary-violet",
    delay: 0.2
  },
  {
    icon: <Search size={24} />,
    title: "Knowledge Gap Detection",
    description: "Our engine scans your codebase structure against your documentation, instantly highlighting undocumented modules or outdated systems.",
    iconColor: "text-primary-violet",
    iconBg: "bg-violet-50",
    delay: 0.3
  },
  {
    icon: <GitPullRequest size={24} />,
    title: "Continuous Synchronization",
    description: "As your code evolves, your knowledge base evolves. PRISM runs continuously on every merge to master, keeping context fresh.",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    delay: 0.4
  },
  {
    icon: <Shield size={24} />,
    title: "Enterprise Grade Security",
    description: "Your code never leaves your VPC. PRISM can be deployed on-premise or accessed via our SOC2 compliant cloud infrastructure.",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    delay: 0.5
  },
  {
    icon: <Zap size={24} />,
    title: "Instant Context Retrieval",
    description: "Ask natural language questions about your architecture and get immediate answers with citations to the exact lines of code.",
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    delay: 0.6
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const FeaturesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-background text-text-primary selection:bg-primary-indigo selection:text-white">
      <PublicNavbar />
      
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32 overflow-hidden">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-primary-indigo text-sm font-medium mb-6 border border-primary-indigo/20"
          >
            <Code2 size={16} />
            Powerful Capabilities
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary mb-6"
          >
            Everything you need to <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-indigo to-primary-violet">
              manage technical context
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-text-secondary"
          >
            PRISM replaces scattered wikis and stale documents with a living, breathing knowledge graph built directly from your engineering activity.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <AnimatedCard className="p-8 h-full flex flex-col group">
                <div className={`h-14 w-14 rounded-xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3 group-hover:text-primary-indigo transition-colors">{feature.title}</h3>
                <p className="text-text-secondary leading-relaxed flex-1">{feature.description}</p>
              </AnimatedCard>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};

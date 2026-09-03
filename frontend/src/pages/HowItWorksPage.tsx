import React from 'react';
import { motion } from 'framer-motion';
import { Network, Database, GitMerge, FileText } from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';

const steps = [
  {
    icon: <Network size={32} />,
    title: "1. Connect Your Integrations",
    description: "Link CodeVault to your GitHub organizations and Jira workspaces using secure OAuth. Select which repositories you want to track.",
    color: "from-blue-500 to-indigo-500"
  },
  {
    icon: <GitMerge size={32} />,
    title: "2. Automatic Analysis",
    description: "Every time a pull request is merged, CodeVault analyzes the diffs, reads the PR description, and cross-references linked Jira issues.",
    color: "from-indigo-500 to-violet-500"
  },
  {
    icon: <Database size={32} />,
    title: "3. Knowledge Graph Construction",
    description: "The extracted information is structured into a semantic knowledge graph. Architectural decisions are linked directly to the code modules they affect.",
    color: "from-violet-500 to-purple-500"
  },
  {
    icon: <FileText size={32} />,
    title: "4. Continuous Documentation",
    description: "Beautiful, markdown-based documentation is generated and kept fresh automatically. When code changes, the documentation updates itself.",
    color: "from-purple-500 to-pink-500"
  }
];

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-background text-text-primary selection:bg-primary-indigo selection:text-white">
      <PublicNavbar />
      
      <main className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            How CodeVault Works
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-text-secondary max-w-2xl mx-auto"
          >
            From raw engineering activity to a structured, living knowledge base in four simple steps.
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-0.5 bg-surface-border -translate-x-1/2 hidden md:block"></div>

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
                  className={`flex flex-col md:flex-row items-center gap-8 ${isEven ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className="flex-1 w-full">
                    <div className={`p-8 rounded-2xl bg-surface-card border border-surface-border shadow-sm hover:shadow-md transition-shadow relative ${isEven ? 'md:text-left' : 'md:text-right'}`}>
                      <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                      <p className="text-text-secondary leading-relaxed text-lg">{step.description}</p>
                    </div>
                  </div>
                  
                  {/* Center Node */}
                  <div className="relative z-10 flex shrink-0 items-center justify-center w-20 h-20 rounded-full bg-surface-background border-[4px] border-surface-background shadow-xl">
                    <div className={`w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br ${step.color} text-white`}>
                      {step.icon}
                    </div>
                  </div>

                  <div className="flex-1 w-full hidden md:block"></div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

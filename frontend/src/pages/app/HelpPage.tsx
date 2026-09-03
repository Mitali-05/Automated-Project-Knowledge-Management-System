import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, BookOpen, MessageSquare, ExternalLink, Mail, FileText, Video, Zap } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

const helpSections = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of setting up your first project and connecting your repositories.',
    icon: Zap,
    color: '#6366f1',
    articles: ['Quick Start Guide', 'Connecting GitHub', 'Adding Team Members', 'Your First Knowledge Sync']
  },
  {
    title: 'Documentation',
    description: 'Comprehensive guides covering all features and capabilities.',
    icon: BookOpen,
    color: '#3b82f6',
    articles: ['API Reference', 'Configuration Options', 'Advanced Search Syntax', 'Webhook Setup']
  },
  {
    title: 'Video Tutorials',
    description: 'Step-by-step video walkthroughs of common workflows.',
    icon: Video,
    color: '#8b5cf6',
    articles: ['Project Setup Walkthrough', 'Knowledge Gap Analysis', 'Team Collaboration', 'Dashboard Deep Dive']
  },
  {
    title: 'FAQs',
    description: 'Answers to the most commonly asked questions.',
    icon: FileText,
    color: '#06b6d4',
    articles: ['How does knowledge extraction work?', 'What data do we store?', 'How to reset my password?', 'Billing & Plans']
  },
];

export const HelpPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-surface-background">
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-indigo/10 flex items-center justify-center">
                <HelpCircle size={20} className="text-primary-indigo" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary">Help Center</h1>
            </div>
            <p className="text-text-secondary ml-[52px]">Find answers, tutorials, and guides to help you get the most out of PKM.</p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search help articles..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-surface-border bg-surface-card text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-indigo transition-shadow text-sm"
              />
              <MessageSquare size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          </motion.div>

          {/* Help Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpSections.map((section, i) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 h-full group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${section.color}15` }}>
                          <Icon size={20} style={{ color: section.color }} />
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-indigo transition-colors">{section.title}</h3>
                      </div>
                      <p className="text-sm text-text-secondary mb-4">{section.description}</p>
                      <ul className="space-y-2">
                        {section.articles.map((article) => (
                          <li key={article}>
                            <a href="#" className="text-sm text-text-muted hover:text-primary-indigo transition-colors flex items-center gap-2">
                              <ExternalLink size={12} />
                              {article}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Contact Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-primary-indigo to-primary-violet text-white">
              <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Mail size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Still need help?</h3>
                    <p className="text-sm text-white/80">Our support team is available 24/7 to assist you.</p>
                  </div>
                </div>
                <button className="px-6 py-2.5 bg-white text-primary-indigo rounded-lg font-medium hover:bg-white/90 transition-colors shadow-lg">
                  Contact Support
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

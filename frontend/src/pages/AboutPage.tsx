import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Users, Globe2, Building2 } from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Card, CardContent } from '../components/ui/Card';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-background text-text-primary selection:bg-primary-indigo selection:text-white">
      <PublicNavbar />
      
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-primary mb-6">
              Engineering knowledge shouldn't be a chore.
            </h1>
            <div className="space-y-6 text-lg text-text-secondary leading-relaxed">
              <p>
                We built PRISM because we were tired of the same cycle: engineers write brilliant code, solve complex architectural problems, and then... the knowledge is lost in Slack threads and closed Jira tickets.
              </p>
              <p>
                Traditional wikis force engineers to stop working and become technical writers. It doesn't work. Documentation becomes stale the moment it's written.
              </p>
              <p className="font-medium text-text-primary">
                We believe that the systems tracking your work should also understand your work.
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            <Card className="bg-indigo-50 border-none shadow-sm">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                <Users size={32} className="text-primary-indigo mb-4" />
                <h4 className="text-3xl font-bold text-primary-indigo mb-2">10k+</h4>
                <p className="text-text-secondary text-sm font-medium">Engineers using PRISM</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary-indigo to-primary-violet border-none shadow-lg translate-y-8">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                <GitBranch size={32} className="text-white/80 mb-4" />
                <h4 className="text-3xl font-bold text-white mb-2">5M+</h4>
                <p className="text-white/70 text-sm font-medium">PRs Analyzed</p>
              </CardContent>
            </Card>
            <Card className="bg-violet-50 border-none shadow-sm">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                <Globe2 size={32} className="text-primary-violet mb-4" />
                <h4 className="text-3xl font-bold text-primary-violet mb-2">99.9%</h4>
                <p className="text-text-secondary text-sm font-medium">Uptime SLA</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-none shadow-sm translate-y-8">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                <Building2 size={32} className="text-emerald-600 mb-4" />
                <h4 className="text-3xl font-bold text-emerald-600 mb-2">500+</h4>
                <p className="text-text-secondary text-sm font-medium">Enterprise Customers</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

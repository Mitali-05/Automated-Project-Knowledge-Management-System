import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  GitBranch, 
  Server,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Cpu,
  Database
} from 'lucide-react';
import type { Project, KnowledgeItem } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, AnimatedCard } from '../../../components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { apiClient } from '../../../api/client';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const COLORS = ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export const ProjectOverviewTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const response = await apiClient.get(`/projects/${project.id}/knowledge`);
        setKnowledge(response.data);
      } catch (err) {
        console.error("Failed to fetch knowledge", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKnowledge();
  }, [project.id]);

  const stats = [
    { label: 'Total Extractions', value: knowledge.length, icon: BookOpen, color: 'text-primary-blue', bg: 'bg-primary-light-blue' },
    { label: 'Contributors', value: project.contributors?.length || 1, icon: Users, color: 'text-primary-indigo', bg: 'bg-primary-light-indigo' },
    { label: 'Repositories', value: project.repositories?.length || 0, icon: GitBranch, color: 'text-primary-violet', bg: 'bg-primary-light-violet' },
  ];

  // Derive charts and insights from actual knowledge
  const typeDistribution = knowledge.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(typeDistribution).map(key => ({
    name: key,
    value: typeDistribution[key]
  }));

  // Simple heuristic to extract "precautions" vs "improvements" based on keywords
  const precautions = knowledge.filter(k => 
    k.type === 'Troubleshooting' || 
    k.description.toLowerCase().includes('risk') || 
    k.description.toLowerCase().includes('security') ||
    k.description.toLowerCase().includes('fail')
  ).slice(0, 3);

  const improvements = knowledge.filter(k => 
    k.type === 'Architecture' || 
    k.description.toLowerCase().includes('improve') || 
    k.description.toLowerCase().includes('optimize') ||
    k.description.toLowerCase().includes('better')
  ).slice(0, 3);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <AnimatedCard className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-text-primary">{loading ? '-' : stat.value}</p>
                <p className="text-sm text-text-secondary font-medium">{stat.label}</p>
              </div>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>

      {/* Generation Pipeline Visual */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-primary-indigo/5 via-primary-violet/5 to-surface-background border-primary-indigo/10">
          <CardHeader>
            <CardTitle className="text-base text-primary-indigo flex items-center gap-2">
              <RefreshCw size={18} />
              Knowledge Generation Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4">
              <div className="flex flex-col items-center text-center p-4 bg-surface-background rounded-xl border border-surface-border w-full md:w-1/3">
                <GitBranch size={32} className="text-text-muted mb-2" />
                <h4 className="font-semibold text-text-primary">1. Source Integration</h4>
                <p className="text-xs text-text-muted mt-1">Ingests commits, PRs, and docs from public/private repositories.</p>
              </div>
              <ArrowRight className="hidden md:block text-primary-indigo/40" size={32} />
              <div className="flex flex-col items-center text-center p-4 bg-primary-indigo/5 border border-primary-indigo/20 rounded-xl w-full md:w-1/3 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-indigo/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <Cpu size={32} className="text-primary-indigo mb-2" />
                <h4 className="font-semibold text-primary-indigo">2. AI Extraction Engine</h4>
                <p className="text-xs text-primary-indigo/70 mt-1">Identifies architectural decisions, risks, and technical debt uniquely missed by standard tools.</p>
              </div>
              <ArrowRight className="hidden md:block text-primary-violet/40" size={32} />
              <div className="flex flex-col items-center text-center p-4 bg-surface-background rounded-xl border border-surface-border w-full md:w-1/3">
                <Database size={32} className="text-text-muted mb-2" />
                <h4 className="font-semibold text-text-primary">3. Knowledge Base</h4>
                <p className="text-xs text-text-muted mt-1">Structured semantic graph for querying, onboarding, and proactive alerts.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Architecture Distribution */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server size={18} className="text-primary-indigo" />
                Architecture Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center pb-6">
              {loading ? (
                <div className="text-sm text-text-muted">Analyzing architecture...</div>
              ) : chartData.length > 0 ? (
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-text-muted text-center py-10">No architecture data available yet. Generate knowledge to see distribution.</div>
              )}
              {chartData.length > 0 && (
                <div className="flex flex-wrap gap-4 justify-center mt-6">
                  {chartData.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-text-secondary font-medium">{entry.name} <span className="text-text-muted">({entry.value})</span></span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

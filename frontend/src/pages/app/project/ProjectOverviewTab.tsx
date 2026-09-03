import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  GitBranch, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import type { Project } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, AnimatedCard } from '../../../components/ui/Card';
import { mockKnowledge } from '../../../mock/knowledge';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const ProjectOverviewTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();
  const projectKnowledge = mockKnowledge.filter(k => k.projectId === project.id);

  const stats = [
    { label: 'Knowledge Items', value: project.knowledgeItemCount, icon: BookOpen, color: 'text-primary-blue', bg: 'bg-primary-light-blue' },
    { label: 'Contributors', value: project.contributors.length, icon: Users, color: 'text-primary-indigo', bg: 'bg-primary-light-indigo' },
    { label: 'Repositories', value: project.repositories.length, icon: GitBranch, color: 'text-primary-violet', bg: 'bg-primary-light-violet' },
    { label: 'Knowledge Gaps', value: 3, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const freshnessData = [
    { label: 'Fresh', count: Math.floor(project.knowledgeItemCount * 0.65), color: 'bg-emerald-500' },
    { label: 'Stale', count: Math.floor(project.knowledgeItemCount * 0.25), color: 'bg-amber-500' },
    { label: 'Outdated', count: Math.floor(project.knowledgeItemCount * 0.10), color: 'bg-red-500' },
  ];

  const totalFreshness = freshnessData.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <AnimatedCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon size={20} />
                </div>
                <ArrowUpRight size={16} className="text-text-muted" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Freshness Overview */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 size={18} className="text-primary-indigo" />
                Knowledge Freshness
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Bar */}
              <div className="flex rounded-full overflow-hidden h-3 mb-4">
                {freshnessData.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${item.color} transition-all duration-500`}
                    style={{ width: `${(item.count / totalFreshness) * 100}%` }}
                  />
                ))}
              </div>
              <div className="space-y-3">
                {freshnessData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${item.color}`}></div>
                      <span className="text-text-secondary">{item.label}</span>
                    </div>
                    <span className="font-semibold text-text-primary">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Knowledge Items */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen size={18} className="text-primary-indigo" />
                Recent Knowledge Extractions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectKnowledge.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-background transition-colors cursor-pointer group">
                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                      item.freshness === 'Fresh' ? 'bg-emerald-500' : item.freshness === 'Stale' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary group-hover:text-primary-indigo transition-colors truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {item.module} · {item.type} · {item.sources.length} source{item.sources.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Contributors */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={18} className="text-primary-indigo" />
              Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {project.contributors.map((contributor) => (
                <div key={contributor.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-background">
                  <img
                    src={contributor.avatarUrl || `https://i.pravatar.cc/150?u=${contributor.id}`}
                    alt={contributor.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{contributor.name}</p>
                    <p className="text-xs text-text-muted">{contributor.contributions} contributions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

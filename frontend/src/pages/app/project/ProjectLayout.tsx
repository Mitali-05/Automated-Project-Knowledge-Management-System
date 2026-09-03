import React from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  LayoutGrid, 
  Sparkles, 
  GitBranch,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { mockProjects } from '../../../mock/projects';
import { cn } from '../../../utils/cn';

const projectTabs = [
  { label: 'Overview', path: 'overview', icon: LayoutDashboard },
  { label: 'Knowledge', path: 'knowledge', icon: BookOpen },
  { label: 'History', path: 'history', icon: History },
  { label: 'Jira', path: 'jira', icon: LayoutGrid },
  { label: 'Prompts', path: 'prompts', icon: Sparkles },
  { label: 'GitHub', path: 'github', icon: GitBranch },
];

const syncStatusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Synced: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Synced' },
  Syncing: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Syncing' },
  Failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
  Pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending' },
};

export const ProjectLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const project = mockProjects.find(p => p.id === id);

  if (!project) {
    return <Navigate to="/app/overview" replace />;
  }

  const syncInfo = syncStatusConfig[project.syncStatus] || syncStatusConfig.Pending;
  const SyncIcon = syncInfo.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b border-surface-border bg-surface-card px-6 pt-5 pb-0"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
            <p className="text-sm text-text-secondary mt-1">{project.description}</p>
          </div>
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", syncInfo.bg, syncInfo.color)}>
            <SyncIcon size={14} className={project.syncStatus === 'Syncing' ? 'animate-spin' : ''} />
            {syncInfo.label}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-1 -mb-px">
          {projectTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all duration-200",
                  isActive
                    ? "border-primary-indigo text-primary-indigo bg-primary-light-indigo/30"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-background"
                )
              }
            >
              <tab.icon size={16} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </motion.div>

      {/* Tab Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex-1 overflow-y-auto"
      >
        <Outlet context={{ project }} />
      </motion.div>
    </div>
  );
};

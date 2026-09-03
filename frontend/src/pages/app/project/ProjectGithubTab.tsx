import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Star,
  GitFork,
  Eye
} from 'lucide-react';
import type { Project } from '../../../types';
import { AnimatedCard } from '../../../components/ui/Card';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface RepoDetail {
  id: string;
  owner: string;
  name: string;
  url: string;
  syncStatus: 'Synced' | 'Syncing' | 'Failed';
  lastSyncedAt: string;
  branch: string;
  stars: number;
  forks: number;
  openPRs: number;
  commitsIngested: number;
  prsIngested: number;
  language: string;
  languageColor: string;
}

const mockRepoDetails: RepoDetail[] = [
  {
    id: 'r-1', owner: 'acme', name: 'payment-service', url: 'https://github.com/acme/payment-service',
    syncStatus: 'Synced', lastSyncedAt: new Date(Date.now() - 120000).toISOString(),
    branch: 'main', stars: 42, forks: 12, openPRs: 3, commitsIngested: 1847, prsIngested: 381,
    language: 'Java', languageColor: 'bg-orange-400'
  },
  {
    id: 'r-2', owner: 'acme', name: 'payment-gateway-sdk', url: 'https://github.com/acme/payment-gateway-sdk',
    syncStatus: 'Synced', lastSyncedAt: new Date(Date.now() - 300000).toISOString(),
    branch: 'main', stars: 18, forks: 5, openPRs: 1, commitsIngested: 562, prsIngested: 94,
    language: 'TypeScript', languageColor: 'bg-blue-500'
  },
  {
    id: 'r-3', owner: 'acme', name: 'payment-ui-components', url: 'https://github.com/acme/payment-ui-components',
    syncStatus: 'Syncing', lastSyncedAt: new Date(Date.now() - 600000).toISOString(),
    branch: 'develop', stars: 8, forks: 2, openPRs: 5, commitsIngested: 315, prsIngested: 67,
    language: 'React', languageColor: 'bg-cyan-400'
  },
];

const syncStatusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Synced: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  Syncing: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
  Failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
};

export const ProjectGithubTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();

  const totalCommits = mockRepoDetails.reduce((s, r) => s + r.commitsIngested, 0);
  const totalPRs = mockRepoDetails.reduce((s, r) => s + r.prsIngested, 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <GitBranch size={20} className="text-primary-indigo" />
              Connected Repositories
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {mockRepoDetails.length} repositories · {totalCommits.toLocaleString()} commits · {totalPRs.toLocaleString()} PRs ingested
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => alert('Add repository flow would open here')}>
            <GitBranch size={14} />
            Connect Repo
          </Button>
        </div>

        {/* Repo Cards */}
        <div className="space-y-4">
          {mockRepoDetails.map((repo, idx) => {
            const syncInfo = syncStatusConfig[repo.syncStatus];
            const SyncIcon = syncInfo.icon;

            return (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, type: "spring", stiffness: 300, damping: 25 }}
              >
                <AnimatedCard className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-900 flex items-center justify-center text-white">
                          <GitBranch size={20} />
                        </div>
                        <div>
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-text-primary hover:text-primary-indigo transition-colors flex items-center gap-1.5"
                          >
                            {repo.owner}/{repo.name}
                            <ExternalLink size={12} className="text-text-muted" />
                          </a>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1">
                              <div className={`h-2.5 w-2.5 rounded-full ${repo.languageColor}`}></div>
                              <span className="text-xs text-text-secondary">{repo.language}</span>
                            </div>
                            <span className="text-xs text-text-muted">·</span>
                            <span className="text-xs text-text-muted">Branch: {repo.branch}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <Star size={12} className="text-amber-400" /> {repo.stars}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <GitFork size={12} /> {repo.forks}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <Eye size={12} /> {repo.openPRs} open PRs
                        </span>
                        <div className="flex-1"></div>
                        <div className="flex gap-4 text-xs text-text-muted">
                          <span><strong className="text-text-secondary">{repo.commitsIngested.toLocaleString()}</strong> commits ingested</span>
                          <span><strong className="text-text-secondary">{repo.prsIngested.toLocaleString()}</strong> PRs ingested</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${syncInfo.bg} ${syncInfo.color}`}>
                        <SyncIcon size={12} className={repo.syncStatus === 'Syncing' ? 'animate-spin' : ''} />
                        {repo.syncStatus}
                      </div>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(repo.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs gap-1 h-7 px-2"
                        onClick={() => alert(`Triggering sync for ${repo.name}...`)}
                      >
                        <RefreshCw size={12} /> Sync Now
                      </Button>
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

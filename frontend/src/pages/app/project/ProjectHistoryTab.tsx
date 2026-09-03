import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  Eye, 
  ExternalLink,
  Plus,
  Minus
} from 'lucide-react';
import type { Project } from '../../../types';

interface HistoryEntry {
  id: string;
  type: 'commit' | 'pull_request' | 'review' | 'comment';
  title: string;
  author: string;
  authorAvatar: string;
  timestamp: string;
  repo: string;
  additions?: number;
  deletions?: number;
  sha?: string;
}

const mockHistory: HistoryEntry[] = [
  {
    id: 'h-1', type: 'pull_request', title: 'feat: implement exponential backoff for payment retries',
    author: 'Rahul Verma', authorAvatar: 'https://i.pravatar.cc/150?u=rahul',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    repo: 'payment-service', additions: 142, deletions: 38
  },
  {
    id: 'h-2', type: 'commit', title: 'fix: correct HikariCP pool sizing for production',
    author: 'Sneha Iyer', authorAvatar: 'https://i.pravatar.cc/150?u=sneha',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    repo: 'payment-service', sha: '8ac91d2', additions: 12, deletions: 4
  },
  {
    id: 'h-3', type: 'review', title: 'Approved: OAuth2 migration for auth module',
    author: 'Aman Khan', authorAvatar: 'https://i.pravatar.cc/150?u=aman',
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    repo: 'payment-service'
  },
  {
    id: 'h-4', type: 'pull_request', title: 'refactor: webhook-based payment status updates',
    author: 'Vikram Singh', authorAvatar: 'https://i.pravatar.cc/150?u=vikram',
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
    repo: 'payment-gateway-sdk', additions: 287, deletions: 103
  },
  {
    id: 'h-5', type: 'commit', title: 'chore: update Stripe SDK to v15.2.0',
    author: 'Rahul Verma', authorAvatar: 'https://i.pravatar.cc/150?u=rahul',
    timestamp: new Date(Date.now() - 1.5 * 86400000).toISOString(),
    repo: 'payment-service', sha: 'f4e2a1b', additions: 8, deletions: 6
  },
  {
    id: 'h-6', type: 'comment', title: 'Discussion: Redis cluster topology for session management',
    author: 'Sneha Iyer', authorAvatar: 'https://i.pravatar.cc/150?u=sneha',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    repo: 'payment-service'
  },
  {
    id: 'h-7', type: 'pull_request', title: 'feat: add Redis caching layer for auth sessions',
    author: 'Aman Khan', authorAvatar: 'https://i.pravatar.cc/150?u=aman',
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    repo: 'payment-service', additions: 198, deletions: 42
  },
  {
    id: 'h-8', type: 'commit', title: 'docs: update API reference for payment endpoints',
    author: 'Vikram Singh', authorAvatar: 'https://i.pravatar.cc/150?u=vikram',
    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
    repo: 'payment-ui-components', sha: 'a3b7c9e', additions: 55, deletions: 12
  },
];

const typeConfig = {
  commit: { icon: GitCommit, color: 'bg-emerald-500', label: 'Commit' },
  pull_request: { icon: GitPullRequest, color: 'bg-primary-indigo', label: 'PR' },
  review: { icon: Eye, color: 'bg-primary-violet', label: 'Review' },
  comment: { icon: MessageSquare, color: 'bg-amber-500', label: 'Comment' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const ProjectHistoryTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative"
      >
        {/* Timeline Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-surface-border"></div>

        <div className="space-y-1">
          {mockHistory.map((entry, idx) => {
            const config = typeConfig[entry.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, type: "spring", stiffness: 300, damping: 25 }}
                className="relative pl-14 py-3 group"
              >
                {/* Timeline Node */}
                <div className={`absolute left-[12px] top-[18px] h-7 w-7 rounded-full ${config.color} flex items-center justify-center text-white shadow-sm ring-4 ring-surface-background z-10`}>
                  <Icon size={14} />
                </div>

                {/* Content Card */}
                <div className="p-4 rounded-xl border border-surface-border bg-surface-card hover:shadow-md hover:border-primary-indigo/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary group-hover:text-primary-indigo transition-colors">
                        {entry.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <img src={entry.authorAvatar} alt={entry.author} className="h-5 w-5 rounded-full" />
                          <span className="text-xs text-text-secondary">{entry.author}</span>
                        </div>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs text-text-muted">{entry.repo}</span>
                        {entry.sha && (
                          <>
                            <span className="text-xs text-text-muted">·</span>
                            <code className="text-xs text-primary-indigo bg-primary-light-indigo px-1.5 py-0.5 rounded font-mono">{entry.sha}</code>
                          </>
                        )}
                        {(entry.additions !== undefined || entry.deletions !== undefined) && (
                          <span className="flex items-center gap-1 text-xs">
                            {entry.additions !== undefined && (
                              <span className="flex items-center text-emerald-600"><Plus size={10} />{entry.additions}</span>
                            )}
                            {entry.deletions !== undefined && (
                              <span className="flex items-center text-red-500"><Minus size={10} />{entry.deletions}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-text-muted">{timeAgo(entry.timestamp)}</span>
                      <ExternalLink size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

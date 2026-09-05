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
        <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-surface-border rounded-xl">
          <GitCommit size={48} className="text-surface-border mb-4" />
          <h3 className="text-lg font-semibold text-text-primary">No recent activity</h3>
          <p className="text-sm text-text-muted mt-2 text-center max-w-sm">
            Activity and history from your repositories will appear here once the project is fully synced.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

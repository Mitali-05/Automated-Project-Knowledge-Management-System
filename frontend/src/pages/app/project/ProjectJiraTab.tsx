import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LayoutGrid,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import type { Project } from '../../../types';
import { AnimatedCard } from '../../../components/ui/Card';

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: 'Done' | 'In Progress' | 'To Do' | 'In Review';
  priority: 'High' | 'Medium' | 'Low';
  assignee: string;
  assigneeAvatar: string;
  type: 'Story' | 'Bug' | 'Task' | 'Epic';
  updatedAt: string;
  linkedPRs: number;
}

const mockJiraIssues: JiraIssue[] = [
  { id: 'ji-1', key: 'PAY-142', summary: 'Implement exponential backoff for payment retries', status: 'Done', priority: 'High', assignee: 'Rahul Verma', assigneeAvatar: 'https://i.pravatar.cc/150?u=rahul', type: 'Story', updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), linkedPRs: 2 },
  { id: 'ji-2', key: 'PAY-156', summary: 'Fix race condition in webhook processing', status: 'In Progress', priority: 'High', assignee: 'Sneha Iyer', assigneeAvatar: 'https://i.pravatar.cc/150?u=sneha', type: 'Bug', updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(), linkedPRs: 1 },
  { id: 'ji-3', key: 'PAY-161', summary: 'Upgrade Stripe SDK to v15.x', status: 'Done', priority: 'Medium', assignee: 'Aman Khan', assigneeAvatar: 'https://i.pravatar.cc/150?u=aman', type: 'Task', updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(), linkedPRs: 1 },
  { id: 'ji-4', key: 'PAY-170', summary: 'Add multi-currency support for EU payments', status: 'To Do', priority: 'High', assignee: 'Vikram Singh', assigneeAvatar: 'https://i.pravatar.cc/150?u=vikram', type: 'Epic', updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(), linkedPRs: 0 },
  { id: 'ji-5', key: 'PAY-172', summary: 'Review PCI compliance for new card storage flow', status: 'In Review', priority: 'High', assignee: 'Rahul Verma', assigneeAvatar: 'https://i.pravatar.cc/150?u=rahul', type: 'Task', updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(), linkedPRs: 0 },
  { id: 'ji-6', key: 'PAY-178', summary: 'Optimize database queries for transaction history', status: 'In Progress', priority: 'Medium', assignee: 'Sneha Iyer', assigneeAvatar: 'https://i.pravatar.cc/150?u=sneha', type: 'Story', updatedAt: new Date(Date.now() - 0.5 * 86400000).toISOString(), linkedPRs: 1 },
];

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'Done': { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'In Progress': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  'To Do': { icon: LayoutGrid, color: 'text-gray-500', bg: 'bg-gray-100' },
  'In Review': { icon: AlertCircle, color: 'text-violet-600', bg: 'bg-violet-50' },
};

const priorityColors: Record<string, string> = {
  High: 'text-red-600 bg-red-50',
  Medium: 'text-amber-600 bg-amber-50',
  Low: 'text-gray-500 bg-gray-100',
};

const typeColors: Record<string, string> = {
  Story: 'text-green-700 bg-green-50',
  Bug: 'text-red-700 bg-red-50',
  Task: 'text-blue-700 bg-blue-50',
  Epic: 'text-violet-700 bg-violet-50',
};

export const ProjectJiraTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const statuses = ['All', 'Done', 'In Progress', 'In Review', 'To Do'];

  const filteredIssues = statusFilter === 'All'
    ? mockJiraIssues
    : mockJiraIssues.filter(i => i.status === statusFilter);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Jira Issues — {project.jiraProject?.key || 'PAY'}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {mockJiraIssues.length} linked issues from project {project.jiraProject?.name || 'Payments'}
            </p>
          </div>
          <div className="flex gap-2">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-primary-indigo text-white shadow-sm'
                    : 'bg-surface-card border border-surface-border text-text-secondary hover:bg-surface-background'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Issue List */}
        <div className="space-y-3">
          {filteredIssues.map((issue, idx) => {
            const statusInfo = statusConfig[issue.status];
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <AnimatedCard className="p-4 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`h-8 w-8 rounded-lg ${statusInfo.bg} ${statusInfo.color} flex items-center justify-center shrink-0`}>
                      <StatusIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono font-semibold text-primary-indigo bg-primary-light-indigo px-1.5 py-0.5 rounded">{issue.key}</code>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[issue.type]}`}>{issue.type}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[issue.priority]}`}>{issue.priority}</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{issue.summary}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <img src={issue.assigneeAvatar} alt={issue.assignee} className="h-6 w-6 rounded-full" />
                        <span className="text-xs text-text-secondary hidden lg:inline">{issue.assignee}</span>
                      </div>
                      {issue.linkedPRs > 0 && (
                        <span className="text-xs text-text-muted bg-surface-background px-2 py-1 rounded-md">
                          {issue.linkedPRs} PR{issue.linkedPRs > 1 ? 's' : ''}
                        </span>
                      )}
                      <ExternalLink size={14} className="text-text-muted" />
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

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  MessageSquare, 
  Clock, 
  Tag
} from 'lucide-react';
import type { Project } from '../../../types';
import { AnimatedCard } from '../../../components/ui/Card';

interface PromptEntry {
  id: string;
  tool: string;
  toolIcon: string;
  promptSummary: string;
  aiSummary: string;
  relatedModule: string;
  timestamp: string;
  user: string;
  userAvatar: string;
}

const mockPrompts: PromptEntry[] = [
  {
    id: 'pr-1', tool: 'Claude Code', toolIcon: '🤖',
    promptSummary: 'Explain the payment retry mechanism and suggest improvements',
    aiSummary: 'Discussed the exponential backoff implementation in PaymentRetryService. Suggested adding jitter and configurable max retry count via environment variables.',
    relatedModule: 'Payment Service',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    user: 'Rahul Verma', userAvatar: 'https://i.pravatar.cc/150?u=rahul'
  },
  {
    id: 'pr-2', tool: 'ChatGPT', toolIcon: '💬',
    promptSummary: 'Generate unit tests for the webhook handler',
    aiSummary: 'Created 12 unit tests covering success, failure, retry, and malformed payload scenarios for WebhookController.',
    relatedModule: 'Payment Service',
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    user: 'Sneha Iyer', userAvatar: 'https://i.pravatar.cc/150?u=sneha'
  },
  {
    id: 'pr-3', tool: 'Claude Code', toolIcon: '🤖',
    promptSummary: 'Review the OAuth2 migration plan and identify risks',
    aiSummary: 'Identified 3 key risks: token rotation during rollout, backward compatibility with v1 clients, and session invalidation timing.',
    relatedModule: 'Auth Module',
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
    user: 'Aman Khan', userAvatar: 'https://i.pravatar.cc/150?u=aman'
  },
  {
    id: 'pr-4', tool: 'GitHub Copilot', toolIcon: '🐙',
    promptSummary: 'Autocomplete Redis caching configuration for sessions',
    aiSummary: 'Generated RedisConfig class with connection pooling, TTL settings, and serialization config for Spring Boot session management.',
    relatedModule: 'Auth Module',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    user: 'Vikram Singh', userAvatar: 'https://i.pravatar.cc/150?u=vikram'
  },
  {
    id: 'pr-5', tool: 'Claude Code', toolIcon: '🤖',
    promptSummary: 'Analyze HikariCP pool exhaustion logs and suggest config',
    aiSummary: 'Analyzed thread dumps showing pool starvation under 200+ concurrent connections. Recommended increasing max pool to 50 with idle timeout of 5 minutes.',
    relatedModule: 'Database',
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    user: 'Rahul Verma', userAvatar: 'https://i.pravatar.cc/150?u=rahul'
  },
];

const toolColors: Record<string, { bg: string; text: string }> = {
  'Claude Code': { bg: 'bg-orange-50', text: 'text-orange-700' },
  'ChatGPT': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'GitHub Copilot': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const ProjectPromptsTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Sparkles size={20} className="text-primary-indigo" />
            AI Prompt History
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Tracked AI tool usage across your engineering team for this project.
          </p>
        </div>

        <div className="space-y-4">
          {mockPrompts.map((prompt, idx) => {
            const toolColor = toolColors[prompt.tool] || toolColors['Claude Code'];
            return (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, type: "spring", stiffness: 300, damping: 25 }}
              >
                <AnimatedCard className="p-5 cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl shrink-0 mt-0.5">{prompt.toolIcon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${toolColor.bg} ${toolColor.text}`}>
                          {prompt.tool}
                        </span>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Tag size={10} /> {prompt.relatedModule}
                        </span>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(prompt.timestamp)}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-start gap-2 mb-2">
                          <MessageSquare size={14} className="text-text-muted mt-0.5 shrink-0" />
                          <p className="text-sm font-medium text-text-primary">{prompt.promptSummary}</p>
                        </div>
                        <div className="flex items-start gap-2 ml-0 pl-5 border-l-2 border-primary-light-indigo">
                          <p className="text-xs text-text-secondary leading-relaxed">{prompt.aiSummary}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <img src={prompt.userAvatar} alt={prompt.user} className="h-5 w-5 rounded-full" />
                        <span className="text-xs text-text-secondary">{prompt.user}</span>
                      </div>
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

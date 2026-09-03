import type { KnowledgeItem } from '../types';

export const mockKnowledge: KnowledgeItem[] = [
  {
    id: 'k-1',
    projectId: 'p-1',
    title: 'Payment retry mechanism changed to exponential backoff',
    type: 'Technical Decision',
    preview: 'To reduce load on the payment gateway during outages, the retry mechanism has been updated to use exponential backoff instead of linear retries.',
    description: 'We were experiencing rate limiting from our upstream payment provider (Stripe) during partial outages because our retry logic was linear (retry every 2 seconds). This has been changed to exponential backoff starting at 1s, maxing out at 30s, with a jitter factor of 0.1.',
    module: 'Payment Service',
    confidence: 'High',
    freshness: 'Fresh',
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    sources: [
      { id: 's-1', type: 'GitHub PR', reference: 'PR #381', url: '#' },
      { id: 's-2', type: 'Jira Issue', reference: 'PAY-142', url: '#' },
      { id: 's-3', type: 'Commit', reference: '8ac91d2', url: '#' }
    ]
  },
  {
    id: 'k-2',
    projectId: 'p-1',
    title: 'New webhook-based payment status update process',
    type: 'Process',
    preview: 'Payment status updates are now handled asynchronously via webhooks rather than polling the gateway.',
    description: 'Moved away from synchronous polling to webhook-based updates to improve system responsiveness and reduce unnecessary API calls to the payment gateway.',
    module: 'Payment Service',
    confidence: 'Medium',
    freshness: 'Stale',
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    sources: [
      { id: 's-4', type: 'GitHub PR', reference: 'PR #234', url: '#' }
    ]
  },
  {
    id: 'k-3',
    projectId: 'p-1',
    title: 'Switched from JWT to OAuth2 + JWT',
    type: 'Technical Decision',
    preview: 'Authentication mechanism updated to standard OAuth2 flow with JWT for stateless session management.',
    description: 'To better support third-party integrations and improve security, we migrated from simple JWT to a full OAuth2 flow.',
    module: 'Auth Module',
    confidence: 'High',
    freshness: 'Fresh',
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    sources: [
      { id: 's-5', type: 'Code Review', reference: 'CR-92', url: '#' },
      { id: 's-6', type: 'Jira Issue', reference: 'PAY-89', url: '#' }
    ]
  },
  {
    id: 'k-4',
    projectId: 'p-1',
    title: 'Redis caching for session management',
    type: 'Architecture',
    preview: 'Redis cluster introduced to handle distributed session state across auth service instances.',
    description: 'Session tokens and rate limit counters are now stored in a Redis cluster to allow the auth service to scale horizontally.',
    module: 'Auth Module',
    confidence: 'High',
    freshness: 'Outdated',
    updatedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    sources: [
      { id: 's-7', type: 'Commit', reference: 'f4e2a1', url: '#' }
    ]
  },
  {
    id: 'k-5',
    projectId: 'p-1',
    title: 'Database connection pooling configuration updated',
    type: 'Configuration',
    preview: 'HikariCP max pool size increased to 50 and idle timeout reduced to 300000ms.',
    description: 'Due to connection exhaustion under high load, the database connection pool settings were adjusted.',
    module: 'Database',
    confidence: 'High',
    freshness: 'Fresh',
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    sources: [
      { id: 's-8', type: 'GitHub PR', reference: 'PR #402', url: '#' }
    ]
  }
];

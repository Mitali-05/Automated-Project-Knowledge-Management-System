export type Role = 'Organization Admin' | 'Project Admin' | 'Member' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  connectionMethod: 'OAuth' | 'Personal Access Token';
}

export interface JiraProject {
  id: string;
  name: string;
  key: string;
}

export interface Contributor {
  id: string;
  userId: string;
  name: string;
  contributions: number;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  repositories: Repository[];
  jiraProject?: JiraProject;
  contributors: Contributor[];
  syncStatus: 'Synced' | 'Syncing' | 'Failed' | 'Pending';
  lastSyncedAt?: string;
  knowledgeItemCount: number;
}

export type KnowledgeType = 'Technical Decision' | 'Architecture' | 'Process' | 'Configuration' | 'Troubleshooting';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type KnowledgeFreshness = 'Fresh' | 'Stale' | 'Outdated';

export interface KnowledgeSource {
  id: string;
  type: 'GitHub PR' | 'Jira Issue' | 'Commit' | 'Code Review' | 'Comment';
  reference: string;
  url?: string;
}

export interface KnowledgeItem {
  id: string;
  projectId: string;
  title: string;
  type: KnowledgeType;
  preview: string;
  description: string;
  module: string;
  confidence: ConfidenceLevel;
  freshness: KnowledgeFreshness;
  updatedAt: string;
  sources: KnowledgeSource[];
}

export type ActivityType = 'Commit' | 'Pull Request' | 'Issue' | 'Code Review' | 'Comment';

export interface Activity {
  id: string;
  projectId: string;
  type: ActivityType;
  title: string;
  author: string;
  timestamp: string;
  module?: string;
  repository?: string;
  metadata?: {
    additions?: number;
    deletions?: number;
    issueKey?: string;
  };
}

export type KnowledgeGapType = 'Missing Documentation' | 'Stale Knowledge' | 'Missing Context' | 'Undocumented Module' | 'Undocumented Process' | 'Knowledge Concentration';
export type GapImpact = 'High' | 'Medium' | 'Low';

export interface KnowledgeGap {
  id: string;
  projectId: string;
  title: string;
  type: KnowledgeGapType;
  impact: GapImpact;
  module?: string;
  reason: string;
  suggestedAction: string;
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  sources: KnowledgeSource[];
}

export interface Documentation {
  id: string;
  projectId: string;
  title: string;
  lastGeneratedAt: string;
  lastUpdatedAt: string;
  freshness: KnowledgeFreshness;
  sections: DocumentationSection[];
}

export interface PromptHistory {
  id: string;
  projectId: string;
  tool: string;
  timestamp: string;
  promptSummary: string;
  relatedModule?: string;
}

export interface Integration {
  id: string;
  name: 'GitHub' | 'Jira';
  status: 'Connected' | 'Disconnected' | 'Error';
  lastSyncedAt?: string;
  recordsProcessed?: number;
  details?: string;
}

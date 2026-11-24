export type SyncStatus = 'No repositories' | 'Queued' | 'Partially synced' | 'Pending' | 'Syncing' | 'Synced' | 'Failed'
export type ProjectRole = 'owner' | 'contributor' | 'viewer'
export type Freshness = 'Fresh' | 'Stale' | 'Outdated'
export type ChangeFreshness = 'CURRENT' | 'POTENTIALLY_STALE' | 'OUTDATED' | 'UNKNOWN'

export interface User {
  id: number
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  expiresAt: string
  user: User
}

export interface SignupInput {
  name: string
  email: string
  password: string
}

export type OrgRole = 'owner' | 'admin' | 'member'
export type OrgType = 'PERSONAL' | 'TEAM'

export interface OrgSummary {
  id: number
  name: string
  type: OrgType
  role: OrgRole
  memberCount: number
  projectCount: number
  githubConnected: boolean
  /** Only present for owners/admins of team organizations. */
  inviteCode: string | null
  createdAt: string
}

export interface OrgMember {
  userId: number
  name: string
  email: string
  role: OrgRole
  joinedAt: string
}

export interface OrgDetail {
  organization: OrgSummary
  members: OrgMember[]
}

export interface ProjectSummary {
  id: number
  orgId: number
  orgName: string
  orgType: OrgType
  name: string
  description: string | null
  role: ProjectRole
  repositoryCount: number
  memberCount: number
  knowledgeItemCount: number
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Repository {
  id: number
  provider: string
  url: string
  owner: string
  name: string
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  lastSyncMessage: string | null
  addedAt: string
}

export interface Member {
  userId: number
  name: string
  email: string
  role: ProjectRole
  addedAt: string
}

export interface ProjectDetail {
  project: ProjectSummary
  repositories: Repository[]
  members: Member[]
}

export interface CreateProjectInput {
  orgId: number
  name: string
  description?: string
  repositoryUrls: string[]
  contributorIds: number[]
}

export interface Evidence {
  id: number
  type: string
  reference: string
  url: string | null
  excerpt: string | null
}

export interface KnowledgeItem {
  id: number
  projectId: number
  title: string
  type: string
  summary: string
  details: string | null
  module: string | null
  confidence: number | null
  freshness: Freshness
  changeFreshness?: ChangeFreshness
  repositoryUrl: string | null
  createdAt: string
  updatedAt: string
  sources: Evidence[]
}

export interface Activity {
  id: number
  projectId: number
  projectName: string
  type: string
  title: string
  actor: string | null
  repositoryUrl: string | null
  sourceRef: string | null
  url: string | null
  occurredAt: string
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface Dashboard {
  projectCount: number
  repositoryCount: number
  knowledgeItemCount: number
  contributorCount: number
  syncedProjects: number
  failedProjects: number
  pendingProjects: number
  health: { fresh: number; stale: number; outdated: number }
  knowledgeByType: { type: string; count: number }[]
  attention: AttentionItem[]
  recentKnowledge: RecentKnowledge[]
  recentActivity: Activity[]
  recentProjects: ProjectSummary[]
  organizations: OrgSummary[]
}

export type AttentionKind = 'SYNC_FAILED' | 'OUTDATED_KNOWLEDGE' | 'STALE_KNOWLEDGE' | 'NEVER_SYNCED' | 'NO_REPOSITORIES'

export interface AttentionItem {
  kind: AttentionKind
  projectId: number
  projectName: string
  message: string
  count: number
}

export interface RecentKnowledge {
  id: number
  projectId: number
  projectName: string
  title: string
  knowledgeType: string
  updatedAt: string
}

export interface AppNotification {
  projectId?: number | null
  id: number
  title: string
  description: string
  isRead: boolean
  createdAt: string
}

export interface Meta {
  githubAppConfigured: boolean
  version: string
}

export interface GithubStatus {
  configured: boolean
  connected: boolean
  canManage: boolean
  installUrl: string | null
  authorizationUrl: string | null
}

export interface GithubRepoOption {
  id: number
  fullName: string
  url: string
  isPrivate: boolean
  description: string | null
}

/** The extraction service's full report (field names are the Python pipeline's, snake_case). */
export interface ExtractionReport {
  jira_context?: { issue_key: string; summary: string; status: string; description: string; acceptance_criteria: string; comments: string; source_url: string; source_updated_at: string }[]
  project_name?: string
  problem_statement?: string
  tech_stack?: string[]
  architecture_mermaid_chart?: string
  architecture_explanation?: string
  sequence_explanation?: string
  technical_diagrams?: { title: string; kind: 'flowchart' | 'sequence'; mermaid: string; explanation: string; evidence_ids: string[] }[]
  milestone_timeline_mermaid_chart?: string
  analytics_metrics?: {
    estimated_complexity?: string
    core_module_count?: number
    key_patterns_used?: string[]
    data_flow_complexity?: string
    security_posture?: string
  }
  presentation_deck?: {
    executive_pitch?: string
    business_value?: string
    technical_challenges?: string
    future_scope?: string
    target_audience?: string
    roi_summary?: string
  }
  developer_handover_guide?: {
    local_setup_prerequisites?: string
    directory_tour?: { folder_path: string; architectural_role: string }[]
    critical_workflows?: { workflow_name: string; entry_point: string; execution_path: string }[]
    directory_dependency_chart?: string
    execution_sequence_chart?: string
    testing_instructions?: string
    cicd_instructions?: string
    technical_debt_and_fragility?: string[]
  }
  verification_report?: {
    overall_trust_score?: number
    verdict?: string
    evidence_precision_score?: number
    subsystem_recall_coverage?: number
    hallucination_rate?: number
    verified_claims_count?: number
    unsupported_claims_count?: number
    audit_findings?: string[]
    verification_agent_notes?: string
    ml_audit?: { ml_models_detected?: boolean; detected_frameworks?: string[]; notes?: string }
  } | null
  knowledge_items?: { title: string; knowledge_type: string; summary: string; details: string; module?: string; business_impact?: string; confidence?: number; evidence_ids?: string[] }[]
  inspected_files?: string[]
}

export interface RepositoryReport {
  repositoryId: number
  owner: string
  name: string
  url: string
  generatedAt: string
  files: string[]
  report: ExtractionReport
}

export interface FreshnessOverview {
  projectId: number
  currentCount: number
  potentiallyStaleCount: number
  outdatedCount: number
  unknownCount: number
  totalCount: number
  lastSyncAt: string | null
  lastSnapshotCommit: string | null
}

export interface AffectedKnowledge {
  knowledgeId: number
  title: string
  module: string | null
  changeStatus: ChangeFreshness
  ageStatus: Freshness
  lastVerifiedCommit: string | null
  affectedCommit: string | null
  changedFiles: string[]
  reason: string | null
  detectedAt: string
}

export interface ChangeHistoryItem {
  id: number
  commitSha: string
  changeType: string
  filePath: string
  author: string | null
  commitMessage: string | null
  detectedAt: string
}

export interface KnowledgeFreshnessDetail {
  knowledgeId: number
  title: string
  module: string | null
  changeStatus: ChangeFreshness
  ageStatus: Freshness
  lastVerifiedCommit: string | null
  affectedCommit: string | null
  changedFiles: string[]
  reason: string | null
  detectedAt: string
  lastVerifiedAt: string
  revalidationStatus: string
  history: ChangeHistoryItem[]
}

export interface Citation {
  index: number
  knowledgeId: number
  title: string
  module: string | null
  repositoryName: string | null
  sourceFile: string | null
  evidenceType: string | null
  excerpt: string | null
  commitSha: string | null
  url: string | null
  changeStatus: string | null
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
  freshnessWarning?: string | null
  createdAt: string
}

export interface ChatConversation {
  id: number
  title: string
  createdAt: string
  updatedAt: string
  lastMessage: string
  messageCount: number
}

export interface ChatResponse {
  conversationId: number
  message: string
  citations: Citation[]
  freshnessWarning?: string | null
}

export interface ExtractionSyncStatus {
  id: number | null
  projectId: number
  repositoryId: number | null
  repositoryName: string | null
  status: 'IDLE' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  progress: number
  stage: string | null
  statusMessage: string | null
  logs: string | null
  startedAt: string | null
  completedAt: string | null
  durationSeconds: number | null
  itemsExtracted: number | null
  trustScore: number | null
  errorMessage: string | null
  active: boolean
}

export interface SyncHistoryItem {
  id: number
  repositoryId: number | null
  repositoryName: string | null
  status: string
  progress: number
  statusMessage: string | null
  startedAt: string
  completedAt: string | null
  durationSeconds: number | null
  itemsExtracted: number | null
  trustScore: number | null
  errorMessage: string | null
}

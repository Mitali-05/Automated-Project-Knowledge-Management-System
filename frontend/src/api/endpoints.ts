import { downloadFile, http } from './client'
import type {
  Activity, AppNotification, AuthResponse, CreateProjectInput, Dashboard, GithubRepoOption,
  GithubStatus, KnowledgeItem, Member, Meta, OrgDetail, OrgMember, OrgSummary, Page, ProjectDetail,
  ProjectSummary, Repository, RepositoryReport, SignupInput, User,
} from './types'

export const authApi = {
  signup: (input: SignupInput) => http.post<AuthResponse>('/api/auth/signup', input),
  login: (email: string, password: string) =>
    http.post<AuthResponse>('/api/auth/login', { email, password }),
  me: () => http.get<User>('/api/auth/me'),
}

export const userApi = {
  updateProfile: (name: string) => http.put<User>('/api/users/me', { name }),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.put<void>('/api/users/me/password', { currentPassword, newPassword }),
}

export const orgApi = {
  list: () => http.get<OrgSummary[]>('/api/orgs'),
  get: (id: number) => http.get<OrgDetail>(`/api/orgs/${id}`),
  create: (name: string) => http.post<OrgSummary>('/api/orgs', { name }),
  join: (inviteCode: string) => http.post<OrgSummary>('/api/orgs/join', { inviteCode }),
  rename: (id: number, name: string) => http.patch<OrgSummary>(`/api/orgs/${id}`, { name }),
  remove: (id: number) => http.delete(`/api/orgs/${id}`),
  rotateInviteCode: (id: number) => http.post<OrgSummary>(`/api/orgs/${id}/invite-code/rotate`),
  setRole: (id: number, userId: number, role: 'admin' | 'member') =>
    http.put<OrgMember>(`/api/orgs/${id}/members/${userId}/role`, { role }),
  removeMember: (id: number, userId: number) => http.delete(`/api/orgs/${id}/members/${userId}`),
  leave: (id: number) => http.post<void>(`/api/orgs/${id}/leave`),
}

export const projectApi = {
  list: () => http.get<ProjectSummary[]>('/api/projects'),
  get: (id: number) => http.get<ProjectDetail>(`/api/projects/${id}`),
  create: (input: CreateProjectInput) => http.post<ProjectDetail>('/api/projects', input),
  update: (id: number, name: string, description: string) =>
    http.put<ProjectDetail>(`/api/projects/${id}`, { name, description }),
  remove: (id: number) => http.delete(`/api/projects/${id}`),
  addRepository: (id: number, url: string) =>
    http.post<Repository>(`/api/projects/${id}/repositories`, { url }),
  removeRepository: (id: number, repoId: number) =>
    http.delete(`/api/projects/${id}/repositories/${repoId}`),
  sync: (id: number) => http.post<{ queued: number }>(`/api/projects/${id}/sync`),
  addMember: (id: number, userId: number) =>
    http.post<Member>(`/api/projects/${id}/members`, { userId }),
  removeMember: (id: number, userId: number) =>
    http.delete(`/api/projects/${id}/members/${userId}`),
}

export const knowledgeApi = {
  list: (projectId: number) => http.get<KnowledgeItem[]>(`/api/projects/${projectId}/knowledge`),
}

export const activityApi = {
  list: (projectId: number, page: number, size = 20) =>
    http.get<Page<Activity>>(`/api/projects/${projectId}/activity?page=${page}&size=${size}`),
}

export const reportApi = {
  list: (projectId: number) => http.get<RepositoryReport[]>(`/api/projects/${projectId}/reports`),
  download: (projectId: number, repositoryId: number, kind: 'pdf' | 'pptx', filename: string) =>
    downloadFile(`/api/projects/${projectId}/reports/${repositoryId}/download/${kind}`, filename),
}

export const dashboardApi = {
  get: (orgId?: number) => http.get<Dashboard>(orgId ? `/api/dashboard?orgId=${orgId}` : '/api/dashboard'),
}

export const notificationApi = {
  list: () => http.get<AppNotification[]>('/api/notifications'),
  unreadCount: () => http.get<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: number) => http.put<void>(`/api/notifications/${id}/read`),
  markAllRead: () => http.put<void>('/api/notifications/read-all'),
}

export const githubApi = {
  status: (orgId: number) => http.get<GithubStatus>(`/api/integrations/github/status?orgId=${orgId}`),
  complete: (installationId: string, state: string, code?: string) =>
    http.post<{ orgId: number }>('/api/integrations/github/callback', { installationId, state, code }),
  repositories: (orgId: number) =>
    http.get<GithubRepoOption[]>(`/api/integrations/github/repositories?orgId=${orgId}`),
}

export const metaApi = {
  get: () => http.get<Meta>('/api/meta'),
}

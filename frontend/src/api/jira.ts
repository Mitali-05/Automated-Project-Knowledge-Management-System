import { http } from './client'

export interface JiraSite { id: string; name: string; url: string }
export interface JiraProject { id: string; key: string; name: string }
export interface JiraStatus {
  configured: boolean
  authorized: boolean
  connected: boolean
  canManage: boolean
  siteUrl: string | null
  projectKey: string | null
  projectName: string | null
  sites: JiraSite[]
}
export interface JiraProjectPage { values: JiraProject[]; isLast: boolean; nextStartAt: number }

const base = '/api/integrations/jira'
export const jiraApi = {
  status: (projectId: number) => http.get<JiraStatus>(`${base}/status?projectId=${projectId}`),
  authorize: (projectId: number) => http.post<{ url: string }>(`${base}/authorize`, { projectId }),
  complete: (code: string, state: string) => http.post<{ projectId: number }>(`${base}/callback`, { code, state }, 90_000),
  projects: (projectId: number, cloudId: string, startAt: number) => http.get<JiraProjectPage>(
    `${base}/projects?projectId=${projectId}&cloudId=${encodeURIComponent(cloudId)}&startAt=${startAt}`, 90_000),
  select: (projectId: number, cloudId: string, jiraProjectId: string) => http.post<{ connected: boolean }>(
    `${base}/selection`, { projectId, cloudId, jiraProjectId }, 90_000),
  disconnect: (projectId: number) => http.delete<{ disconnected: boolean }>(`${base}/connection?projectId=${projectId}`),
}

export interface JiraIssueSnapshot {
 connection: { sync_status: string; synced_at: string | null; sync_error: string | null } | null
 issues: {issue_key:string;summary:string;status:string;issue_type:string;priority:string;description:string;acceptance_criteria:string;comments:string;source_url:string;source_updated_at:string}[]
 reports: {status:string;error:string|null;repo_name:string}[]
}
export const jiraSyncApi = {
 state: (projectId:number) => http.get<JiraIssueSnapshot>(`${base}/issues?projectId=${projectId}`),
 sync: (projectId:number) => http.post<{queued:boolean}>(`${base}/sync`, {projectId}),
}

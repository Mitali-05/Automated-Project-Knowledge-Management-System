import type { Dashboard } from '../api/types'

export interface GettingStartedStep {
  label: string
  done: boolean
  to: string
  cta: string
}

/** Onboarding checklist for the dashboard; the dashboard hides it once every step is done. */
export function gettingStartedSteps(d: Dashboard): GettingStartedStep[] {
  return [
    { label: 'Create or join an organization', done: d.organizations.some((o) => o.type === 'TEAM'), to: '/app/organizations?new=1', cta: 'Set up' },
    { label: 'Create your first project', done: d.projectCount > 0, to: '/app/projects/new', cta: 'Create' },
    { label: 'Link a GitHub repository', done: d.repositoryCount > 0, to: '/app/projects', cta: 'Open projects' },
    { label: 'Extract knowledge from it', done: d.knowledgeItemCount > 0, to: '/app/projects', cta: 'Open projects' },
  ]
}

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
    { label: 'Create your first project', done: d.projectCount > 0, to: '/app/projects/new', cta: 'Create' },
    { label: 'Link a GitHub repository', done: d.repositoryCount > 0, to: '/app/projects', cta: 'Open projects' },
    { label: 'Complete your first sync', done: d.syncedProjects > 0 || d.knowledgeItemCount > 0, to: '/app/projects', cta: 'Open projects' },
  ]
}

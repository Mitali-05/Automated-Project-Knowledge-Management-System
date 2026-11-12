import { useOutletContext } from 'react-router-dom'
import type { ProjectContext } from '../pages/project/ProjectLayout'

export function useProject(): ProjectContext {
  return useOutletContext<ProjectContext>()
}

import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import AboutPage from './pages/AboutPage'
import DocsPage from './pages/DocsPage'
import FeaturesPage from './pages/FeaturesPage'
import HowItWorksPage from './pages/HowItWorksPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import WelcomePage from './pages/WelcomePage'
import CreateProjectPage from './pages/app/CreateProjectPage'
import GithubCallbackPage from './pages/app/GithubCallbackPage'
import JiraCallbackPage from './pages/app/JiraCallbackPage'
import HelpPage from './pages/app/HelpPage'
import OrganizationDetailPage from './pages/app/OrganizationDetailPage'
import OrganizationsPage from './pages/app/OrganizationsPage'
import ProjectsPage from './pages/app/ProjectsPage'
import SettingsPage from './pages/app/SettingsPage'
import ComingSoonTab from './pages/project/ComingSoonTab'
import HistoryTab from './pages/project/HistoryTab'
import KnowledgeTab from './pages/project/KnowledgeTab'
import OverviewTab from './pages/project/OverviewTab'
import ProjectLayout from './pages/project/ProjectLayout'
import SettingsTab from './pages/project/SettingsTab'
import { PageContainer } from './components/layout/PageContainer'
import { LoadingState } from './components/ui/States'

const DashboardPage = lazy(() => import('./pages/app/DashboardPage'))
const AssistantTab = lazy(() => import('./pages/project/assistant/AssistantTab'))
const JiraTab = lazy(() => import('./pages/project/JiraTab'))
const ReportTab = lazy(() => import('./pages/project/ReportTab'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="welcome" element={<WelcomePage />} />
        <Route path="app" element={<AppShell />}>
          <Route index element={<Suspense fallback={<PageContainer><LoadingState label="Loading workspace dashboard…" /></PageContainer>}><DashboardPage /></Suspense>} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<CreateProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<OverviewTab />} />
            <Route path="knowledge" element={<KnowledgeTab />} />
            <Route path="report" element={<ReportTab />} />
            <Route path="history" element={<HistoryTab />} />
            <Route path="assistant" element={<AssistantTab />} />
            <Route path="jira" element={<JiraTab />} />
            <Route path="prompts" element={<ComingSoonTab title="Prompts" description="Ingested AI-tool usage history and summaries are planned for a later phase." />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
          <Route path="github/callback" element={<GithubCallbackPage />} />
          <Route path="jira/callback" element={<JiraCallbackPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="organizations/:orgId" element={<OrganizationDetailPage />} />
          <Route path="organization" element={<Navigate to="/app/organizations" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

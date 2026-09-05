import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { LandingPage } = await import('../../pages/LandingPage');
      return { Component: LandingPage };
    }
  },
  {
    path: '/login',
    lazy: async () => {
      const { LoginPage } = await import('../../pages/LoginPage');
      return { Component: LoginPage };
    }
  },
  {
    path: '/register',
    lazy: async () => {
      const { RegisterPage } = await import('../../pages/RegisterPage');
      return { Component: RegisterPage };
    }
  },
  {
    path: '/features',
    lazy: async () => {
      const { FeaturesPage } = await import('../../pages/FeaturesPage');
      return { Component: FeaturesPage };
    }
  },
  {
    path: '/how-it-works',
    lazy: async () => {
      const { HowItWorksPage } = await import('../../pages/HowItWorksPage');
      return { Component: HowItWorksPage };
    }
  },
  {
    path: '/about',
    lazy: async () => {
      const { AboutPage } = await import('../../pages/AboutPage');
      return { Component: AboutPage };
    }
  },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      {
        path: '',
        element: <Navigate to="/app/overview" replace />
      },
      {
        path: 'overview',
        lazy: async () => {
          const { OverviewPage } = await import('../../pages/app/OverviewPage');
          return { Component: OverviewPage };
        }
      },
      {
        path: 'oauth/github/callback',
        lazy: async () => {
          const { GithubCallbackPage } = await import('../../pages/app/GithubCallbackPage');
          return { Component: GithubCallbackPage };
        }
      },
      {
        path: 'projects',
        lazy: async () => {
          const { ProjectsPage } = await import('../../pages/app/ProjectsPage');
          return { Component: ProjectsPage };
        }
      },
      {
        path: 'projects/new',
        lazy: async () => {
          const { CreateProjectPage } = await import('../../pages/app/CreateProjectPage');
          return { Component: CreateProjectPage };
        }
      },
      {
        path: 'projects/:id',
        lazy: async () => {
          const { ProjectLayout } = await import('../../pages/app/project/ProjectLayout');
          return { Component: ProjectLayout };
        },
        children: [
          {
            path: '',
            element: <Navigate to="overview" replace />
          },
          {
            path: 'overview',
            lazy: async () => {
              const { ProjectOverviewTab } = await import('../../pages/app/project/ProjectOverviewTab');
              return { Component: ProjectOverviewTab };
            }
          },
          {
            path: 'knowledge',
            lazy: async () => {
              const { ProjectKnowledgeTab } = await import('../../pages/app/project/ProjectKnowledgeTab');
              return { Component: ProjectKnowledgeTab };
            }
          },
          {
            path: 'history',
            lazy: async () => {
              const { ProjectHistoryTab } = await import('../../pages/app/project/ProjectHistoryTab');
              return { Component: ProjectHistoryTab };
            }
          },

        ]
      },
      {
        path: 'help',
        lazy: async () => {
          const { HelpPage } = await import('../../pages/app/HelpPage');
          return { Component: HelpPage };
        }
      },
      {
        path: 'settings',
        lazy: async () => {
          const { SettingsPage } = await import('../../pages/app/SettingsPage');
          return { Component: SettingsPage };
        }
      }
    ]
  }
]);

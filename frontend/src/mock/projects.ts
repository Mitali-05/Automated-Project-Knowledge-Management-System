import type { Project, Contributor } from '../types';

export const mockContributors: Contributor[] = [
  { id: 'c-1', userId: 'u-1', name: 'Rahul Verma', contributions: 152, avatarUrl: 'https://i.pravatar.cc/150?u=rahul' },
  { id: 'c-2', userId: 'u-2', name: 'Sneha Iyer', contributions: 97, avatarUrl: 'https://i.pravatar.cc/150?u=sneha' },
  { id: 'c-3', userId: 'u-3', name: 'Aman Khan', contributions: 63, avatarUrl: 'https://i.pravatar.cc/150?u=aman' },
  { id: 'c-4', userId: 'u-4', name: 'Vikram Singh', contributions: 48, avatarUrl: 'https://i.pravatar.cc/150?u=vikram' },
];

export const mockProjects: Project[] = [
  {
    id: 'p-1',
    name: 'Payment Service',
    description: 'Handles all payment-related operations and workflows.',
    organizationId: 'org-1',
    repositories: [
      { id: 'r-1', owner: 'acme', name: 'payment-service', url: 'https://github.com/acme/payment-service', connectionMethod: 'OAuth' },
      { id: 'r-2', owner: 'acme', name: 'payment-gateway-sdk', url: 'https://github.com/acme/payment-gateway-sdk', connectionMethod: 'OAuth' },
      { id: 'r-3', owner: 'acme', name: 'payment-ui-components', url: 'https://github.com/acme/payment-ui-components', connectionMethod: 'OAuth' }
    ],
    jiraProject: { id: 'j-1', name: 'Payments', key: 'PAY' },
    contributors: mockContributors,
    syncStatus: 'Syncing',
    lastSyncedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    knowledgeItemCount: 247
  },
  {
    id: 'p-2',
    name: 'Customer Portal',
    description: 'Main web interface for enterprise customers.',
    organizationId: 'org-1',
    repositories: [
      { id: 'r-4', owner: 'acme', name: 'customer-portal-ui', url: 'https://github.com/acme/customer-portal-ui', connectionMethod: 'OAuth' }
    ],
    contributors: mockContributors.slice(0, 2),
    syncStatus: 'Synced',
    lastSyncedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    knowledgeItemCount: 128
  },
  {
    id: 'p-3',
    name: 'Inventory Platform',
    description: 'Core inventory tracking and fulfillment engine.',
    organizationId: 'org-1',
    repositories: [
      { id: 'r-5', owner: 'acme', name: 'inventory-backend', url: 'https://github.com/acme/inventory-backend', connectionMethod: 'OAuth' }
    ],
    jiraProject: { id: 'j-2', name: 'Inventory', key: 'INV' },
    contributors: mockContributors.slice(1, 4),
    syncStatus: 'Synced',
    lastSyncedAt: new Date(Date.now() - 120 * 60000).toISOString(),
    knowledgeItemCount: 312
  },
  {
    id: 'p-4',
    name: 'Internal Dev Platform',
    description: 'Developer tools, CI/CD templates, and shared libraries.',
    organizationId: 'org-1',
    repositories: [
      { id: 'r-6', owner: 'acme', name: 'idp-cli', url: 'https://github.com/acme/idp-cli', connectionMethod: 'OAuth' }
    ],
    contributors: [mockContributors[0], mockContributors[3]],
    syncStatus: 'Pending',
    knowledgeItemCount: 45
  }
];

import type { User, Organization } from '../types';

export const mockUser: User = {
  id: 'u-1',
  name: 'Aditya Sharma',
  email: 'aditya@acme.com',
  role: 'Organization Admin',
  avatarUrl: 'https://i.pravatar.cc/150?u=aditya',
};

export const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Acme Technologies',
};

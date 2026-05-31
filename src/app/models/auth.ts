export type SystemRole = 'ADMIN' | 'STANDARD';
export type ResourceAccessLevel = 'MANAGER' | 'VIEWER';
export type IdentityProvider = 'PASSWORD' | 'GOOGLE';

export function userRoleLabel(systemRole: SystemRole | null | undefined): string {
  return systemRole === 'ADMIN' ? 'Admin' : 'Regular user';
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  systemRole: SystemRole;
  mustChangePassword: boolean;
  linkedProviders: IdentityProvider[];
  personalProjectId: number | null;
  createdAt: string;
}

export interface CsrfResponse {
  headerName: string;
  parameterName: string;
  token: string;
}

export interface UserSummary {
  id: string;
  email: string;
  username: string;
  systemRole: SystemRole;
  active: boolean;
  mustChangePassword: boolean;
  linkedProviders: IdentityProvider[];
  personalProjectId: number | null;
  createdAt: string;
}

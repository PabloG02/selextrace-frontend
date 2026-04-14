export type SystemRole = 'PLATFORM_ADMIN' | 'EXPERIMENT_MANAGER' | 'EXPERIMENT_VIEWER';
export type ResourceAccessLevel = 'MANAGER' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  mustChangePassword: boolean;
  personalProjectId: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface CsrfResponse {
  headerName: string;
  parameterName: string;
  token: string;
}

export interface ResourcePermissions {
  canManage: boolean;
  canShare: boolean;
  canDelete: boolean;
}

export interface ProjectReference {
  id: string;
  name: string;
  personalProject: boolean;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  active: boolean;
  mustChangePassword: boolean;
  personalProjectId: string | null;
  createdAt: string;
}

import { ProjectReference, ResourceAccessLevel, ResourcePermissions } from './auth';

export interface ProjectSummary extends ProjectReference {
  description: string | null;
  createdAt: string;
  accessLevel: ResourceAccessLevel;
  permissions: ResourcePermissions;
}

export interface ProjectMembership {
  userId: string;
  email: string;
  displayName: string;
  accessLevel: ResourceAccessLevel;
}

export interface ProjectDetail extends ProjectSummary {
  memberships: ProjectMembership[];
}

export interface ExperimentAccessGrant {
  userId: string;
  email: string;
  displayName: string;
  accessLevel: ResourceAccessLevel;
}

import { ResourceAccessLevel } from './auth';

export interface ProjectReference {
  id: number;
  name: string;
}

export interface ProjectSummary extends ProjectReference {
  description: string | null;
  createdAt: string;
  accessLevel: ResourceAccessLevel;
}

export interface ProjectMembership {
  userId: string;
  email: string;
  username: string;
  accessLevel: ResourceAccessLevel;
}

export interface ProjectDetail extends ProjectSummary {
  memberships: ProjectMembership[];
}

export interface ExperimentAccessGrant {
  userId: string;
  email: string;
  username: string;
  accessLevel: ResourceAccessLevel;
}

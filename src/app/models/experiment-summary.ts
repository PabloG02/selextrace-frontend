import { ProjectReference, ResourcePermissions } from './auth';
import {ExperimentStatus} from './experiment';

export interface ExperimentSummary {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  createdAt: string;
  project: ProjectReference | null;
  permissions: ResourcePermissions;
}

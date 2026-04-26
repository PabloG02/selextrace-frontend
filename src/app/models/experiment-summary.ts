import { ResourceAccessLevel } from './auth';
import { ProjectReference } from './project';
import {ExperimentStatus} from './experiment';

export interface ExperimentSummary {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  createdAt: string;
  project: ProjectReference | null;
  accessLevel: ResourceAccessLevel;
}

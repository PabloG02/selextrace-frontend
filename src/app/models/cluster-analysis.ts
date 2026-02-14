import {AptaClusterConfiguration} from './aptacluster-configuration';

export interface ClusterAnalysis {
  id: string;
  experimentId: string;
  requestConfig: AptaClusterConfiguration;
  aptamerToCluster: Record<number, number>;
  durationMs: number;
  createdAt?: string;
}

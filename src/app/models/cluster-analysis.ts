import {AptaClusterConfiguration} from './aptacluster-configuration';

export interface ClusterAnalysis {
  id: number;
  experimentId: number;
  requestConfig: AptaClusterConfiguration;
  aptamerToCluster: Record<number, number>;
  durationMs: number;
  createdAt: string;
}

import { FsbcConfiguration } from './fsbc-configuration';

export interface FsbcAnalysis {
  id: string;
  experimentId: string;
  requestConfig: FsbcConfiguration;
  aptamerToCluster: Record<number, number>;
  rankedStrings: FsbcStringResult[];
  clusterSeeds: FsbcClusterSeed[];
  totalSequenceCount: number;
  uniqueSequenceCount: number;
  clusterCount: number;
  stringCount: number;
  durationMs: number;
  createdAt?: string;
}

export interface FsbcStringResult {
  rank: number;
  subsequence: string;
  length: number;
  observedCount: number;
  expectedFraction: number;
  zScore: number;
  normalizedZScore: number;
}

export interface FsbcClusterSeed {
  clusterId: number;
  seedString: string;
  memberCount: number;
  totalCount: number;
}

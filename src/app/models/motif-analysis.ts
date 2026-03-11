import {AptaTraceConfiguration} from './aptatrace-configuration';

export interface MotifAnalysis {
  id: string;
  experimentId: string;
  requestConfig: AptaTraceConfiguration;
  roundNames: string[];
  profiles: MotifAnalysisProfile[];
  significantKmerCount: number;
  motifCount: number;
  lastRoundCount: number;
  durationMs: number;
  createdAt: string;
}

export interface MotifAnalysisProfile {
  seed: string;
  consensus: string;
  seedPValue: number;
  seedProportion: number;
  motifProportion: number;
  selectionContext: number;
  kmers: string[];
  kmerAlignment: Record<string, string>;
  aptamerIds: number[];
  memberAptamers: MotifClusterMember[];
  pwm: number[][];
  contextTrace: number[][];
}

export interface MotifClusterMember {
  aptamerId: number;
  lastRoundCount: number;
  lastRoundProportion: number;
}

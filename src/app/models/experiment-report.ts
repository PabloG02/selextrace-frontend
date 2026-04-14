import { ProjectReference, ResourcePermissions } from './auth';

export interface ExperimentReport {
  id: string;
  createdAt: string;
  name: string;
  description: string;
  createdByUserId: string;
  project: ProjectReference | null;
  permissions: ResourcePermissions;
  sequencing: ExperimentSequencing;
  importStats: ExperimentImportStats;
  selectionCycles: SelectionCycleResponse[];
  pool: ExperimentPool;
  technicalDetails: ExperimentTechnicalDetails;
}

export interface ExperimentSequencing {
  aptamerSize: number;
  fivePrimePrimer: string;
  threePrimePrimer: string;
}

export interface ExperimentImportStats {
  totalProcessedReads: number;
  totalAcceptedReads: number;
  contigAssemblyFailure: number;
  invalidAlphabet: number;
  fivePrimeError: number;
  threePrimeError: number;
  invalidCycle: number;
  totalPrimerOverlaps: number;
}

export interface SelectionCycleResponse {
  name: string;
  round: number;
  isControlSelection: boolean;
  isCounterSelection: boolean;
  barcode5Prime: string | null;
  barcode3Prime: string | null;
  totalSize: number;
  uniqueSize: number;
  counts: Record<number, number>;
}

export interface ExperimentPool {
  idToAptamer: Record<number, string>;
  idToBounds: Record<number, AptamerBounds>;
}

export interface ExperimentTechnicalDetails {
  metadata: Metadata;
}

export interface Metadata {
  qualityScoresForward: Record<string, Record<number, Accumulator>>;
  qualityScoresReverse: Record<string, Record<number, Accumulator>>;

  nucleotideDistributionForward: Record<string, Record<number, Record<number, number>>>;
  nucleotideDistributionReverse: Record<string, Record<number, Record<number, number>>>;

  nucleotideDistributionAccepted: Record<string, Record<number, Record<number, Record<number, number>>>>;
}

interface Accumulator {
  count: number;
  mean: number;
  stddev: number;
  variance: number;
}

/**
 * Represents the start index (inclusive) and
 * end index (exclusive) of the randomized region of an aptamer
 */
export interface AptamerBounds {
  startIndex: number;
  endIndex: number;
}

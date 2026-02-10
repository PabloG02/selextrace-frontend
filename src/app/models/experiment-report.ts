export interface ExperimentReport {
  experimentDetails: {
    generalInformation: {
      aptamerSize: number;
      description: string;
      fivePrimePrimer: string;
      name: string;
      threePrimePrimer: string;
    };
    selectionCyclePercentages: Record<string, number>; // e.g., { r14: 100.0 }
    sequenceImportStatistics: {
      contigAssemblyFailure: number;
      fivePrimeError: number;
      invalidAlphabet: number;
      invalidCycle: number;
      threePrimeError: number;
      totalAcceptedReads: number;
      totalPrimerOverlaps: number;
      totalProcessedReads: number;
    };
  };
  // Testing purposes
  selectionCycleResponse: SelectionCycleResponse[];
  metadata: {
    qualityScoresForward: Record<string, Record<number, Accumulator>>;
    qualityScoresReverse: Record<string, Record<number, Accumulator>>;

    nucleotideDistributionForward: Record<string, Record<number, Record<number, number>>>;
    nucleotideDistributionReverse: Record<string, Record<number, Record<number, number>>>;

    nucleotideDistributionAccepted: Record<string, Record<number, Record<number, Record<number, number>>>>;
  },
  idToAptamer: Record<number, string>,
  idToBounds: Record<number, AptamerBounds>;
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

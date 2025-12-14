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
  randomizedRegionSizeDistribution: {
    total: number;
    data: Record<string, number>; // e.g., { "40": 27760 }
  };
  selectionCycleComposition: {
    singletonCount: number;
    positiveSelectionCycles: {
      singletonFrequency: number;
      enrichedFrequency: number;
      uniqueFraction: number;
    };
    negativeSelectionCycles: {
      singletonFrequency: number;
      enrichedFrequency: number;
      uniqueFraction: number;
    } | null;
    controlSelectionCycles: {
      singletonFrequency: number;
      enrichedFrequency: number;
      uniqueFraction: number;
    } | null;
  };
  // Testing purposes
  selectionCycleResponse: {
    name: string;
    round: number;
    isControlSelection: boolean;
    isCounterSelection: boolean;
    barcode5Prime: string | null;
    barcode3Prime: string | null;
    totalSize: number;
    uniqueSize: number;
    counts: Record<number, number>;
  },
  metadata: {
    qualityScoresForward: Record<string, Record<number, Accumulator>>;
    qualityScoresReverse: Record<string, Record<number, Accumulator>>;

    nucleotideDistributionForward: Record<string, Record<number, Record<number, number>>>;
    nucleotideDistributionReverse: Record<string, Record<number, Record<number, number>>>;

    nucleotideDistributionAccepted: Record<string, Record<number, Record<number, Record<number, number>>>>;
  },
  idToAptamer: Record<number, string>,
}

interface Accumulator {
  count: number;
  mean: number;
  stddev: number;
  variance: number;
}

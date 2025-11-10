import {FileFormat, ReadType} from './experiment';

export interface CreateExperimentDto {
  name: string;
  description: string;
  sequencing: ExperimentSequencing;
  selectionCycles: SelectionCycle[];
}

export interface ExperimentSequencing {
  isDemultiplexed: boolean;
  readType: ReadType;
  fileFormat: FileFormat;
  primers: {
    fivePrime: string;
    threePrime?: string;
  };
  randomizedRegion: ExactLengthRandomizedRegion | RangeRandomizedRegion;
}

export interface ExactLengthRandomizedRegion {
  type: 'exact';
  exactLength: number;
}

export interface RangeRandomizedRegion {
  type: 'range';
  min: number;
  max: number;
}

export interface SelectionCycle {
  roundNumber: number;
  roundName: string;
  isControl: boolean;
  isCounterSelection: boolean;
  files: SelectionCycleFiles;
}

export interface SelectionCycleFiles {
  forward: File;
  reverse?: File;
}

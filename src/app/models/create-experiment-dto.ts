import { z } from 'zod';
import {
  CreateExperimentDtoSchema,
  ExperimentSequencingSchema,
  ExactLengthRandomizedRegionSchema,
  RangeRandomizedRegionSchema,
  SelectionCycleSchema,
  SelectionCycleFilesSchema,
} from './experiment-creation.schema';

export type CreateExperimentDto = z.infer<typeof CreateExperimentDtoSchema>;
export type ExperimentSequencing = z.infer<typeof ExperimentSequencingSchema>;
export type ExactLengthRandomizedRegion = z.infer<typeof ExactLengthRandomizedRegionSchema>;
export type RangeRandomizedRegion = z.infer<typeof RangeRandomizedRegionSchema>;
export type SelectionCycle = z.infer<typeof SelectionCycleSchema>;
export type SelectionCycleFiles = z.infer<typeof SelectionCycleFilesSchema>;

import { z } from 'zod';

/* Randomized Region */

export const ExactLengthRandomizedRegionSchema = z.object({
  type: z.literal('exact'),
  exactLength: z.number(),
});

export const RangeRandomizedRegionSchema = z.object({
  type: z.literal('range'),
  min: z.number(),
  max: z.number(),
});

/* Sequencing */

export const ReadTypeSchema = z.enum(['single-end', 'paired-end']);
export const FileFormatSchema = z.enum(['fastq', 'fasta']);

export const ExperimentSequencingSchema = z.object({
  isDemultiplexed: z.boolean(),
  readType: ReadTypeSchema,
  fileFormat: FileFormatSchema,
  primers: z.object({
    fivePrime: z.string(),
    threePrime: z.string().optional(),
  }),
  randomizedRegion: z.discriminatedUnion('type', [
    ExactLengthRandomizedRegionSchema,
    RangeRandomizedRegionSchema,
  ]),
});

/* Selection cycle */

const SelectionCycleBaseSchema = z.object({
  roundNumber: z.number(),
  roundName: z.string(),
  isControl: z.boolean(),
  isCounterSelection: z.boolean(),
});

export const SelectionCycleFilesSchema = z.object({
  forward: z.instanceof(File),
  reverse: z.instanceof(File).optional(),
});

export const SelectionCycleSchema = SelectionCycleBaseSchema.extend({
  files: SelectionCycleFilesSchema,
});

// Used for JSON import validation
export const SelectionCycleImportSchema = SelectionCycleBaseSchema;

/* Top-level schemas */

// Validates the user-provided JSON file
export const ExperimentCreationParamsSchema = z.object({
  name: z.string(),
  description: z.string(),
  sequencing: ExperimentSequencingSchema,
  selectionCycles: z.array(SelectionCycleImportSchema),
});

// Validates the full DTO (after files have been attached)
export const CreateExperimentDtoSchema = ExperimentCreationParamsSchema.extend({
  selectionCycles: z.array(SelectionCycleSchema),
});

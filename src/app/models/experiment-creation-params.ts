import { z } from 'zod';
import { ExperimentCreationParamsSchema, SelectionCycleImportSchema } from './experiment-creation.schema';

export type ExperimentCreationParams = z.infer<typeof ExperimentCreationParamsSchema>;

export type SelectionCycleImport = z.infer<typeof SelectionCycleImportSchema>;

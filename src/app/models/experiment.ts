import { z } from 'zod';
import { FileFormatSchema, ReadTypeSchema } from './experiment-creation.schema';

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'error';

export type ReadType = z.infer<typeof ReadTypeSchema>;
export type FileFormat = z.infer<typeof FileFormatSchema>;

import { z } from 'zod';

export const sourceTypeSchema = z.enum([
  'file_upload',
  'url',
  'email',
  'slack_message',
  'discord_message',
  'mcp_input',
  'text_input',
  'connector',
]);

export const connectorTypeSchema = z.enum([
  'local_folder',
  'google_drive',
  's3',
  'gcs',
  'dropbox',
  'onedrive',
]);

export const createConnectorSchema = z.object({
  connectorType: connectorTypeSchema,
  name: z.string().min(1).max(255),
  config: z.record(z.string(), z.unknown()),
});

export const submitUrlSchema = z.object({
  url: z.string().url(),
  title: z.string().max(500).optional(),
});

export const submitTextSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100_000),
});

export type CreateConnectorInput = z.infer<typeof createConnectorSchema>;
export type SubmitUrlInput = z.infer<typeof submitUrlSchema>;
export type SubmitTextInput = z.infer<typeof submitTextSchema>;

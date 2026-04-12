export type SourceType =
  | 'file_upload'
  | 'url'
  | 'email'
  | 'slack_message'
  | 'discord_message'
  | 'mcp_input'
  | 'text_input'
  | 'connector';

export type SourceStatus = 'pending' | 'processing' | 'processed' | 'failed';

export type ConnectorType =
  | 'local_folder'
  | 'google_drive'
  | 's3'
  | 'gcs'
  | 'dropbox'
  | 'onedrive';

export type ConnectorSyncStatus = 'active' | 'paused' | 'error';

export interface Source {
  id: string;
  workspaceId: string;
  sourceType: SourceType;
  channel: string;
  connectorId: string | null;
  sourceUri: string | null;
  title: string | null;
  contentText: string | null;
  contentHash: string;
  rawMetadata: Record<string, unknown>;
  ingestedAt: Date;
  ingestedBy: string | null;
  status: SourceStatus;
  version: number;
  lastSyncedAt: Date | null;
}

export interface SourceConnector {
  id: string;
  workspaceId: string;
  connectorType: ConnectorType;
  name: string;
  config: Record<string, unknown>;
  syncStatus: ConnectorSyncStatus;
  lastSyncedAt: Date | null;
  fileCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SourceAttachment {
  id: string;
  sourceId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  contentText: string | null;
  createdAt: Date;
}

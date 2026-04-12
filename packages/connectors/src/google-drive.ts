/**
 * GoogleDriveConnector — Phase 1 stub
 *
 * This connector will watch a Google Drive folder (shared team folder or My
 * Drive) for new and modified files using the Drive API's push-notification or
 * polling mechanism. Authentication is via OAuth 2.0.
 *
 * Implementation is deferred to Phase 1. The stub satisfies the BaseConnector
 * interface so the rest of the system can reference the type at compile time
 * without any runtime dependency on the Google APIs.
 *
 * Phase 1 implementation notes (for future reference):
 *   - Use googleapis npm package (google-auth-library + drive_v3)
 *   - Register a webhook channel via drive.channels.watch() for push
 *     notifications; fall back to polling (files.list with modifiedTime filter)
 *   - config blob shape: { folderId: string, refreshToken: string, pageToken?: string }
 *   - Convert Drive MIME types to local MIME types for downstream parsers
 *   - Export as Google Workspace formats: Docs → text/plain, Sheets → text/csv
 */

import type { BaseConnector, ConnectorConfig, ConnectorEvent } from './base.js';

export class GoogleDriveConnector implements BaseConnector {
  private readonly config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  start(): Promise<void> {
    throw new Error(`Google Drive connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }

  stop(): Promise<void> {
    throw new Error(`Google Drive connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }

  onEvent(_handler: (event: ConnectorEvent) => void): void {
    throw new Error(`Google Drive connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }

  scan(): Promise<ConnectorEvent[]> {
    throw new Error(`Google Drive connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }
}

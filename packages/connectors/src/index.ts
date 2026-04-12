/**
 * @kaibase/connectors — public API
 *
 * Source connectors watch external storage locations and surface file-level
 * change events. All channels (connector, upload, URL, text) normalise into
 * an IngestEvent before entering the AI compiler pipeline.
 *
 * Phase 0a active:  LocalFolderConnector, parsers
 * Phase 1 planned:  GoogleDriveConnector, S3Connector
 */

// ---------------------------------------------------------------------------
// Imports used by the factory function at the bottom of this file.
// All re-exports also use these same imported values.
// ---------------------------------------------------------------------------

import { LocalFolderConnector } from './local-folder.js';
import { GoogleDriveConnector } from './google-drive.js';
import { S3Connector } from './s3.js';
import type { BaseConnector, ConnectorConfig } from './base.js';

// ---------------------------------------------------------------------------
// Base types
// ---------------------------------------------------------------------------

export type {
  BaseConnector,
  ConnectorConfig,
  ConnectorEvent,
  ConnectorEventType,
} from './base.js';

// ---------------------------------------------------------------------------
// Phase 0a connectors
// ---------------------------------------------------------------------------

export { LocalFolderConnector } from './local-folder.js';
export type { LocalFolderConfig } from './local-folder.js';

// ---------------------------------------------------------------------------
// Phase 1 connector stubs (importable but throw at runtime)
// ---------------------------------------------------------------------------

export { GoogleDriveConnector } from './google-drive.js';
export { S3Connector } from './s3.js';

// ---------------------------------------------------------------------------
// File parsers
// ---------------------------------------------------------------------------

export {
  parseFile,
  parsePdf,
  parseDocx,
  parsePlainText,
  parseHtml,
  ParseError,
  UnsupportedMimeTypeError,
} from './parsers.js';

// ---------------------------------------------------------------------------
// Intake Gateway — IngestEvent
//
// Every ingest channel (connector file event, web upload, URL submission, text
// input, email, Slack, MCP) normalises its payload into an IngestEvent before
// it enters the Policy Engine and Source Vault.
//
// IngestEvent is defined here rather than in @kaibase/shared because it is
// produced exclusively by connector-layer code. Consumers (workers, API) import
// it from this package.
// ---------------------------------------------------------------------------

export type IngestChannel =
  | 'connector'   // File detected by a source connector (local folder, Drive, S3)
  | 'upload'      // Web upload (ad-hoc, fallback)
  | 'url'         // User-submitted URL
  | 'text_input'  // Direct text entry
  | 'email'       // Inbound email (Phase 1)
  | 'slack'       // Slack bot message (Phase 1)
  | 'discord'     // Discord bot message (Phase 1)
  | 'mcp';        // MCP ingest_source tool call (Phase 1)

export type IngestEventOperation = 'create' | 'update' | 'delete';

/**
 * Normalised event that enters the Intake Gateway from any ingest channel.
 *
 * Downstream consumers (Policy Engine, Source Vault writer, AI compiler queue)
 * depend only on this shape — they never inspect channel-specific fields.
 */
export interface IngestEvent {
  /**
   * Unique event ID (UUID v4). Used for idempotency checks in BullMQ workers.
   * Callers must generate this before enqueuing.
   */
  eventId: string;

  /** Workspace that owns this ingest event. All DB writes are scoped to this. */
  workspaceId: string;

  /** Which channel produced this event. */
  channel: IngestChannel;

  /**
   * Whether this is a new source, an update to an existing source (connector
   * detected a changed file), or a deletion (connector detected file removed).
   */
  operation: IngestEventOperation;

  /**
   * Connector that produced this event. Null for upload/url/text/mcp channels.
   * References source_connector.id in the database.
   */
  connectorId: string | null;

  /**
   * Stable URI identifying where the original file lives. Never a Kaibase
   * storage URI for connector events — the file stays in the user's storage.
   *
   * Examples:
   *   connector:  "file:///home/alice/docs/report.pdf"
   *   upload:     "s3://kaibase-uploads/wid/uuid/report.pdf"
   *   url:        "https://example.com/article"
   *   text_input: null
   */
  sourceUri: string | null;

  /**
   * Absolute file path — populated for connector and upload channels.
   * Null for url/text_input/email/slack/discord/mcp.
   */
  filePath: string | null;

  /**
   * Original filename as seen by the user (basename). Used as the source title
   * when no richer title is available.
   */
  filename: string | null;

  /** MIME type. Required for connector/upload; may be null for text_input. */
  mimeType: string | null;

  /** File size in bytes. 0 or null for non-file channels. */
  sizeBytes: number | null;

  /**
   * Raw text content. Populated by the intake gateway after parsing (for
   * connector/upload) or directly from the channel (for text_input, slack, etc.).
   * Null for delete operations — content no longer exists.
   */
  contentText: string | null;

  /**
   * SHA-256 hash of contentText (hex string). Computed by the intake gateway
   * after parsing. Used for deduplication against existing source records.
   * Null for delete operations.
   */
  contentHash: string | null;

  /**
   * Arbitrary channel-specific metadata.
   *
   * Examples:
   *   connector:  { connectorType: 'local_folder', relativePath: 'reports/q1.pdf' }
   *   url:        { fetchedAt: '2026-04-12T...' , statusCode: 200 }
   *   slack:      { channelId: 'C...', threadTs: '...' , authorId: 'U...' }
   */
  rawMetadata: Record<string, unknown>;

  /**
   * User ID of the person who triggered this ingest, if identifiable.
   * Null for automated connector events.
   */
  triggeredBy: string | null;

  /** Wall-clock time when this event was created (ISO 8601). */
  occurredAt: string;
}

// ---------------------------------------------------------------------------
// Connector factory
//
// Instantiate the correct connector implementation from a ConnectorConfig
// stored in the database without having to import all implementations at every
// call site.
// ---------------------------------------------------------------------------

/**
 * Connector types supported by the factory. Mirrors ConnectorType from
 * @kaibase/shared/types/source — duplicated here to avoid a circular dep.
 */
export type ConnectorTypeKey =
  | 'local_folder'
  | 'google_drive'
  | 's3'
  | 'gcs';  // GCS uses the S3-compatible API — same connector class

/**
 * Create a connector instance from a database-hydrated ConnectorConfig.
 *
 * @throws {Error} if the connector type is not recognised.
 */
export function createConnector(
  type: ConnectorTypeKey,
  config: ConnectorConfig,
): BaseConnector {
  switch (type) {
    case 'local_folder':
      return new LocalFolderConnector(config);
    case 'google_drive':
      return new GoogleDriveConnector(config);
    case 's3':
    case 'gcs':
      return new S3Connector(config);
    default: {
      // Exhaustiveness guard — TypeScript will catch unknown types at compile
      // time, but this branch protects against runtime DB values.
      const _exhaustive: never = type;
      throw new Error(`Unknown connector type: ${String(_exhaustive)}`);
    }
  }
}

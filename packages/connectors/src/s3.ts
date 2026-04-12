/**
 * S3Connector — Phase 1 stub
 *
 * This connector will watch an S3 (or S3-compatible: GCS, MinIO) bucket/prefix
 * for new and modified objects using S3 Event Notifications or polling via the
 * ListObjectsV2 API. Authentication is via IAM credentials (access key + secret,
 * or instance profile).
 *
 * Implementation is deferred to Phase 1. The stub satisfies the BaseConnector
 * interface so the rest of the system can reference the type at compile time
 * without any runtime dependency on the AWS SDK.
 *
 * Phase 1 implementation notes (for future reference):
 *   - Use @aws-sdk/client-s3 (v3 modular SDK)
 *   - config blob shape:
 *       {
 *         bucket: string,
 *         prefix?: string,        // optional key prefix to watch
 *         region: string,
 *         accessKeyId: string,    // encrypted at rest in the DB
 *         secretAccessKey: string,
 *         endpoint?: string,      // for S3-compatible stores (GCS, MinIO)
 *         forcePathStyle?: boolean
 *       }
 *   - S3 event notifications → SQS → connector polls SQS for ObjectCreated /
 *     ObjectRemoved events (reliable, near-real-time)
 *   - Fallback: ListObjectsV2 with ETag comparison against stored hashes
 *   - GCS support: use HMAC keys + s3-compatible endpoint (storage.googleapis.com)
 */

import type { BaseConnector, ConnectorConfig, ConnectorEvent } from './base.js';

export class S3Connector implements BaseConnector {
  private readonly config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  start(): Promise<void> {
    throw new Error(`S3 connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }

  stop(): Promise<void> {
    throw new Error(`S3 connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }

  onEvent(_handler: (event: ConnectorEvent) => void): void {
    throw new Error(`S3 connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }

  scan(): Promise<ConnectorEvent[]> {
    throw new Error(`S3 connector (${this.config.id}) is not yet implemented (Phase 1)`);
  }
}

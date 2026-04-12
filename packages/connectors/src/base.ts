/**
 * Base connector interface for all source connectors.
 *
 * Connectors watch external storage for new/changed/removed files and emit
 * ConnectorEvents. Files are never copied — only references and extracted
 * content enter the Source Vault.
 */

export type ConnectorEventType = 'added' | 'changed' | 'removed';

/**
 * A single file-level event emitted by a connector when it detects a change
 * in the watched storage location.
 */
export interface ConnectorEvent {
  /** Whether the file was added, modified, or removed. */
  type: ConnectorEventType;
  /** Absolute path to the file as seen by the connector runtime. */
  filePath: string;
  /** Path relative to the connector root (e.g. folder path or bucket prefix). */
  relativePath: string;
  /** MIME type derived from file extension. */
  mimeType: string;
  /** File size in bytes. 0 for removed events where the file no longer exists. */
  sizeBytes: number;
}

/**
 * Configuration stored in the database for a registered source connector.
 * The `config` field is connector-specific (e.g. { path: '/home/user/docs' }
 * for a local folder connector).
 */
export interface ConnectorConfig {
  /** Connector record UUID from the database. */
  id: string;
  /** Workspace this connector belongs to. All events are scoped to this workspace. */
  workspaceId: string;
  /** Human-readable display name chosen by the user. */
  name: string;
  /** Connector-specific configuration blob persisted in the database. */
  config: Record<string, unknown>;
}

/**
 * Contract that every source connector must fulfil.
 *
 * Lifecycle:
 *   1. Instantiate with ConnectorConfig
 *   2. Register event handler via onEvent()
 *   3. Call start() to begin watching
 *   4. Optionally call scan() for an immediate full snapshot
 *   5. Call stop() on shutdown / disconnect
 */
export interface BaseConnector {
  /**
   * Begin watching the external storage location for changes.
   * Must be idempotent — calling start() on an already-running connector
   * should be a no-op or gracefully restart.
   */
  start(): Promise<void>;

  /**
   * Stop watching and release all resources (file descriptors, API polling
   * intervals, etc.).
   */
  stop(): Promise<void>;

  /**
   * Register the handler that receives ConnectorEvents.
   * Must be called before start() so no events are lost during startup.
   * Only one handler is supported per connector instance; subsequent calls
   * replace the previous handler.
   */
  onEvent(handler: (event: ConnectorEvent) => void): void;

  /**
   * Perform a one-shot scan of the storage location and return a snapshot of
   * all currently present files as 'added' events. Used for:
   *   - Initial population when a connector is first registered
   *   - Manual sync triggered by the user via the API
   */
  scan(): Promise<ConnectorEvent[]>;
}

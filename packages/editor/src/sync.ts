/**
 * Custom Y.Doc WebSocket sync provider for Kaibase.
 *
 * Built on Yjs (MIT license) — NOT using AFFiNE's cloud sync.
 * Provides real-time collaborative editing by syncing Y.Doc state
 * over a WebSocket connection to our custom sync server.
 *
 * Phase 0a: Single-user stub. The WebSocket connection and message
 * protocol are structured so multi-user sync can be added in Phase 1
 * without changing the public API.
 *
 * Sync protocol overview:
 * 1. Client connects to ws://<host>/sync/<docId>
 * 2. On connect, client sends full state vector (Yjs sync step 1)
 * 3. Server responds with missing updates (Yjs sync step 2)
 * 4. Ongoing: client and server exchange incremental updates
 * 5. On disconnect, client queues updates for reconnection
 *
 * This is a NEW file under our own license.
 */

import * as Y from 'yjs';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

/** Connection state of the sync provider */
export type SyncConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** Listener for connection state changes */
export type ConnectionStateListener = (state: SyncConnectionState) => void;

/** Configuration for the sync provider */
export interface SyncProviderOptions {
  /**
   * Maximum number of reconnection attempts before giving up.
   * Set to 0 for infinite retries.
   * @default 10
   */
  maxReconnectAttempts?: number;

  /**
   * Base delay in milliseconds for exponential backoff reconnection.
   * Actual delay = baseReconnectDelay * 2^attempt (capped at 30s).
   * @default 1000
   */
  baseReconnectDelay?: number;

  /**
   * Maximum reconnection delay in milliseconds.
   * @default 30000
   */
  maxReconnectDelay?: number;
}

// ----------------------------------------------------------------
// SyncProvider
// ----------------------------------------------------------------

/**
 * Custom Y.Doc WebSocket sync provider.
 *
 * Manages a WebSocket connection that syncs a Y.Doc to the Kaibase
 * sync server. Handles reconnection with exponential backoff and
 * queues updates while disconnected.
 *
 * @example
 * ```ts
 * import * as Y from 'yjs';
 * import { createSyncProvider } from '@kaibase/editor/sync';
 *
 * const doc = new Y.Doc();
 * const provider = createSyncProvider(doc, 'ws://localhost:3001/sync/doc-123');
 *
 * provider.onStateChange((state) => {
 *   console.log('Sync state:', state);
 * });
 *
 * provider.connect();
 *
 * // Later: clean up
 * provider.destroy();
 * ```
 */
export class SyncProvider {
  private readonly doc: Y.Doc;
  private readonly wsUrl: string;
  private readonly options: Required<SyncProviderOptions>;

  private ws: WebSocket | null = null;
  private connectionState: SyncConnectionState = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly stateListeners: Set<ConnectionStateListener> = new Set();
  private readonly pendingUpdates: Uint8Array[] = [];
  private isDestroyed = false;

  /** Bound handler for Y.Doc update events */
  private readonly handleDocUpdate: (update: Uint8Array, origin: unknown) => void;

  constructor(doc: Y.Doc, wsUrl: string, options: SyncProviderOptions = {}) {
    this.doc = doc;
    this.wsUrl = wsUrl;
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      baseReconnectDelay: options.baseReconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30_000,
    };

    // Listen for local Y.Doc changes to send to the server
    this.handleDocUpdate = (update: Uint8Array, origin: unknown) => {
      // Do not echo back updates that came from the server
      if (origin === this) return;
      this.sendUpdate(update);
    };
  }

  /** Current connection state */
  get state(): SyncConnectionState {
    return this.connectionState;
  }

  /**
   * Register a listener for connection state changes.
   * Returns an unsubscribe function.
   */
  onStateChange(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Open the WebSocket connection and begin syncing.
   *
   * Safe to call multiple times — if already connected, this is a no-op.
   */
  connect(): void {
    if (this.isDestroyed) {
      throw new Error('SyncProvider has been destroyed');
    }

    if (this.ws !== null) {
      return; // Already connected or connecting
    }

    this.doc.on('update', this.handleDocUpdate);
    this.setupWebSocket();
  }

  /**
   * Close the connection and stop syncing. Can be reconnected
   * later by calling connect() again.
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.doc.off('update', this.handleDocUpdate);

    if (this.ws !== null) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState('disconnected');
    this.reconnectAttempt = 0;
  }

  /**
   * Permanently destroy this provider. Disconnects and releases
   * all resources. Cannot be reconnected after this.
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.stateListeners.clear();
    this.pendingUpdates.length = 0;
  }

  // ----------------------------------------------------------------
  // Private methods
  // ----------------------------------------------------------------

  private setupWebSocket(): void {
    this.setConnectionState('connecting');

    // TODO: Replace with actual WebSocket once sync server exists.
    // For Phase 0a (single-user, no sync server), we log and skip.
    //
    // In production this would be:
    //   this.ws = new WebSocket(this.wsUrl);
    //   this.ws.binaryType = 'arraybuffer';
    //   this.ws.onopen = () => this.handleOpen();
    //   this.ws.onmessage = (event) => this.handleMessage(event);
    //   this.ws.onclose = (event) => this.handleClose(event);
    //   this.ws.onerror = () => this.handleError();

    // Phase 0a stub: immediately transition to disconnected.
    // The Y.Doc works fully locally without a sync server.
    console.info(
      `[SyncProvider] Phase 0a stub — WebSocket sync to ${this.wsUrl} is not yet implemented. Y.Doc operates in local-only mode.`,
    );
    this.setConnectionState('disconnected');

    // Keep references to WS handlers so they survive tree-shaking.
    // These will be wired up when the sync server is implemented.
    void this.handleOpen;
    void this.handleMessage;
    void this.handleClose;
    void this.handleError;
  }

  /**
   * Handle WebSocket open event.
   * Sends the initial state vector for Yjs sync step 1.
   */
  private handleOpen(): void {
    this.setConnectionState('connected');
    this.reconnectAttempt = 0;

    // Yjs sync step 1: send our state vector so the server knows
    // what updates we are missing.
    const stateVector = Y.encodeStateVector(this.doc);
    this.ws?.send(new Uint8Array(stateVector));

    // Flush any updates queued while disconnected
    this.flushPendingUpdates();
  }

  /**
   * Handle incoming WebSocket messages.
   * Applies remote Y.Doc updates to the local document.
   */
  private handleMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      const update = new Uint8Array(event.data);

      // Apply the remote update, marking origin as `this` so our
      // handleDocUpdate listener does not echo it back.
      Y.applyUpdate(this.doc, update, this);
    }
  }

  /**
   * Handle WebSocket close event.
   * Triggers reconnection with exponential backoff.
   */
  private handleClose(_event: CloseEvent): void {
    this.ws = null;
    this.setConnectionState('disconnected');
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket error event.
   */
  private handleError(): void {
    this.setConnectionState('error');
    // The close event will follow, triggering reconnection.
  }

  /**
   * Send a Y.Doc update to the server, or queue it if disconnected.
   */
  private sendUpdate(update: Uint8Array): void {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(new Uint8Array(update));
    } else {
      // Queue for later delivery when reconnected
      this.pendingUpdates.push(update);
    }
  }

  /**
   * Send all queued updates to the server.
   */
  private flushPendingUpdates(): void {
    while (this.pendingUpdates.length > 0) {
      const update = this.pendingUpdates.shift();
      if (update !== undefined && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(new Uint8Array(update));
      }
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.isDestroyed) return;

    const maxAttempts = this.options.maxReconnectAttempts;
    if (maxAttempts > 0 && this.reconnectAttempt >= maxAttempts) {
      console.warn(
        `[SyncProvider] Max reconnection attempts (${maxAttempts}) reached for ${this.wsUrl}`,
      );
      this.setConnectionState('error');
      return;
    }

    const delay = Math.min(
      this.options.baseReconnectDelay * Math.pow(2, this.reconnectAttempt),
      this.options.maxReconnectDelay,
    );

    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed) {
        this.setupWebSocket();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setConnectionState(state: SyncConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch {
        // Swallow listener errors to avoid breaking the provider
      }
    }
  }
}

// ----------------------------------------------------------------
// Factory function
// ----------------------------------------------------------------

/**
 * Creates a SyncProvider for a Y.Doc and WebSocket URL.
 *
 * This is the recommended way to create a sync provider. The returned
 * provider is not yet connected — call `.connect()` to start syncing.
 *
 * @param doc     - The Yjs document to sync
 * @param wsUrl   - WebSocket URL of the sync server (e.g., ws://localhost:3001/sync/doc-123)
 * @param options - Optional configuration
 * @returns A new SyncProvider instance
 *
 * @example
 * ```ts
 * const provider = createSyncProvider(doc, 'ws://localhost:3001/sync/doc-123');
 * provider.connect();
 * ```
 */
export function createSyncProvider(
  doc: Y.Doc,
  wsUrl: string,
  options?: SyncProviderOptions,
): SyncProvider {
  return new SyncProvider(doc, wsUrl, options);
}

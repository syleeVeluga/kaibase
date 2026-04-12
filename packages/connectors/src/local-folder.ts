/**
 * LocalFolderConnector — Phase 0a
 *
 * Watches a local directory for file additions, modifications, and removals
 * using chokidar. Only files with supported extensions are surfaced as events;
 * everything else is silently ignored.
 *
 * Design note: files are never read here — this connector only surfaces
 * path + metadata. Actual content extraction happens in parsers.ts downstream.
 */

import { watch, type FSWatcher } from 'chokidar';
import { stat, readdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import type { BaseConnector, ConnectorConfig, ConnectorEvent } from './base.js';

// ---------------------------------------------------------------------------
// Supported extensions (Phase 0a)
// ---------------------------------------------------------------------------

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md', '.html']);

// Phase 1 additions (not yet active):
// '.xlsx', '.pptx', '.json', '.xml', '.csv', '.png', '.jpg', '.jpeg',
// '.gif', '.webp', '.svg', '.zip'

// ---------------------------------------------------------------------------
// MIME type map (extension → MIME)
// ---------------------------------------------------------------------------

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
};

function mimeForExtension(ext: string): string {
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// LocalFolderConnector
// ---------------------------------------------------------------------------

/**
 * Expected shape of the connector-specific config blob stored in the database.
 */
export interface LocalFolderConfig {
  /** Absolute path to the folder the user wants to watch. */
  path: string;
}

export class LocalFolderConnector implements BaseConnector {
  private readonly connectorConfig: ConnectorConfig;
  private readonly watchPath: string;
  private watcher: FSWatcher | null = null;
  private eventHandler: ((event: ConnectorEvent) => void) | null = null;

  constructor(config: ConnectorConfig) {
    this.connectorConfig = config;

    const folderConfig = config.config as Partial<LocalFolderConfig>;
    if (typeof folderConfig['path'] !== 'string' || folderConfig['path'].length === 0) {
      throw new Error(
        `LocalFolderConnector (id=${config.id}): config.path is required and must be a non-empty string`,
      );
    }

    this.watchPath = resolve(folderConfig['path']);
  }

  // ---------------------------------------------------------------------------
  // BaseConnector implementation
  // ---------------------------------------------------------------------------

  onEvent(handler: (event: ConnectorEvent) => void): void {
    this.eventHandler = handler;
  }

  async start(): Promise<void> {
    if (this.watcher) {
      // Already running — no-op to satisfy idempotency requirement.
      return;
    }

    this.watcher = watch(this.watchPath, {
      persistent: true,
      ignoreInitial: true, // emit only for changes after the watcher is ready
      usePolling: false,    // rely on native FS events where available
      awaitWriteFinish: {
        stabilityThreshold: 500, // ms quiet period before declaring write done
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath) => {
      void this.handleFsEvent('added', filePath);
    });

    this.watcher.on('change', (filePath) => {
      void this.handleFsEvent('changed', filePath);
    });

    this.watcher.on('unlink', (filePath) => {
      // File is already gone — emit with sizeBytes 0.
      this.emitEvent('removed', filePath, 0);
    });

    // Swallow chokidar errors (permission denied, etc.) — they are non-fatal.
    this.watcher.on('error', (err) => {
      // In production this would go to pino structured logging.
      console.error(
        `[LocalFolderConnector id=${this.connectorConfig.id}] watcher error:`,
        err,
      );
    });

    // Wait for the initial scan to complete so the watcher is ready.
    await new Promise<void>((resolveReady) => {
      this.watcher!.on('ready', () => {
        resolveReady();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  async scan(): Promise<ConnectorEvent[]> {
    const events: ConnectorEvent[] = [];

    const files = await this.walkDirectory(this.watchPath);

    for (const filePath of files) {
      const ext = extname(filePath).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      try {
        const info = await stat(filePath);
        if (!info.isFile()) continue;

        events.push({
          type: 'added',
          filePath,
          relativePath: relative(this.watchPath, filePath),
          mimeType: mimeForExtension(ext),
          sizeBytes: info.size,
        });
      } catch {
        // File disappeared between enumeration and stat — skip silently.
      }
    }

    return events;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async handleFsEvent(
    type: 'added' | 'changed',
    filePath: string,
  ): Promise<void> {
    const ext = extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return;

    try {
      const info = await stat(filePath);
      if (!info.isFile()) return;

      this.emitEvent(type, filePath, info.size);
    } catch {
      // Stat failed (file already removed, permission denied) — skip.
    }
  }

  private emitEvent(
    type: ConnectorEvent['type'],
    filePath: string,
    sizeBytes: number,
  ): void {
    if (!this.eventHandler) return;

    const ext = extname(filePath).toLowerCase();
    if (type !== 'removed' && !SUPPORTED_EXTENSIONS.has(ext)) return;

    const event: ConnectorEvent = {
      type,
      filePath,
      relativePath: relative(this.watchPath, filePath),
      mimeType: mimeForExtension(ext),
      sizeBytes,
    };

    this.eventHandler(event);
  }

  /**
   * Recursively collect all file paths under `dir`.
   * Returns absolute paths.
   */
  private async walkDirectory(dir: string): Promise<string[]> {
    const results: string[] = [];

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // Unreadable directory (permissions, etc.) — return empty.
      return results;
    }

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        const children = await this.walkDirectory(fullPath);
        results.push(...children);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }

    return results;
  }
}

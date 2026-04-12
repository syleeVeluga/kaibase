/**
 * LocalFolderConnector unit tests
 *
 * These tests exercise the scan() method and constructor validation using real
 * temporary directories. The live watcher (start/stop) is not tested here
 * because chokidar's FS event timing is flaky in CI — integration/E2E tests
 * cover the watch path.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalFolderConnector } from './local-folder.js';
import type { ConnectorConfig } from './base.js';

// ---------------------------------------------------------------------------
// Shared tmp directory lifecycle
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'kaibase-lfc-test-'));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(path: string): ConnectorConfig {
  return {
    id: 'test-connector-id',
    workspaceId: 'test-workspace-id',
    name: 'Test Folder',
    config: { path },
  };
}

// ---------------------------------------------------------------------------
// Constructor validation
// ---------------------------------------------------------------------------

describe('LocalFolderConnector constructor', () => {
  it('throws when config.path is missing', () => {
    expect(
      () =>
        new LocalFolderConnector({
          id: 'c1',
          workspaceId: 'ws1',
          name: 'Bad',
          config: {},
        }),
    ).toThrow('config.path is required');
  });

  it('throws when config.path is an empty string', () => {
    expect(
      () =>
        new LocalFolderConnector({
          id: 'c2',
          workspaceId: 'ws1',
          name: 'Bad',
          config: { path: '' },
        }),
    ).toThrow('config.path is required');
  });

  it('does not throw with a valid path', () => {
    expect(() => new LocalFolderConnector(makeConfig(tmpDir))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// scan()
// ---------------------------------------------------------------------------

describe('LocalFolderConnector.scan()', () => {
  it('returns empty array for an empty directory', async () => {
    const emptyDir = await mkdtemp(join(tmpDir, 'empty-'));
    const connector = new LocalFolderConnector(makeConfig(emptyDir));

    const events = await connector.scan();

    expect(events).toHaveLength(0);
  });

  it('returns added events for supported files', async () => {
    const dir = await mkdtemp(join(tmpDir, 'supported-'));
    await writeFile(join(dir, 'doc.pdf'), '%PDF-1.4 fake pdf', 'utf8');
    await writeFile(join(dir, 'note.md'), '# Note', 'utf8');
    await writeFile(join(dir, 'page.html'), '<p>hi</p>', 'utf8');
    await writeFile(join(dir, 'report.docx'), 'fake docx bytes', 'utf8');
    await writeFile(join(dir, 'readme.txt'), 'plain text', 'utf8');

    const connector = new LocalFolderConnector(makeConfig(dir));
    const events = await connector.scan();

    expect(events).toHaveLength(5);
    for (const event of events) {
      expect(event.type).toBe('added');
      expect(event.sizeBytes).toBeGreaterThan(0);
      expect(event.mimeType).toBeTruthy();
      expect(event.filePath).toBeTruthy();
      expect(event.relativePath).toBeTruthy();
    }
  });

  it('ignores unsupported file extensions', async () => {
    const dir = await mkdtemp(join(tmpDir, 'unsupported-'));
    await writeFile(join(dir, 'photo.jpg'), 'fake jpg', 'utf8');
    await writeFile(join(dir, 'data.xlsx'), 'fake xlsx', 'utf8');
    await writeFile(join(dir, 'archive.zip'), 'fake zip', 'utf8');
    await writeFile(join(dir, 'note.md'), '# Supported', 'utf8');

    const connector = new LocalFolderConnector(makeConfig(dir));
    const events = await connector.scan();

    expect(events).toHaveLength(1);
    expect(events[0]?.relativePath).toBe('note.md');
  });

  it('returns correct MIME types for each extension', async () => {
    const dir = await mkdtemp(join(tmpDir, 'mimes-'));
    await writeFile(join(dir, 'a.pdf'), 'x', 'utf8');
    await writeFile(join(dir, 'b.docx'), 'x', 'utf8');
    await writeFile(join(dir, 'c.txt'), 'x', 'utf8');
    await writeFile(join(dir, 'd.md'), 'x', 'utf8');
    await writeFile(join(dir, 'e.html'), 'x', 'utf8');

    const connector = new LocalFolderConnector(makeConfig(dir));
    const events = await connector.scan();

    const mimes = Object.fromEntries(
      events.map((e) => [e.relativePath, e.mimeType]),
    );

    expect(mimes['a.pdf']).toBe('application/pdf');
    expect(mimes['b.docx']).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(mimes['c.txt']).toBe('text/plain');
    expect(mimes['d.md']).toBe('text/markdown');
    expect(mimes['e.html']).toBe('text/html');
  });

  it('walks subdirectories recursively', async () => {
    const dir = await mkdtemp(join(tmpDir, 'recursive-'));
    const subDir = join(dir, 'sub', 'deep');
    await mkdir(subDir, { recursive: true });
    await writeFile(join(dir, 'root.md'), '# root', 'utf8');
    await writeFile(join(subDir, 'nested.txt'), 'nested', 'utf8');

    const connector = new LocalFolderConnector(makeConfig(dir));
    const events = await connector.scan();

    expect(events).toHaveLength(2);
    const relativePaths = events.map((e) => e.relativePath);
    expect(relativePaths).toContain('root.md');
    // path separator is platform-dependent in relativePath; check it ends with the filename
    expect(relativePaths.some((p) => p.endsWith('nested.txt'))).toBe(true);
  });

  it('relativePath is relative to the watch root', async () => {
    const dir = await mkdtemp(join(tmpDir, 'rel-'));
    const sub = join(dir, 'sub');
    await mkdir(sub);
    await writeFile(join(sub, 'doc.txt'), 'content', 'utf8');

    const connector = new LocalFolderConnector(makeConfig(dir));
    const events = await connector.scan();

    expect(events).toHaveLength(1);
    // relativePath should not start with the watch root
    expect(events[0]?.relativePath).not.toContain(dir);
  });
});

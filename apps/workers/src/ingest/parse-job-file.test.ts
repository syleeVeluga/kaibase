import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveParseJobFile } from './parse-job-file.js';

const cleanupTasks: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanupTasks.length > 0) {
    const cleanup = cleanupTasks.pop();
    if (cleanup) {
      await cleanup();
    }
  }
});

describe('resolveParseJobFile', () => {
  it('returns the original path when the job already has a filePath', async () => {
    const result = await resolveParseJobFile({
      sourceId: 'source-1',
      filePath: '/tmp/existing.md',
    });

    expect(result.filePath).toBe('/tmp/existing.md');
    await expect(result.cleanup()).resolves.toBeUndefined();
  });

  it('materializes uploaded base64 markdown content to a temp file', async () => {
    const rawMarkdown = '# Heading\n\nBody text';
    const result = await resolveParseJobFile({
      sourceId: 'source-2',
      rawFileContent: Buffer.from(rawMarkdown, 'utf8').toString('base64'),
      filename: 'notes.md',
    });
    cleanupTasks.push(result.cleanup);

    const fileContent = await readFile(result.filePath, 'utf8');

    expect(result.filePath.endsWith('.md')).toBe(true);
    expect(fileContent).toBe(rawMarkdown);
  });

  it('removes the temp file when cleanup runs', async () => {
    const result = await resolveParseJobFile({
      sourceId: 'source-3',
      rawFileContent: Buffer.from('cleanup me', 'utf8').toString('base64'),
      filename: 'cleanup.md',
    });

    await result.cleanup();

    await expect(access(result.filePath, constants.F_OK)).rejects.toThrow();
  });

  it('throws when no file source is provided', async () => {
    await expect(
      resolveParseJobFile({
        sourceId: 'source-4',
      }),
    ).rejects.toThrow('Parse job is missing both filePath and rawFileContent');
  });
});
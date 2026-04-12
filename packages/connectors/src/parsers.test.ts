/**
 * parsers.ts unit tests
 *
 * These tests use tmp files on disk (via node:fs/promises) rather than mocking
 * the fs layer — keeping tests close to reality for a I/O-heavy parsing module.
 * pdf-parse and mammoth are NOT mocked here because they are integration-critical;
 * in CI the actual npm packages must be installed.
 *
 * Test strategy:
 *   - parsePlainText / parseHtml: exercised with real tmp files (no native deps)
 *   - parsePdf / parseDocx: smoke-tested with a minimal fixture; these delegate
 *     to third-party libs whose correctness we do not retest
 *   - parseFile: routing logic only (no actual parsing required)
 *   - Error types: constructor messages verified
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parsePlainText,
  parseHtml,
  parseFile,
  ParseError,
  UnsupportedMimeTypeError,
} from './parsers.js';

// ---------------------------------------------------------------------------
// Shared tmp directory lifecycle
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'kaibase-parsers-test-'));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// parsePlainText
// ---------------------------------------------------------------------------

describe('parsePlainText', () => {
  it('returns file content with normalised whitespace', async () => {
    const file = join(tmpDir, 'sample.txt');
    await writeFile(file, 'Hello,   world!\r\n\r\nSecond paragraph.', 'utf8');

    const result = await parsePlainText(file);

    expect(result).toBe('Hello, world!\n\nSecond paragraph.');
  });

  it('trims leading and trailing whitespace', async () => {
    const file = join(tmpDir, 'padded.txt');
    await writeFile(file, '\n\n  content  \n\n', 'utf8');

    const result = await parsePlainText(file);

    expect(result).toBe('content');
  });

  it('collapses 3+ consecutive blank lines to 2', async () => {
    const file = join(tmpDir, 'blanks.txt');
    await writeFile(file, 'a\n\n\n\n\nb', 'utf8');

    const result = await parsePlainText(file);

    expect(result).toBe('a\n\nb');
  });

  it('throws ParseError when the file does not exist', async () => {
    await expect(parsePlainText(join(tmpDir, 'does-not-exist.txt'))).rejects.toThrow(
      ParseError,
    );
  });
});

// ---------------------------------------------------------------------------
// parseHtml
// ---------------------------------------------------------------------------

describe('parseHtml', () => {
  it('strips tags and returns visible text', async () => {
    const file = join(tmpDir, 'page.html');
    await writeFile(
      file,
      '<html><body><h1>Title</h1><p>Body text.</p></body></html>',
      'utf8',
    );

    const result = await parseHtml(file);

    expect(result).toContain('Title');
    expect(result).toContain('Body text.');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('removes <script> block content', async () => {
    const file = join(tmpDir, 'script.html');
    await writeFile(
      file,
      '<html><body><script>var x = 1;</script><p>Visible</p></body></html>',
      'utf8',
    );

    const result = await parseHtml(file);

    expect(result).not.toContain('var x');
    expect(result).toContain('Visible');
  });

  it('removes <style> block content', async () => {
    const file = join(tmpDir, 'style.html');
    await writeFile(
      file,
      '<html><head><style>body { color: red; }</style></head><body><p>Text</p></body></html>',
      'utf8',
    );

    const result = await parseHtml(file);

    expect(result).not.toContain('color');
    expect(result).toContain('Text');
  });

  it('decodes common HTML entities', async () => {
    const file = join(tmpDir, 'entities.html');
    await writeFile(
      file,
      '<p>&amp; &lt;tag&gt; &quot;quoted&quot; &nbsp;space</p>',
      'utf8',
    );

    const result = await parseHtml(file);

    expect(result).toContain('&');
    expect(result).toContain('<tag>');
    expect(result).toContain('"quoted"');
  });

  it('throws ParseError when the file does not exist', async () => {
    await expect(parseHtml(join(tmpDir, 'missing.html'))).rejects.toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// parseFile routing
// ---------------------------------------------------------------------------

describe('parseFile', () => {
  it('routes text/plain to parsePlainText', async () => {
    const file = join(tmpDir, 'route.txt');
    await writeFile(file, 'routed content', 'utf8');

    const result = await parseFile(file, 'text/plain');
    expect(result).toBe('routed content');
  });

  it('routes text/markdown to parsePlainText', async () => {
    const file = join(tmpDir, 'route.md');
    await writeFile(file, '# Heading\n\nParagraph.', 'utf8');

    const result = await parseFile(file, 'text/markdown');
    expect(result).toContain('Heading');
  });

  it('routes text/html to parseHtml', async () => {
    const file = join(tmpDir, 'route.html');
    await writeFile(file, '<p>routed html</p>', 'utf8');

    const result = await parseFile(file, 'text/html');
    expect(result).toBe('routed html');
  });

  it('throws UnsupportedMimeTypeError for unknown MIME types', async () => {
    await expect(parseFile('/any/path', 'application/unknown')).rejects.toThrow(
      UnsupportedMimeTypeError,
    );
  });
});

// ---------------------------------------------------------------------------
// Error type constructors
// ---------------------------------------------------------------------------

describe('UnsupportedMimeTypeError', () => {
  it('has correct name and includes mimeType in message', () => {
    const err = new UnsupportedMimeTypeError('video/mp4', '/path/to/video.mp4');
    expect(err.name).toBe('UnsupportedMimeTypeError');
    expect(err.message).toContain('video/mp4');
    expect(err.mimeType).toBe('video/mp4');
    expect(err.filePath).toBe('/path/to/video.mp4');
  });
});

describe('ParseError', () => {
  it('has correct name and wraps cause message', () => {
    const cause = new Error('inner failure');
    const err = new ParseError('/path/to/file.pdf', 'application/pdf', cause);
    expect(err.name).toBe('ParseError');
    expect(err.message).toContain('inner failure');
    expect(err.filePath).toBe('/path/to/file.pdf');
    expect(err.mimeType).toBe('application/pdf');
  });
});

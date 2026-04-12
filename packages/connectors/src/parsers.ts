/**
 * File parsing pipeline for the Source Vault.
 *
 * parseFile() is the main entry point: it routes to the appropriate parser
 * based on MIME type and returns extracted plain text. The returned string is
 * stored as source.content_text in PostgreSQL. Binary files are never copied
 * by this layer — callers pass the file path and this module reads it in place.
 *
 * Phase 0a supported MIME types:
 *   application/pdf
 *   application/vnd.openxmlformats-officedocument.wordprocessingml.document
 *   text/plain
 *   text/markdown
 *   text/html
 */

import { readFile } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Route a file to the correct parser and return extracted plain text.
 *
 * @param filePath - Absolute path to the file. The file must be readable.
 * @param mimeType - MIME type of the file (derived from its extension).
 * @returns Extracted plain text, normalised to LF line endings.
 * @throws {UnsupportedMimeTypeError} if the MIME type has no registered parser.
 * @throws {ParseError} if the file exists but cannot be parsed.
 */
export async function parseFile(filePath: string, mimeType: string): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return parsePdf(filePath);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(filePath);

    case 'text/plain':
    case 'text/markdown':
      return parsePlainText(filePath);

    case 'text/html':
      return parseHtml(filePath);

    default:
      throw new UnsupportedMimeTypeError(mimeType, filePath);
  }
}

// ---------------------------------------------------------------------------
// Individual parsers
// ---------------------------------------------------------------------------

/**
 * Extract text from a PDF file using pdf-parse.
 *
 * pdf-parse returns the raw text layer of the PDF. It does not perform OCR —
 * scanned PDFs (image-only) will return an empty or near-empty string. OCR
 * support is deferred to Phase 1.
 */
export async function parsePdf(filePath: string): Promise<string> {
  try {
    // pdf-parse is a CommonJS module; import() gives us the default export.
    const pdfParse = await importPdfParse();
    const buffer = await readFile(filePath);
    const result = await pdfParse(buffer);
    return normaliseWhitespace(result.text);
  } catch (err) {
    throw new ParseError(filePath, 'application/pdf', err);
  }
}

/**
 * Extract text from a DOCX file using mammoth.
 *
 * mammoth converts DOCX content to plain text (via its extractRawText helper),
 * stripping all formatting, tables, and images. The raw-text path is used
 * rather than the HTML conversion path to keep the output clean for LLM ingestion.
 */
export async function parseDocx(filePath: string): Promise<string> {
  try {
    const mammoth = await importMammoth();
    const result = await mammoth.extractRawText({ path: filePath });
    // mammoth may populate result.messages with non-fatal warnings — ignore them.
    return normaliseWhitespace(result.value);
  } catch (err) {
    throw new ParseError(
      filePath,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      err,
    );
  }
}

/**
 * Read a plain-text or Markdown file and return its contents as-is.
 *
 * Markdown is not converted to HTML — the raw Markdown text is what gets
 * stored in content_text so the LLM can interpret structure from headings,
 * lists, and code fences without lossy conversion.
 */
export async function parsePlainText(filePath: string): Promise<string> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return normaliseWhitespace(raw);
  } catch (err) {
    throw new ParseError(filePath, 'text/plain', err);
  }
}

/**
 * Extract visible text from an HTML file by stripping all tags.
 *
 * This is a lightweight approach suitable for Phase 0a. It:
 *   1. Removes <script> and <style> blocks (including their content)
 *   2. Strips all remaining HTML tags
 *   3. Decodes a minimal set of HTML entities (&amp; &lt; &gt; &quot; &#039; &nbsp;)
 *   4. Collapses whitespace
 *
 * For Phase 1 URLs the plan is to use @mozilla/readability for article
 * extraction, but for local HTML files this simple approach is sufficient.
 */
export async function parseHtml(filePath: string): Promise<string> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return extractTextFromHtml(raw);
  } catch (err) {
    throw new ParseError(filePath, 'text/html', err);
  }
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class UnsupportedMimeTypeError extends Error {
  constructor(
    public readonly mimeType: string,
    public readonly filePath: string,
  ) {
    super(`No parser registered for MIME type "${mimeType}" (file: ${filePath})`);
    this.name = 'UnsupportedMimeTypeError';
  }
}

export class ParseError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly mimeType: string,
    public readonly cause: unknown,
  ) {
    const causeMessage =
      cause instanceof Error ? cause.message : String(cause);
    super(`Failed to parse "${filePath}" (${mimeType}): ${causeMessage}`);
    this.name = 'ParseError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML script/style blocks and all tags, then decode common entities.
 */
function extractTextFromHtml(html: string): string {
  // Remove <script>...</script> and <style>...</style> entirely.
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // Strip all remaining HTML tags.
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode a minimal set of HTML entities.
  text = text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&nbsp;/gi, ' ');

  return normaliseWhitespace(text);
}

/**
 * Normalise line endings to LF and collapse runs of blank lines to a single
 * blank line. Preserves intentional paragraph spacing while removing noise.
 */
function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')   // CRLF → LF
    .replace(/\r/g, '\n')     // stray CR → LF
    .replace(/[ \t]+/g, ' ')  // collapse horizontal whitespace within lines
    .replace(/\n{3,}/g, '\n\n') // collapse 3+ blank lines to 2
    .trim();
}

// ---------------------------------------------------------------------------
// Lazy dynamic imports (avoids loading heavy native modules at startup)
// ---------------------------------------------------------------------------

// pdf-parse ships as CommonJS; use createRequire for reliable interop in ESM.
async function importPdfParse(): Promise<
  (buffer: Buffer) => Promise<{ text: string; numpages: number; info: unknown }>
> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  return require('pdf-parse') as (
    buffer: Buffer,
  ) => Promise<{ text: string; numpages: number; info: unknown }>;
}

// mammoth ships as CommonJS; same interop pattern.
async function importMammoth(): Promise<{
  extractRawText(options: { path: string }): Promise<{ value: string; messages: unknown[] }>;
}> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  return require('mammoth') as {
    extractRawText(options: { path: string }): Promise<{ value: string; messages: unknown[] }>;
  };
}

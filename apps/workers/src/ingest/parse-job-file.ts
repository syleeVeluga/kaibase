import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

export interface ParseJobFileInput {
  filePath?: string;
  rawFileContent?: string;
  filename?: string;
  sourceId: string;
}

export interface ParseJobFileResolution {
  filePath: string;
  cleanup: () => Promise<void>;
}

export async function resolveParseJobFile(
  input: ParseJobFileInput,
): Promise<ParseJobFileResolution> {
  if (input.filePath) {
    return {
      filePath: input.filePath,
      cleanup: async () => {},
    };
  }

  if (!input.rawFileContent) {
    throw new Error('Parse job is missing both filePath and rawFileContent');
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'kaibase-upload-'));
  const extension = extname(input.filename ?? '') || '.tmp';
  const tempFilePath = join(tempDir, `${input.sourceId}${extension}`);
  const fileBuffer = Buffer.from(input.rawFileContent, 'base64');

  await writeFile(tempFilePath, fileBuffer);

  return {
    filePath: tempFilePath,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}
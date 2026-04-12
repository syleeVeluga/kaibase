import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQueueAdd = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({
  values: mockInsertValues,
}));
const mockTx = {
  insert: mockInsert,
};
const mockDb = {
  select: vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: async () => [],
      }),
    }),
  })),
  transaction: vi.fn(async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx)),
};

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: () => async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { userId: 'user-1', email: 'user@example.com' });
    await next();
  },
}));

vi.mock('../middleware/workspace.js', () => ({
  workspaceMiddleware: () => async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
    c.set('workspaceId', 'workspace-1');
    await next();
  },
}));

vi.mock('@kaibase/db/client', () => ({
  db: mockDb,
}));

vi.mock('../queues.js', () => ({
  ingestQueue: {
    add: mockQueueAdd,
  },
}));

describe('sourceRoutes upload', () => {
  beforeEach(() => {
    mockQueueAdd.mockReset();
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    mockDb.select.mockClear();
    mockDb.transaction.mockClear();
  });

  it('enqueues uploaded markdown content in the parse job payload', async () => {
    const { sourceRoutes } = await import('./sources.js');

    const markdown = '# Heading\n\nBody text';
    const file = new File([markdown], 'notes.md', { type: 'text/markdown' });
    const formData = new FormData();
    formData.append('file', file);

    const response = await sourceRoutes.request('http://localhost/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(201);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'parse',
      expect.objectContaining({
        workspaceId: 'workspace-1',
        filename: 'notes.md',
        mimeType: 'text/markdown',
        rawFileContent: Buffer.from(markdown, 'utf8').toString('base64'),
      }),
    );
  });
});
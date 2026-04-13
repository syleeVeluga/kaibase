import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQueueAdd = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({
  values: mockInsertValues,
}));
const mockUpdateSet = vi.fn(() => ({
  where: vi.fn().mockResolvedValue(undefined),
}));
const mockUpdate = vi.fn(() => ({
  set: mockUpdateSet,
}));
const mockTxSelect = vi.fn(() => ({
  from: () => ({
    where: () => ({
      limit: async () => txSelectResultsQueue.shift() ?? [],
    }),
  }),
}));
const mockTx = {
  insert: mockInsert,
  update: mockUpdate,
  select: mockTxSelect,
};
const selectResultsQueue: unknown[][] = [];
const txSelectResultsQueue: unknown[][] = [];
const mockDb = {
  select: vi.fn(() => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => selectResultsQueue.shift() ?? [],
        }),
        limit: async () => selectResultsQueue.shift() ?? [],
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
    selectResultsQueue.length = 0;
    txSelectResultsQueue.length = 0;
    mockQueueAdd.mockReset();
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    mockUpdate.mockClear();
    mockUpdateSet.mockClear();
    mockTxSelect.mockClear();
    mockDb.select.mockClear();
    mockDb.transaction.mockClear();
  });

  it('enqueues uploaded markdown content in the parse job payload', async () => {
    const { sourceRoutes } = await import('./sources.js');

    const markdown = '# Heading\n\nBody text';
    const file = new File([markdown], 'notes.md', { type: 'text/markdown' });
    const formData = new FormData();
    formData.append('file', file);
    selectResultsQueue.push([], []);

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

  it('returns a filename conflict before creating a second uploaded source', async () => {
    const { sourceRoutes } = await import('./sources.js');
    const { errorHandler } = await import('../middleware/error-handler.js');
    const app = new Hono();
    app.route('/', sourceRoutes);
    app.onError(errorHandler);

    const markdown = '# New content';
    const file = new File([markdown], 'notes.md', { type: 'text/markdown' });
    const formData = new FormData();
    formData.append('file', file);

    selectResultsQueue.push([], [{
      id: 'existing-source',
      title: 'notes.md',
      status: 'processed',
      version: 3,
      ingestedAt: new Date('2026-04-13T00:00:00.000Z'),
    }]);

    const response = await app.request('http://localhost/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'SOURCE_FILENAME_CONFLICT',
      details: {
        existingSource: {
          id: 'existing-source',
          title: 'notes.md',
          status: 'processed',
          version: 3,
        },
      },
    });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('replaces an existing uploaded source without overwriting its custom title', async () => {
    const { sourceRoutes } = await import('./sources.js');

    const markdown = '# Replacement content';
    const file = new File([markdown], 'notes.md', { type: 'text/markdown' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replaceExisting', 'true');
    formData.append('replaceSourceId', 'existing-source');

    selectResultsQueue.push([], [{
      id: 'existing-source',
      title: 'Custom source title',
      status: 'processed',
      version: 3,
      ingestedAt: new Date('2026-04-13T00:00:00.000Z'),
    }]);
    txSelectResultsQueue.push([{ id: 'attachment-1' }]);

    const response = await sourceRoutes.request('http://localhost/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      id: 'existing-source',
      replaced: true,
    });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Custom source title',
        status: 'pending',
      }),
    );
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'parse',
      expect.objectContaining({
        sourceId: 'existing-source',
        filename: 'notes.md',
        mimeType: 'text/markdown',
      }),
    );
  });
});
import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeResultsQueue: unknown[][] = [];
const findFirstQueue: unknown[] = [];
const selectResultsQueue: unknown[][] = [];
const insertValues = vi.fn().mockResolvedValue(undefined);
const insertMock = vi.fn(() => ({ values: insertValues }));
const transactionMock = vi.fn(
  async (callback: (tx: { insert: typeof insertMock }) => Promise<void>) => callback({ insert: insertMock }),
);
const compileQueueAdd = vi.fn().mockResolvedValue(undefined);
const llmComplete = vi.fn();
const answerQuestionPromptMock = vi.fn(() => [{ role: 'system', content: 'prompt' }]);
const resolvePromptConfigMock = vi.fn(() => ({
  model: 'gpt-5.4',
  temperature: 0.3,
  reasoningEffort: undefined,
}));
const applyPromptOverridesMock = vi.fn((messages) => messages);
const resolveCollectionIdByType = vi.fn().mockResolvedValue('collection-1');

const mockDb = {
  execute: vi.fn(async () => executeResultsQueue.shift() ?? []),
  insert: insertMock,
  transaction: transactionMock,
  select: vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: async () => selectResultsQueue.shift() ?? [],
      }),
    }),
  })),
  query: {
    workspaces: {
      findFirst: vi.fn(async () => findFirstQueue.shift() ?? null),
    },
  },
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

vi.mock('@kaibase/db', () => ({
  getCollectionTypeForPageType: vi.fn(() => 'briefs'),
  resolveCollectionIdByType,
}));

vi.mock('../providers.js', () => ({
  getEmbeddingProvider: () => ({
    generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  }),
  getOrCreateQAProvider: () => ({
    complete: llmComplete,
  }),
}));

vi.mock('../queues.js', () => ({
  compileQueue: {
    add: compileQueueAdd,
  },
}));

vi.mock('@kaibase/ai', () => ({
  answerQuestionPrompt: answerQuestionPromptMock,
  resolvePromptConfig: resolvePromptConfigMock,
  applyPromptOverrides: applyPromptOverridesMock,
}));

describe('qaRoutes language handling', () => {
  beforeEach(() => {
    executeResultsQueue.length = 0;
    findFirstQueue.length = 0;
    selectResultsQueue.length = 0;
    insertValues.mockClear();
    insertMock.mockClear();
    transactionMock.mockClear();
    compileQueueAdd.mockClear();
    llmComplete.mockReset();
    answerQuestionPromptMock.mockClear();
    resolvePromptConfigMock.mockClear();
    applyPromptOverridesMock.mockClear();
    resolveCollectionIdByType.mockClear();
    mockDb.execute.mockClear();
    mockDb.select.mockClear();
    mockDb.query.workspaces.findFirst.mockClear();
  });

  it('detects Korean questions when language is omitted', async () => {
    const { qaRoutes } = await import('./qa.js');

    findFirstQueue.push({ defaultLanguage: 'en' });
    executeResultsQueue.push([]);
    llmComplete.mockResolvedValue({
      content: JSON.stringify({
        answer: '한국어 답변',
        citations: [],
        confidence: 0.8,
        intentType: 'factual',
        canonicalOnly: true,
      }),
      model: 'gpt-5.4',
      tokenUsage: { input: 10, output: 20 },
    });

    const response = await qaRoutes.request('http://localhost/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ question: '이번 주 회의 내용을 요약해줘' }),
    });

    expect(response.status).toBe(200);
    expect(answerQuestionPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '이번 주 회의 내용을 요약해줘',
        language: 'ko',
      }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'query',
          detail: expect.objectContaining({ language: 'ko' }),
        }),
        expect.objectContaining({
          eventType: 'answer',
          detail: expect.objectContaining({
            questionLanguage: 'ko',
            answerLanguage: 'ko',
          }),
        }),
      ]),
    );
  });

  it('reuses stored answer language during promotion', async () => {
    const { qaRoutes } = await import('./qa.js');

    selectResultsQueue.push(
      [{
        id: 'answer-1',
        workspaceId: 'workspace-1',
        eventType: 'answer',
        detail: {
          question: '질문',
          answer: '답변',
          questionLanguage: 'ko',
          answerLanguage: 'ko',
          citations: [],
          confidence: 0.9,
        },
      }],
      [],
    );
    findFirstQueue.push({ defaultLanguage: 'en' });

    const response = await qaRoutes.request('http://localhost/answers/answer-1/promote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ pageType: 'answer' }),
    });

    expect(response.status).toBe(201);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'ko',
      }),
    );
    expect(compileQueueAdd).toHaveBeenCalledWith('embedding', {
      pageId: expect.any(String),
      workspaceId: 'workspace-1',
    });
  });
});
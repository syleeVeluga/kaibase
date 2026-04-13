import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from './openai.js';

describe('OpenAIProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omits temperature for reasoning models', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5.4',
        status: 'completed',
        output_text: '{"ok":true}',
        usage: {
          input_tokens: 1,
          output_tokens: 1,
          total_tokens: 2,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      model: 'gpt-5.4',
    });

    await provider.complete(
      [{ role: 'user', content: 'hello' }],
      { temperature: 0.2, reasoningEffort: 'low', jsonMode: true },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty('temperature');
    expect(body).toHaveProperty('reasoning');
  });

  it('keeps temperature for non-reasoning models', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        status: 'completed',
        output_text: 'ok',
        usage: {
          input_tokens: 1,
          output_tokens: 1,
          total_tokens: 2,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
    });

    await provider.complete(
      [{ role: 'user', content: 'hello' }],
      { temperature: 0.6 },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toHaveProperty('temperature', 0.6);
    expect(body).not.toHaveProperty('reasoning');
  });
});
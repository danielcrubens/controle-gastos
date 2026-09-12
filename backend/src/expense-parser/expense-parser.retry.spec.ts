import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './expense-parser.service.js';

function apiError(status: number): ApiError {
  return new ApiError({ message: `erro ${status}`, status });
}

const naoDormir = () => Promise.resolve();

describe('withRetry', () => {
  it('nao repete quando a chamada funciona de primeira', async () => {
    const call = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(call, { sleep: naoDormir })).resolves.toBe('ok');
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('repete apos 503 e retorna na proxima tentativa', async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(call, { sleep: naoDormir })).resolves.toBe('ok');
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('repete apos 429 de rate limit', async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(apiError(429))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(call, { sleep: naoDormir })).resolves.toBe('ok');
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('desiste apos 3 tentativas e repassa o ultimo erro', async () => {
    const call = vi.fn().mockRejectedValue(apiError(503));
    const action = () => withRetry(call, { sleep: naoDormir });
    await expect(action).rejects.toThrow('erro 503');
    expect(call).toHaveBeenCalledTimes(3);
  });

  it('nao repete erro nao-transitorio como 400', async () => {
    const call = vi.fn().mockRejectedValue(apiError(400));
    const action = () => withRetry(call, { sleep: naoDormir });
    await expect(action).rejects.toThrow('erro 400');
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('aplica backoff exponencial entre tentativas', async () => {
    const pausas: number[] = [];
    const call = vi
      .fn()
      .mockRejectedValueOnce(apiError(503))
      .mockRejectedValueOnce(apiError(503))
      .mockRejectedValueOnce(apiError(503));
    await expect(
      withRetry(call, {
        sleep: (ms) => {
          pausas.push(ms);
          return Promise.resolve();
        },
      }),
    ).rejects.toThrow('erro 503');
    expect(pausas).toEqual([1500, 3000]);
  });

  it('avisa onRetry com a tentativa e o erro', async () => {
    const onRetry = vi.fn();
    const call = vi
      .fn()
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValueOnce('ok');
    await withRetry(call, { sleep: naoDormir, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, 1500, expect.any(ApiError));
  });
});

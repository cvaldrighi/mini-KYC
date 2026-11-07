import { act, renderHook } from '@testing-library/react';
import type { ListVerificationsOutput, VerificationsApi } from '@/api/types';
import type { Verification } from '@/domain/verification';
import { POLLING_INTERVAL_MS, useVerifications } from './useVerifications';

function verification(id: string): Verification {
  const date = '2026-11-06T10:00:00.000Z';
  return { verificationId: id, fileName: `${id}.jpg`, status: 'PENDING', createdAt: date, updatedAt: date };
}

function page(...ids: string[]): ListVerificationsOutput {
  return { items: ids.map(verification), nextCursor: null };
}

function fakeApi(listVerifications: jest.Mock): VerificationsApi {
  return { createVerification: jest.fn(), uploadFile: jest.fn(), listVerifications };
}

/** Avança o relógio falso e deixa as promises pendentes resolverem dentro do `act`. */
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useVerifications', () => {
  it('começa carregando e depois mostra as verificações', async () => {
    const list = jest.fn().mockResolvedValue(page('a', 'b'));
    const api = fakeApi(list);
    const { result } = renderHook(() => useVerifications(api));

    expect(result.current.isLoading).toBe(true);
    await advance(0);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.verifications.map((v) => v.verificationId)).toEqual(['a', 'b']);
  });

  it('busca de novo a cada 5 segundos', async () => {
    const list = jest.fn().mockResolvedValueOnce(page('a')).mockResolvedValue(page('b', 'a'));
    const api = fakeApi(list);
    const { result } = renderHook(() => useVerifications(api));

    await advance(0);
    expect(list).toHaveBeenCalledTimes(1);

    await advance(POLLING_INTERVAL_MS);
    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current.verifications.map((v) => v.verificationId)).toEqual(['b', 'a']);
  });

  it('para de buscar quando o componente é desmontado', async () => {
    const list = jest.fn().mockResolvedValue(page('a'));
    const api = fakeApi(list);
    const { unmount } = renderHook(() => useVerifications(api));
    await advance(0);

    unmount();
    await advance(POLLING_INTERVAL_MS * 3);

    expect(list).toHaveBeenCalledTimes(1);
  });

  it('não agenda outra busca enquanto a anterior não termina', async () => {
    let resolveSlow: (value: ListVerificationsOutput) => void = () => {};
    const list = jest.fn().mockImplementationOnce(
      () => new Promise<ListVerificationsOutput>((resolve) => (resolveSlow = resolve)),
    );
    const api = fakeApi(list);
    renderHook(() => useVerifications(api));

    await advance(POLLING_INTERVAL_MS * 3);
    expect(list).toHaveBeenCalledTimes(1);

    list.mockResolvedValue(page('a'));
    await act(async () => resolveSlow(page('a')));
    await advance(POLLING_INTERVAL_MS);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('mostra o erro, continua tentando e limpa o erro quando volta a funcionar', async () => {
    const list = jest.fn().mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValue(page('a'));
    const api = fakeApi(list);
    const { result } = renderHook(() => useVerifications(api));

    await advance(0);
    expect(result.current.error?.message).toBe('falha de rede');
    expect(result.current.isLoading).toBe(false);

    await advance(POLLING_INTERVAL_MS);
    expect(result.current.error).toBeNull();
    expect(result.current.verifications).toHaveLength(1);
  });

  it('refresh busca na hora, sem esperar o próximo ciclo', async () => {
    const list = jest.fn().mockResolvedValueOnce(page('a')).mockResolvedValue(page('b', 'a'));
    const api = fakeApi(list);
    const { result } = renderHook(() => useVerifications(api));
    await advance(0);

    act(() => result.current.refresh());
    await advance(0);

    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current.verifications.map((v) => v.verificationId)).toEqual(['b', 'a']);
  });

  it('ignora a resposta antiga quando um refresh já trouxe uma mais nova', async () => {
    let resolveOld: (value: ListVerificationsOutput) => void = () => {};
    const list = jest
      .fn()
      .mockImplementationOnce(() => new Promise<ListVerificationsOutput>((resolve) => (resolveOld = resolve)))
      .mockResolvedValue(page('novo'));
    const api = fakeApi(list);
    const { result } = renderHook(() => useVerifications(api));

    act(() => result.current.refresh());
    await advance(0);
    await act(async () => resolveOld(page('antigo')));

    expect(result.current.verifications.map((v) => v.verificationId)).toEqual(['novo']);
  });
});

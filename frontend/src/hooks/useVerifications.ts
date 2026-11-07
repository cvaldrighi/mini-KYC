import { useCallback, useEffect, useRef, useState } from 'react';
import type { VerificationsApi } from '@/api/types';
import type { Verification } from '@/domain/verification';

export const POLLING_INTERVAL_MS = 5_000;
const PAGE_SIZE = 20;

interface State {
  verifications: Verification[];
  /** Verdadeiro até a primeira resposta (ou ao tentar de novo sem dados na tela). */
  isLoading: boolean;
  error: Error | null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Busca as verificações e repete a busca a cada `intervalMs`.
 *
 * - A próxima busca só é agendada quando a anterior termina (setTimeout encadeado, e não
 *   setInterval). Assim, uma resposta lenta não acumula requisições.
 * - Cada busca recebe um número; só a mais recente atualiza o estado e agenda a próxima.
 *   Isso evita que uma resposta antiga sobrescreva uma nova depois de um `refresh()`.
 * - Ao desmontar, o timer é cancelado e respostas que ainda chegarem são ignoradas.
 *
 * `api` deve ser uma referência estável (definida fora do componente); se mudar a cada
 * renderização, o efeito reinicia o polling toda vez.
 */
export function useVerifications(
  api: VerificationsApi,
  { intervalMs = POLLING_INTERVAL_MS }: { intervalMs?: number } = {},
) {
  const [state, setState] = useState<State>({ verifications: [], isLoading: true, error: null });
  const loadNowRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      const request = ++latestRequest;
      clearTimeout(timer);
      try {
        const { items } = await api.listVerifications({ limit: PAGE_SIZE });
        if (!active || request !== latestRequest) return;
        setState({ verifications: items, isLoading: false, error: null });
      } catch (error) {
        if (!active || request !== latestRequest) return;
        setState((previous) => ({ ...previous, isLoading: false, error: toError(error) }));
      } finally {
        if (active && request === latestRequest) {
          timer = setTimeout(load, intervalMs);
        }
      }
    }

    loadNowRef.current = () => {
      setState((previous) =>
        previous.verifications.length === 0 ? { ...previous, isLoading: true, error: null } : previous,
      );
      void load();
    };
    void load();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, intervalMs]);

  /** Busca agora, sem esperar o próximo ciclo (depois de um envio ou em "Tentar de novo"). */
  const refresh = useCallback(() => loadNowRef.current(), []);

  return { ...state, refresh };
}

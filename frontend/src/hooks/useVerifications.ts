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
 * Busca as verificações e repete a busca a cada `intervalMs`, mas só enquanto for útil
 * (polling adaptativo, ver openspec/changes/add-adaptive-polling):
 * - continua enquanto houver alguma verificação PENDING (o status ainda vai mudar) ou se a
 *   última busca falhou (para se recuperar sozinho);
 * - para quando tudo está concluído; `refresh()` (chamado depois de um envio) retoma;
 * - com a aba em segundo plano, não busca; ao voltar para a aba, busca na hora.
 *
 * Detalhes que continuam valendo:
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

    /** Busca agendada: com a aba oculta não faz nada; o retorno à aba busca na hora. */
    function scheduledLoad() {
      if (document.visibilityState === 'hidden') return;
      void load();
    }

    async function load() {
      const request = ++latestRequest;
      clearTimeout(timer);
      let keepPolling = false;
      try {
        const { items } = await api.listVerifications({ limit: PAGE_SIZE });
        if (!active || request !== latestRequest) return;
        setState({ verifications: items, isLoading: false, error: null });
        keepPolling = items.some((verification) => verification.status === 'PENDING');
      } catch (error) {
        if (!active || request !== latestRequest) return;
        setState((previous) => ({ ...previous, isLoading: false, error: toError(error) }));
        keepPolling = true; // tenta de novo até a busca voltar a funcionar
      } finally {
        if (active && request === latestRequest && keepPolling) {
          timer = setTimeout(scheduledLoad, intervalMs);
        }
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void load();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

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
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [api, intervalMs]);

  /** Busca agora, sem esperar o próximo ciclo (depois de um envio ou em "Tentar de novo"). */
  const refresh = useCallback(() => loadNowRef.current(), []);

  return { ...state, refresh };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/errors';
import type { VerificationsApi } from '@/api/types';
import { isAbortError } from '@/lib/abortError';
import { validateFile } from '@/lib/validateFile';

export type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'done'; verificationId: string }
  | { phase: 'error'; message: string };

type Step = 'create' | 'upload';

function errorMessage(step: Step, error: unknown): string {
  if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
    return 'Sem conexão com a internet. Confira a rede e tente de novo.';
  }
  if (error instanceof ApiError && error.code === 'UNSUPPORTED_CONTENT_TYPE') {
    return 'Este tipo de arquivo não é aceito. Envie um JPEG, PNG ou PDF.';
  }
  return step === 'create'
    ? 'Não foi possível iniciar o envio. Tente de novo.'
    : 'O envio do arquivo foi interrompido. Tente de novo.';
}

/**
 * Fluxo de envio: cria a verificação, recebe a URL de upload e envia o arquivo direto
 * para o armazenamento, acompanhando o progresso. Se o componente sair da tela no meio
 * do envio, o upload é cancelado.
 */
export function useUpload(api: VerificationsApi, { onUploaded }: { onUploaded?: (verificationId: string) => void } = {}) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);
  // Guarda a versão mais recente do callback sem precisar recriar `upload` quando ele muda.
  // A atualização fica num efeito porque o React desaconselha alterar refs durante a renderização.
  const onUploadedRef = useRef(onUploaded);
  useEffect(() => {
    onUploadedRef.current = onUploaded;
  });

  useEffect(() => () => controllerRef.current?.abort(), []);

  const upload = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setState({ phase: 'error', message: validation.message });
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ phase: 'uploading', progress: 0 });

      let step: Step = 'create';
      try {
        const { verificationId, uploadUrl } = await api.createVerification({
          fileName: file.name,
          contentType: validation.contentType,
        });
        step = 'upload';
        await api.uploadFile(uploadUrl, file, {
          signal: controller.signal,
          onProgress: (percent) => setState({ phase: 'uploading', progress: Math.round(percent) }),
        });
        setState({ phase: 'done', verificationId });
        onUploadedRef.current?.(verificationId);
      } catch (error) {
        if (isAbortError(error)) {
          // Cancelado por nós (outro envio começou ou o componente saiu da tela): volta ao início.
          setState({ phase: 'idle' });
          return;
        }
        setState({ phase: 'error', message: errorMessage(step, error) });
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [api],
  );

  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return { state, upload, reset };
}

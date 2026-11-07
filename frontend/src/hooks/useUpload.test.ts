import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/api/errors';
import type { VerificationsApi } from '@/api/types';
import { useUpload } from './useUpload';

const file = new File(['conteúdo'], 'cnh.jpg', { type: 'image/jpeg' });

function fakeApi(overrides: Partial<VerificationsApi> = {}): VerificationsApi {
  return {
    createVerification: jest.fn().mockResolvedValue({ verificationId: 'v1', uploadUrl: 'https://s3.test/v1', expiresIn: 300 }),
    uploadFile: jest.fn().mockResolvedValue(undefined),
    listVerifications: jest.fn(),
    ...overrides,
  };
}

describe('useUpload', () => {
  it('cria a verificação, envia o arquivo e avisa quando termina', async () => {
    const api = fakeApi();
    const onUploaded = jest.fn();
    const { result } = renderHook(() => useUpload(api, { onUploaded }));

    await act(() => result.current.upload(file));

    expect(api.createVerification).toHaveBeenCalledWith({ fileName: 'cnh.jpg', contentType: 'image/jpeg' });
    expect(api.uploadFile).toHaveBeenCalledWith('https://s3.test/v1', file, expect.any(Object));
    expect(result.current.state).toEqual({ phase: 'done', verificationId: 'v1' });
    expect(onUploaded).toHaveBeenCalledWith('v1');
  });

  it('atualiza o progresso durante o envio', async () => {
    let reportProgress: (percent: number) => void = () => {};
    let finishUpload: () => void = () => {};
    const api = fakeApi({
      uploadFile: jest.fn((_url, _file, options) => {
        reportProgress = options?.onProgress ?? reportProgress;
        return new Promise<void>((resolve) => (finishUpload = resolve));
      }),
    });
    const { result } = renderHook(() => useUpload(api));

    let uploading: Promise<void> = Promise.resolve();
    act(() => {
      uploading = result.current.upload(file);
    });
    expect(result.current.state).toEqual({ phase: 'uploading', progress: 0 });
    await waitFor(() => expect(api.uploadFile).toHaveBeenCalled());

    await act(async () => reportProgress(63.4));
    expect(result.current.state).toEqual({ phase: 'uploading', progress: 63 });

    await act(async () => {
      finishUpload();
      await uploading;
    });
    expect(result.current.state.phase).toBe('done');
  });

  it('diz que não conseguiu iniciar quando a criação falha', async () => {
    const api = fakeApi({ createVerification: jest.fn().mockRejectedValue(new ApiError('INVALID_REQUEST')) });
    const { result } = renderHook(() => useUpload(api));

    await act(() => result.current.upload(file));

    expect(result.current.state).toEqual({ phase: 'error', message: 'Não foi possível iniciar o envio. Tente de novo.' });
    expect(api.uploadFile).not.toHaveBeenCalled();
  });

  it('diz que o envio foi interrompido quando o upload falha', async () => {
    const api = fakeApi({ uploadFile: jest.fn().mockRejectedValue(new ApiError('UPLOAD_FAILED')) });
    const onUploaded = jest.fn();
    const { result } = renderHook(() => useUpload(api, { onUploaded }));

    await act(() => result.current.upload(file));

    expect(result.current.state).toEqual({ phase: 'error', message: 'O envio do arquivo foi interrompido. Tente de novo.' });
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('não chama a API para arquivos inválidos', async () => {
    const api = fakeApi();
    const { result } = renderHook(() => useUpload(api));

    await act(() => result.current.upload(new File(['x'], 'doc.gif', { type: 'image/gif' })));

    expect(result.current.state).toEqual({ phase: 'error', message: 'Envie um arquivo JPEG, PNG ou PDF.' });
    expect(api.createVerification).not.toHaveBeenCalled();
  });

  it('cancela o envio quando o componente sai da tela', async () => {
    let receivedSignal: AbortSignal | undefined;
    const api = fakeApi({
      uploadFile: jest.fn((_url, _file, options) => {
        receivedSignal = options?.signal;
        return new Promise<void>(() => {});
      }),
    });
    const { result, unmount } = renderHook(() => useUpload(api));

    act(() => {
      void result.current.upload(file);
    });
    await waitFor(() => expect(api.uploadFile).toHaveBeenCalled());
    unmount();

    expect(receivedSignal?.aborted).toBe(true);
  });
});

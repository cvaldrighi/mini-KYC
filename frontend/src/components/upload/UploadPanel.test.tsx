import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ApiError } from '@/api/errors';
import type { VerificationsApi } from '@/api/types';
import { UploadPanel } from './UploadPanel';

jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));

const file = new File(['conteúdo'], 'cnh.jpg', { type: 'image/jpeg' });

function fakeApi(overrides: Partial<VerificationsApi> = {}): VerificationsApi {
  return {
    createVerification: jest
      .fn()
      .mockResolvedValue({ verificationId: 'v1', uploadUrl: 'https://s3.test/v1', expiresIn: 300 }),
    uploadFile: jest.fn().mockResolvedValue(undefined),
    listVerifications: jest.fn(),
    ...overrides,
  };
}

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.mocked(toast.success).mockClear();
});

async function chooseFile() {
  await userEvent.upload(screen.getByLabelText('Escolher arquivo do documento'), file);
}

describe('UploadPanel', () => {
  it('deixa o botão desabilitado até escolher um arquivo', async () => {
    render(<UploadPanel api={fakeApi()} onUploaded={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Enviar documento' });

    expect(button).toBeDisabled();
    await chooseFile();
    expect(button).toBeEnabled();
  });

  it('envia, mostra a notificação, limpa o arquivo e atualiza a lista', async () => {
    const onUploaded = jest.fn();
    render(<UploadPanel api={fakeApi()} onUploaded={onUploaded} />);

    await chooseFile();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith('Documento enviado');
    expect(screen.queryByText('cnh.jpg')).not.toBeInTheDocument();
  });

  it('mostra a barra de progresso durante o envio', async () => {
    let reportProgress: (percent: number) => void = () => {};
    const api = fakeApi({
      uploadFile: jest.fn((_url, _file, options) => {
        reportProgress = options?.onProgress ?? reportProgress;
        return new Promise<void>(() => {});
      }),
    });
    render(<UploadPanel api={api} onUploaded={jest.fn()} />);

    await chooseFile();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));
    await waitFor(() => expect(api.uploadFile).toHaveBeenCalled());
    act(() => reportProgress(40));

    expect(await screen.findByRole('progressbar', { name: 'Progresso do envio' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });

  it('mantém o arquivo e permite tentar de novo quando o envio falha', async () => {
    const uploadFile = jest
      .fn()
      .mockRejectedValueOnce(new ApiError('UPLOAD_FAILED'))
      .mockResolvedValueOnce(undefined);
    const onUploaded = jest.fn();
    render(<UploadPanel api={fakeApi({ uploadFile })} onUploaded={onUploaded} />);

    await chooseFile();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('O envio do arquivo foi interrompido');
    expect(screen.getByText('cnh.jpg')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
  });
});

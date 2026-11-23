import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Verification } from '@/domain/verification';
import { VerificationSheet } from './VerificationSheet';

const rejected: Verification = {
  verificationId: '7f3c2a91',
  fileName: 'cnh-scan.jpg',
  status: 'REJECTED',
  reason: 'LOW_RESOLUTION',
  createdAt: '2026-11-06T13:42:07.000Z',
  updatedAt: '2026-11-06T13:42:08.000Z',
  checks: [
    { name: 'size', outcome: 'PASS', durationMs: 1, details: { sizeBytes: 214 * 1024 } },
    { name: 'fileType', outcome: 'PASS', durationMs: 3, details: { detectedType: 'image/jpeg' } },
    { name: 'resolution', outcome: 'REJECT', reason: 'LOW_RESOLUTION', durationMs: 12, details: { width: 520, height: 340 } },
  ],
};

function renderSheet(verification: Verification = rejected) {
  const onOpenChange = jest.fn();
  const onSendAnother = jest.fn();
  render(
    <VerificationSheet verification={verification} open onOpenChange={onOpenChange} onSendAnother={onSendAnother} />,
  );
  return { onOpenChange, onSendAnother };
}

describe('VerificationSheet', () => {
  it('mostra o arquivo, o motivo explicado e as checagens', () => {
    renderSheet();

    const dialog = screen.getByRole('dialog', { name: 'cnh-scan.jpg' });
    expect(dialog).toHaveTextContent('Reprovado');
    expect(dialog).toHaveTextContent('Resolução abaixo do mínimo');
    expect(dialog).toHaveAccessibleDescription(/A imagem tem 520 × 340 pixels\. O mínimo é 600 × 400\./);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('fecha com Esc', async () => {
    const { onOpenChange } = renderSheet();

    await userEvent.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('fecha pelo botão de fechar', async () => {
    const { onOpenChange } = renderSheet();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar detalhe' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('oferece "Enviar outra foto" para reprovadas', async () => {
    const { onSendAnother } = renderSheet();

    await userEvent.click(screen.getByRole('button', { name: 'Enviar outra foto' }));

    expect(onSendAnother).toHaveBeenCalledTimes(1);
  });

  it.each(['APPROVED', 'PENDING', 'MANUAL_REVIEW'] as const)('não mostra o botão quando o status é %s', (status) => {
    renderSheet({ ...rejected, status, reason: status === 'MANUAL_REVIEW' ? 'SUSPECTED_EDIT' : undefined });

    expect(screen.queryByRole('button', { name: 'Enviar outra foto' })).not.toBeInTheDocument();
  });

  it('explica que está em análise e não mostra a data de conclusão', () => {
    renderSheet({ ...rejected, status: 'PENDING', reason: undefined, checks: undefined });

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/As checagens estão em andamento/);
    expect(screen.queryByText('Concluído em')).not.toBeInTheDocument();
  });
});

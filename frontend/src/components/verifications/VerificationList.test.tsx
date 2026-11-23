import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Verification } from '@/domain/verification';
import { VerificationList } from './VerificationList';

const NOW = new Date('2026-11-06T12:00:00.000Z');

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

const verifications: Verification[] = [
  {
    verificationId: '1',
    fileName: 'rg-frente.jpg',
    status: 'PENDING',
    createdAt: minutesAgo(0),
    updatedAt: minutesAgo(0),
  },
  {
    verificationId: '2',
    fileName: 'rg-verso.png',
    status: 'REJECTED',
    reason: 'DUPLICATE_DOCUMENT',
    createdAt: minutesAgo(4),
    updatedAt: minutesAgo(4),
  },
];

function renderList(props: Partial<Parameters<typeof VerificationList>[0]> = {}) {
  const onRetry = jest.fn();
  const onSelect = jest.fn();
  render(
    <VerificationList
      verifications={[]}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { onRetry, onSelect };
}

describe('VerificationList', () => {
  it('mostra o esqueleto enquanto carrega', () => {
    renderList({ isLoading: true });

    expect(screen.getByText('Carregando verificações')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('mostra a lista com nome, motivo, data relativa e status', () => {
    jest.useFakeTimers({ now: NOW });
    renderList({ verifications });

    const items = within(screen.getByRole('list', { name: 'Verificações enviadas' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    expect(within(items[0]).getByText('rg-frente.jpg')).toBeInTheDocument();
    expect(within(items[0]).getByText('Em análise')).toBeInTheDocument();
    expect(within(items[0]).getAllByText('agora').length).toBeGreaterThan(0);

    expect(within(items[1]).getByText('Documento duplicado')).toBeInTheDocument();
    expect(within(items[1]).getByText('Reprovado')).toBeInTheDocument();
    expect(within(items[1]).getAllByText('há 4 min').length).toBeGreaterThan(0);
    jest.useRealTimers();
  });

  it('abre o detalhe ao clicar na linha', async () => {
    const { onSelect } = renderList({ verifications });

    await userEvent.click(screen.getByRole('button', { name: /rg-verso\.png/ }));

    expect(onSelect).toHaveBeenCalledWith(verifications[1], expect.any(HTMLButtonElement));
  });

  it('mostra o estado vazio', () => {
    renderList();

    expect(screen.getByText('Nenhuma verificação ainda')).toBeInTheDocument();
  });

  it('mostra o erro e tenta de novo quando não há dados', async () => {
    const { onRetry } = renderList({ error: new Error('falha') });

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as verificações');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('mantém a lista e mostra um aviso quando a atualização falha', () => {
    renderList({ verifications, error: new Error('falha') });

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível atualizar agora');
  });
});

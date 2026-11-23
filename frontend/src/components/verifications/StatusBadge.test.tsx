import { render, screen } from '@testing-library/react';
import type { VerificationStatus } from '@/domain/verification';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each<[VerificationStatus, string, string]>([
    ['PENDING', 'Em análise', 'text-status-pending'],
    ['APPROVED', 'Aprovado', 'text-status-approved'],
    ['REJECTED', 'Reprovado', 'text-status-rejected'],
    ['MANUAL_REVIEW', 'Em revisão', 'text-status-review'],
  ])('mostra %s como "%s" com a cor do status', (status, label, colorClass) => {
    render(<StatusBadge status={status} />);

    const badge = screen.getByText(label);
    expect(badge).toHaveClass(colorClass);
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

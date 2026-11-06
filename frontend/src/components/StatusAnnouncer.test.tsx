import { render, screen } from '@testing-library/react';
import type { Verification, VerificationStatus } from '@/domain/verification';
import { StatusAnnouncer } from './StatusAnnouncer';

function verification(id: string, fileName: string, status: VerificationStatus): Verification {
  const date = '2026-11-06T10:00:00.000Z';
  return { verificationId: id, fileName, status, createdAt: date, updatedAt: date };
}

describe('StatusAnnouncer', () => {
  it('não anuncia nada na primeira renderização', () => {
    render(<StatusAnnouncer verifications={[verification('1', 'cnh.jpg', 'APPROVED')]} />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('anuncia quando uma verificação sai de "Em análise"', () => {
    const { rerender } = render(
      <StatusAnnouncer verifications={[verification('1', 'cnh-frente.jpg', 'PENDING')]} />,
    );

    rerender(<StatusAnnouncer verifications={[verification('1', 'cnh-frente.jpg', 'APPROVED')]} />);

    expect(screen.getByRole('status')).toHaveTextContent('cnh-frente.jpg: Aprovado');
  });

  it('não anuncia enquanto a verificação continua em análise', () => {
    const { rerender } = render(
      <StatusAnnouncer verifications={[verification('1', 'rg.jpg', 'PENDING')]} />,
    );

    rerender(<StatusAnnouncer verifications={[verification('1', 'rg.jpg', 'PENDING')]} />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('anuncia várias verificações concluídas juntas', () => {
    const { rerender } = render(
      <StatusAnnouncer
        verifications={[verification('1', 'a.jpg', 'PENDING'), verification('2', 'b.jpg', 'PENDING')]}
      />,
    );

    rerender(
      <StatusAnnouncer
        verifications={[verification('1', 'a.jpg', 'REJECTED'), verification('2', 'b.jpg', 'MANUAL_REVIEW')]}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('a.jpg: Reprovado. b.jpg: Em revisão');
  });
});

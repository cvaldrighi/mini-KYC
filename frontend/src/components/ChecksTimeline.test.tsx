import { render, screen, within } from '@testing-library/react';
import type { CheckResult } from '@/domain/verification';
import { ChecksTimeline } from './ChecksTimeline';

const rejectedByResolution: CheckResult[] = [
  { name: 'size', outcome: 'PASS', durationMs: 1, details: { sizeBytes: 214 * 1024 } },
  { name: 'fileType', outcome: 'PASS', durationMs: 3, details: { detectedType: 'image/jpeg' } },
  { name: 'resolution', outcome: 'REJECT', reason: 'LOW_RESOLUTION', durationMs: 12, details: { width: 520, height: 340 } },
];

function steps() {
  return within(screen.getByRole('list')).getAllByRole('listitem');
}

describe('ChecksTimeline', () => {
  it('mostra as que passaram, a que reprovou e as que não foram executadas', () => {
    render(<ChecksTimeline checks={rejectedByResolution} isPending={false} />);
    const [size, fileType, resolution, duplicate, editSignals] = steps();

    expect(size).toHaveTextContent('Tamanho do arquivo');
    expect(size).toHaveTextContent('214 KB');
    expect(size).toHaveTextContent('Passou');
    expect(fileType).toHaveTextContent('JPEG');
    expect(resolution).toHaveTextContent('520 × 340 px');
    expect(resolution).toHaveTextContent('Reprovou');
    expect(duplicate).toHaveTextContent('Não executada');
    expect(editSignals).toHaveTextContent('Não executada');
  });

  it('mostra todas como aguardando enquanto a verificação está em análise', () => {
    render(<ChecksTimeline isPending />);

    expect(steps()).toHaveLength(5);
    steps().forEach((step) => expect(step).toHaveTextContent('Aguardando'));
  });

  it('cita o programa de edição na checagem que pediu revisão', () => {
    render(
      <ChecksTimeline
        isPending={false}
        checks={[
          ...rejectedByResolution.slice(0, 2),
          { name: 'resolution', outcome: 'PASS', durationMs: 12, details: { width: 1600, height: 1010 } },
          { name: 'duplicate', outcome: 'PASS', durationMs: 18 },
          { name: 'editSignals', outcome: 'REVIEW', reason: 'SUSPECTED_EDIT', durationMs: 6, details: { software: 'GIMP 2.10' } },
        ]}
      />,
    );

    expect(steps()[4]).toHaveTextContent('Editado com GIMP 2.10');
    expect(steps()[4]).toHaveTextContent('Revisão');
    expect(screen.getByText('Arquivo ainda não enviado')).toBeInTheDocument();
  });
});

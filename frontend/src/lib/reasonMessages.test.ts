import type { CheckResult, Reason } from '@/domain/verification';
import { getReasonMessage, REASON_TITLES } from './reasonMessages';

function failedCheck(name: CheckResult['name'], reason: Reason, details?: CheckResult['details']): CheckResult {
  return { name, outcome: 'REJECT', reason, durationMs: 5, details };
}

describe('getReasonMessage', () => {
  it('explica a resolução com as medidas da imagem', () => {
    const message = getReasonMessage('LOW_RESOLUTION', [
      { name: 'size', outcome: 'PASS', durationMs: 1, details: { sizeBytes: 214_000 } },
      failedCheck('resolution', 'LOW_RESOLUTION', { width: 520, height: 340 }),
    ]);

    expect(message).toEqual({
      title: 'Resolução abaixo do mínimo',
      explanation:
        'A imagem tem 520 × 340 pixels. O mínimo é 600 × 400. Envie uma foto mais nítida, com o documento ocupando a maior parte da imagem.',
    });
  });

  it('explica o tamanho com o valor medido', () => {
    const message = getReasonMessage('FILE_TOO_SMALL', [failedCheck('size', 'FILE_TOO_SMALL', { sizeBytes: 4 * 1024 })]);

    expect(message.explanation).toContain('O arquivo tem 4 KB, abaixo do mínimo de 10 KB.');
  });

  it('cita o programa de edição encontrado', () => {
    const message = getReasonMessage('SUSPECTED_EDIT', [
      { name: 'editSignals', outcome: 'REVIEW', reason: 'SUSPECTED_EDIT', durationMs: 6, details: { software: 'GIMP 2.10' } },
    ]);

    expect(message.explanation).toBe('A imagem tem marcas de edição (GIMP 2.10). Ela vai passar por uma revisão manual.');
  });

  it('usa uma frase sem números quando não há valores medidos', () => {
    const message = getReasonMessage('LOW_RESOLUTION');

    expect(message.explanation).toBe(
      'A imagem tem menos de 600 × 400 pixels. Envie uma foto mais nítida, com o documento ocupando a maior parte da imagem.',
    );
  });

  it.each(Object.keys(REASON_TITLES) as Reason[])('tem título e explicação para %s', (reason) => {
    const message = getReasonMessage(reason);

    expect(message.title).not.toBe('');
    expect(message.explanation).not.toBe('');
  });
});

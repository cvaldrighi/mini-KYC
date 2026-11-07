import { formatRelativeTime } from './formatRelativeTime';

const now = new Date('2026-11-06T12:00:00.000Z');

function ago(ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}

describe('formatRelativeTime', () => {
  it.each([
    [0, 'agora'],
    [59_000, 'agora'],
    [60_000, 'há 1 min'],
    [25 * 60_000, 'há 25 min'],
    [2 * 3_600_000, 'há 2 h'],
  ])('%i ms atrás vira "%s"', (elapsed, expected) => {
    expect(formatRelativeTime(ago(elapsed), now)).toBe(expected);
  });

  it('mostra dia e mês depois de 24 horas', () => {
    expect(formatRelativeTime('2026-11-04T15:00:00.000Z', now)).toBe('04/11');
  });

  it('trata datas no futuro (relógio adiantado) como "agora"', () => {
    expect(formatRelativeTime(ago(-30_000), now)).toBe('agora');
  });
});

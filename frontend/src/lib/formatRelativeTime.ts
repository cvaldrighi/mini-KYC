const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/**
 * Data relativa curta: "agora", "há 3 min", "há 2 h". Depois de um dia, "06/11".
 * `now` é parâmetro para facilitar os testes.
 */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  const elapsed = now.getTime() - date.getTime();

  if (elapsed < MINUTE) return 'agora';
  if (elapsed < HOUR) return `há ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `há ${Math.floor(elapsed / HOUR)} h`;
  return dateFormatter.format(date);
}

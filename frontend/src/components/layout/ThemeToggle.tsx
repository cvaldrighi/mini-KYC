import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
      className="inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {isDark ? <Sun aria-hidden className="size-[18px]" /> : <Moon aria-hidden className="size-[18px]" />}
    </button>
  );
}

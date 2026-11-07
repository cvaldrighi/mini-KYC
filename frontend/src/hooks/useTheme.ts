import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '@/lib/storage';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function readSavedTheme(): Theme | null {
  const saved = readStorage(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : null;
}

/** O `index.html` já aplicou a classe `dark` antes do React carregar; partimos dela. */
function readCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Tema claro ou escuro. Segue o sistema até a pessoa escolher um;
 * depois disso, a escolha fica salva no navegador.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readCurrentTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      if (readSavedTheme()) return;
      setTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    // Se o navegador bloquear o armazenamento, o tema muda mesmo assim, só não fica salvo.
    writeStorage(STORAGE_KEY, next);
  }

  return { theme, toggleTheme };
}

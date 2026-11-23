import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

describe('ThemeToggle', () => {
  it('troca para o tema escuro e salva a escolha', async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Usar tema escuro' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Usar tema claro' })).toBeInTheDocument();
  });

  it('começa pelo tema que o index.html já aplicou', () => {
    document.documentElement.classList.add('dark');

    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Usar tema claro' })).toBeInTheDocument();
  });

  it('volta para o tema claro', async () => {
    document.documentElement.classList.add('dark');
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Usar tema claro' }));

    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

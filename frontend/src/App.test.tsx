import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('mostra as seções de envio e de verificações', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Enviar documento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Verificações' })).toBeInTheDocument();
  });

  it('tem o botão de troca de tema no cabeçalho', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /usar tema/i })).toBeInTheDocument();
  });
});

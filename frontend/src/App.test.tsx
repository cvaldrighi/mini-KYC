import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('mostra o título da página de envio', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Enviar documento' })).toBeInTheDocument();
  });
});

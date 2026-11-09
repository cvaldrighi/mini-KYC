import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});

describe('App', () => {
  it('mostra as seções de envio e de verificações', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Enviar documento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Verificações' })).toBeInTheDocument();
  });

  it('avisa que é uma demonstração no modo mock', () => {
    render(<App />);

    expect(screen.getByRole('note')).toHaveTextContent('Demonstração com dados simulados.');
  });

  it('tem o botão de troca de tema no cabeçalho', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /usar tema/i })).toBeInTheDocument();
  });

  it('abre o detalhe pela lista e devolve o foco para a linha ao fechar com Esc', async () => {
    render(<App />);
    const row = await screen.findByRole('button', { name: /cnh-frente\.jpg/ });

    await userEvent.click(row);
    expect(await screen.findByRole('dialog', { name: 'cnh-frente.jpg' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(row).toHaveFocus();
  });

  it('em "Enviar outra foto", leva o foco para a área de envio e abre o seletor', async () => {
    const openPicker = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /cnh-baixa-resolucao\.jpg/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar outra foto' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('group', { name: 'Área de envio do documento' })).toHaveFocus();
    expect(openPicker).toHaveBeenCalled();
    openPicker.mockRestore();
  });
});

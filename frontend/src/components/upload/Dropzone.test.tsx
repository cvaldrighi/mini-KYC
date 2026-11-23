import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropzone } from './Dropzone';

function makeFile(name: string, type: string, size = 20_000): File {
  const file = new File(['conteúdo'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderDropzone(file: File | null = null) {
  const onFileSelect = jest.fn();
  const onClear = jest.fn();
  render(<Dropzone file={file} onFileSelect={onFileSelect} onClear={onClear} />);
  return { onFileSelect, onClear };
}

beforeAll(() => {
  // O jsdom não implementa URLs de blob; a FilePreview usa para a miniatura.
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});

// `applyAccept: false` deixa o teste enviar arquivos que o atributo `accept` filtraria,
// para verificar a nossa própria validação.
const user = userEvent.setup({ applyAccept: false });

describe('Dropzone', () => {
  it('entrega um arquivo válido escolhido pelo seletor', async () => {
    const { onFileSelect } = renderDropzone();
    const file = makeFile('cnh.jpg', 'image/jpeg');

    await user.upload(screen.getByLabelText('Escolher arquivo do documento'), file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explica o erro e não entrega arquivos de outro tipo', async () => {
    const { onFileSelect } = renderDropzone();

    await user.upload(screen.getByLabelText('Escolher arquivo do documento'), makeFile('doc.heic', 'image/heic'));

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Envie um arquivo JPEG, PNG ou PDF.');
  });

  it('recusa arquivos maiores que 5 MB', async () => {
    const { onFileSelect } = renderDropzone();

    await user.upload(
      screen.getByLabelText('Escolher arquivo do documento'),
      makeFile('grande.jpg', 'image/jpeg', 6 * 1024 * 1024),
    );

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('O limite é 5 MB.');
  });

  it('muda de aparência ao arrastar e aceita o arquivo solto', () => {
    const { onFileSelect } = renderDropzone();
    const zone = screen.getByRole('group', { name: 'Área de envio do documento' });
    const file = makeFile('rg.png', 'image/png');

    fireEvent.dragOver(zone, { dataTransfer: { files: [file] } });
    expect(zone).toHaveAttribute('data-dragging');

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(zone).not.toHaveAttribute('data-dragging');
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('tem o input da câmera traseira para celular', () => {
    renderDropzone();

    expect(screen.getByLabelText('Tirar foto do documento')).toHaveAttribute('capture', 'environment');
  });

  it('mostra a prévia do arquivo escolhido e permite remover', async () => {
    const { onClear } = renderDropzone(makeFile('cnh.jpg', 'image/jpeg', 1.8 * 1024 * 1024));

    expect(screen.getByText('cnh.jpg')).toBeInTheDocument();
    expect(screen.getByText('1,8 MB')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover cnh.jpg' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

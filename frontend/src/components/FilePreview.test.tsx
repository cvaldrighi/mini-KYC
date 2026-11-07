import { render } from '@testing-library/react';
import { FilePreview } from './FilePreview';

beforeEach(() => {
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});

describe('FilePreview', () => {
  it('mostra a miniatura de imagens e libera a URL ao sair da tela', () => {
    const file = new File(['x'], 'cnh.jpg', { type: 'image/jpeg' });
    const { container, unmount } = render(<FilePreview file={file} onRemove={jest.fn()} />);

    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:preview');

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('mostra um ícone no lugar da miniatura para PDF', () => {
    const file = new File(['x'], 'comprovante.pdf', { type: 'application/pdf' });
    const { container } = render(<FilePreview file={file} onRemove={jest.fn()} />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

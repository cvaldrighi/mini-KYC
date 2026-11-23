import { render } from '@testing-library/react';
import { GuillochePattern } from './GuillochePattern';

describe('GuillochePattern', () => {
  it('fica escondido de leitores de tela', () => {
    const { container } = render(<GuillochePattern />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('usa um id de padrão diferente em cada instância', () => {
    const { container } = render(
      <>
        <GuillochePattern />
        <GuillochePattern />
      </>,
    );

    const ids = Array.from(container.querySelectorAll('pattern')).map((pattern) => pattern.id);
    expect(new Set(ids).size).toBe(2);
    ids.forEach((id) => expect(container.querySelector(`rect[fill="url(#${id})"]`)).not.toBeNull());
  });
});

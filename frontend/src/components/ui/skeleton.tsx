import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton (baseado no do shadcn/ui), com efeito shimmer: um pseudo-elemento `::before`
 * com gradiente atravessa o bloco da esquerda para a direita, em loop (keyframe `shimmer`).
 * Com "reduzir movimento" ligado no sistema, a faixa some e o bloco fica estático.
 */
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'before:absolute before:inset-0 before:animate-shimmer',
        'before:bg-linear-to-r before:from-transparent before:via-shimmer before:to-transparent',
        'motion-reduce:before:hidden',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

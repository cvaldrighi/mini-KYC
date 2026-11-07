import { cn } from '@/lib/utils';

interface ProgressProps {
  /** De 0 a 100. */
  value: number;
  label: string;
  className?: string;
}

/** Barra de progresso acessível (mesma API visual do Progress do shadcn/ui, sem Radix). */
export function Progress({ value, label, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('h-1.5 overflow-hidden rounded-full bg-secondary', className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${clamped}%` }} />
    </div>
  );
}

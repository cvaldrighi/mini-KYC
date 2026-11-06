import { Check, Eye, LoaderCircle, X, type LucideIcon } from 'lucide-react';
import type { VerificationStatus } from '@/domain/verification';
import { cn } from '@/lib/utils';

export const STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  MANUAL_REVIEW: 'Em revisão',
};

const STATUS_STYLES: Record<VerificationStatus, { icon: LucideIcon; className: string }> = {
  PENDING: {
    icon: LoaderCircle,
    className: 'border-status-pending-border bg-status-pending-bg text-status-pending',
  },
  APPROVED: {
    icon: Check,
    className: 'border-status-approved-border bg-status-approved-bg text-status-approved',
  },
  REJECTED: {
    icon: X,
    className: 'border-status-rejected-border bg-status-rejected-bg text-status-rejected',
  },
  MANUAL_REVIEW: {
    icon: Eye,
    className: 'border-status-review-border bg-status-review-bg text-status-review',
  },
};

interface StatusBadgeProps {
  status: VerificationStatus;
  size?: 'default' | 'large';
  className?: string;
}

/** Rótulo de status: texto, ícone e cor. A cor nunca é a única informação. */
export function StatusBadge({ status, size = 'default', className }: StatusBadgeProps) {
  const { icon: Icon, className: colors } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-semibold whitespace-nowrap',
        size === 'large' ? 'px-3 py-1.5 text-[15px]' : 'px-2.5 py-1 text-[13px]',
        colors,
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={2.5} className={size === 'large' ? 'size-[18px]' : 'size-3.5'} />
      {STATUS_LABELS[status]}
    </span>
  );
}

import { FileImage, FileText } from 'lucide-react';
import type { Verification } from '@/domain/verification';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { REASON_TITLES } from '@/lib/reasonMessages';
import { StatusBadge } from './StatusBadge';

/** Colunas compartilhadas pelo cabeçalho e pelas linhas no desktop. */
export const ROW_GRID = 'sm:grid sm:grid-cols-[minmax(0,1fr)_110px_170px] sm:gap-4';

export function VerificationRow({ verification }: { verification: Verification }) {
  const { fileName, status, reason, createdAt } = verification;
  const Icon = fileName.toLowerCase().endsWith('.pdf') ? FileText : FileImage;
  const sentAt = (
    <time dateTime={createdAt} title={new Date(createdAt).toLocaleString('pt-BR')}>
      {formatRelativeTime(createdAt)}
    </time>
  );

  return (
    <li className="border-b border-border">
      <div className={`flex items-center gap-3 px-1 py-3.5 sm:items-center sm:px-3 sm:py-4 ${ROW_GRID}`}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{fileName}</span>
            {reason && <span className="text-[13px] text-muted-foreground">{REASON_TITLES[reason]}</span>}
            <span className="text-[13px] text-muted-foreground sm:hidden">{sentAt}</span>
          </div>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:block">{sentAt}</span>
        <div className="shrink-0">
          <StatusBadge status={status} />
        </div>
      </div>
    </li>
  );
}

import { FileImage, FileText } from 'lucide-react';
import type { Verification } from '@/domain/verification';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { REASON_TITLES } from '@/lib/reasonMessages';
import { StatusBadge } from './StatusBadge';

/** Colunas compartilhadas pelo cabeçalho e pelas linhas no desktop. */
export const ROW_GRID = 'sm:grid sm:grid-cols-[minmax(0,1fr)_110px_170px] sm:gap-4';

interface VerificationRowProps {
  verification: Verification;
  /** Recebe o botão clicado, para o foco voltar para ele quando o detalhe fechar. */
  onSelect: (verification: Verification, trigger: HTMLElement) => void;
}

export function VerificationRow({ verification, onSelect }: VerificationRowProps) {
  const { fileName, status, reason, createdAt } = verification;
  const Icon = fileName.toLowerCase().endsWith('.pdf') ? FileText : FileImage;
  const sentAt = (
    <time dateTime={createdAt} title={new Date(createdAt).toLocaleString('pt-BR')}>
      {formatRelativeTime(createdAt)}
    </time>
  );

  // Dentro de <button> só cabe conteúdo "inline" no HTML, por isso tudo aqui é <span>.
  return (
    <li className="border-b border-border">
      <button
        type="button"
        onClick={(event) => onSelect(verification, event.currentTarget)}
        className={`flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-3 sm:py-4 ${ROW_GRID}`}
      >
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{fileName}</span>
            {reason && <span className="text-[13px] text-muted-foreground">{REASON_TITLES[reason]}</span>}
            <span className="text-[13px] text-muted-foreground sm:hidden">{sentAt}</span>
          </span>
        </span>
        <span className="hidden text-sm text-muted-foreground sm:block">{sentAt}</span>
        <span className="shrink-0">
          <StatusBadge status={status} />
        </span>
      </button>
    </li>
  );
}

import { CircleAlert } from 'lucide-react';
import type { Verification } from '@/domain/verification';
import { Skeleton } from './ui/skeleton';
import { ROW_GRID, VerificationRow } from './VerificationRow';

interface VerificationListProps {
  verifications: Verification[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const SKELETON_ROWS = 4;

export function VerificationList({ verifications, isLoading, error, onRetry }: VerificationListProps) {
  if (isLoading) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Carregando verificações</span>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-border px-1 py-4 sm:px-3">
            <Skeleton className="size-5 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error && verifications.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-2.5">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Não foi possível carregar as verificações</p>
            <p className="text-sm text-muted-foreground">Confira sua conexão e tente de novo.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="h-11 rounded-lg border border-primary px-4 text-[15px] font-semibold text-primary transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
        <p className="font-semibold">Nenhuma verificação ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie o primeiro documento para ver o resultado aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
          Não foi possível atualizar agora. Tentando de novo em alguns segundos.
        </p>
      )}
      <div
        aria-hidden
        className={`hidden border-b border-border px-3 pb-2.5 text-[13px] text-muted-foreground ${ROW_GRID}`}
      >
        <span>Arquivo</span>
        <span>Enviado</span>
        <span>Resultado</span>
      </div>
      <ul aria-label="Verificações enviadas">
        {verifications.map((verification) => (
          <VerificationRow key={verification.verificationId} verification={verification} />
        ))}
      </ul>
    </div>
  );
}

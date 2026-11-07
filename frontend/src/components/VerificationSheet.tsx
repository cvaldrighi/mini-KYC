import { X } from 'lucide-react';
import type { Verification, VerificationStatus } from '@/domain/verification';
import { getReasonMessage } from '@/lib/reasonMessages';
import { cn } from '@/lib/utils';
import { ChecksTimeline } from './ChecksTimeline';
import { StatusBadge } from './StatusBadge';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';

interface VerificationSheetProps {
  verification: Verification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Botão "Enviar outra foto", exibido só para verificações reprovadas. */
  onSendAnother: () => void;
  /** Para onde vai o foco quando o painel fecha (repassado ao Radix). */
  onCloseAutoFocus?: (event: Event) => void;
}

const SUMMARY_STYLES: Record<VerificationStatus, string> = {
  PENDING: 'border-status-pending-border bg-status-pending-bg',
  APPROVED: 'border-status-approved-border bg-status-approved-bg',
  REJECTED: 'border-status-rejected-border bg-status-rejected-bg',
  MANUAL_REVIEW: 'border-status-review-border bg-status-review-bg',
};

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

function Summary({ verification }: { verification: Verification }) {
  const { status, reason, checks } = verification;
  const message = reason ? getReasonMessage(reason, checks) : null;

  return (
    <div className={cn('flex flex-col gap-3.5 rounded-xl border p-5', SUMMARY_STYLES[status])}>
      <StatusBadge status={status} size="large" className="self-start bg-card" />
      <div className="flex flex-col gap-1">
        {message && <p className="text-[17px] font-semibold">{message.title}</p>}
        <SheetDescription className="text-[15px] leading-relaxed text-foreground">
          {message?.explanation ??
            (status === 'PENDING'
              ? 'As checagens estão em andamento. O resultado aparece aqui em alguns segundos.'
              : 'O documento passou em todas as checagens.')}
        </SheetDescription>
      </div>
    </div>
  );
}

/** Painel lateral com o resultado, as datas e a sequência das checagens de uma verificação. */
export function VerificationSheet({
  verification,
  open,
  onOpenChange,
  onSendAnother,
  onCloseAutoFocus,
}: VerificationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-full gap-0 overflow-y-auto border-border p-0 sm:max-w-[480px]"
      >
        {verification && (
          <div className="flex min-h-full flex-col gap-7 px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[13px] text-muted-foreground">Verificação</p>
                <SheetTitle className="text-[22px] font-bold tracking-tight break-all">
                  {verification.fileName}
                </SheetTitle>
              </div>
              <SheetClose
                aria-label="Fechar detalhe"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X aria-hidden className="size-[18px]" />
              </SheetClose>
            </div>

            <Summary verification={verification} />

            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-muted-foreground">Enviado em</dt>
              <dd>{dateTime.format(new Date(verification.createdAt))}</dd>
              {verification.status !== 'PENDING' && (
                <>
                  <dt className="text-muted-foreground">Concluído em</dt>
                  <dd>{dateTime.format(new Date(verification.updatedAt))}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Código</dt>
              <dd className="break-all text-muted-foreground">{verification.verificationId}</dd>
            </dl>

            <section aria-labelledby="checagens-titulo" className="flex flex-col gap-3.5">
              <h3 id="checagens-titulo" className="text-base font-bold">
                Checagens
              </h3>
              <ChecksTimeline checks={verification.checks} isPending={verification.status === 'PENDING'} />
            </section>

            {verification.status === 'REJECTED' && (
              <button
                type="button"
                onClick={onSendAnother}
                className="mt-auto h-12 rounded-lg border-[1.5px] border-primary text-base font-semibold text-primary transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Enviar outra foto
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

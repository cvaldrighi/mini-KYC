import { Check, Eye, X } from 'lucide-react';
import { CHECK_ORDER, type CheckName, type CheckResult } from '@/domain/verification';
import { formatFileSize } from '@/lib/formatFileSize';
import { cn } from '@/lib/utils';

export const CHECK_LABELS: Record<CheckName, string> = {
  size: 'Tamanho do arquivo',
  fileType: 'Tipo do arquivo',
  resolution: 'Resolução',
  duplicate: 'Documento duplicado',
  editSignals: 'Sinais de edição',
};

const TYPE_NAMES: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'application/pdf': 'PDF',
};

/** Linha de apoio de cada checagem, com o valor medido. */
function describeCheck(check: CheckResult): string {
  const { details = {}, outcome } = check;
  switch (check.name) {
    case 'size':
      return details.sizeBytes ? formatFileSize(details.sizeBytes) : '';
    case 'fileType': {
      const type = details.detectedType ?? '';
      return outcome === 'PASS' ? (TYPE_NAMES[type] ?? type) : `Conteúdo detectado: ${type || 'desconhecido'}`;
    }
    case 'resolution':
      return details.width && details.height ? `${details.width} × ${details.height} px` : 'Não se aplica a PDF';
    case 'duplicate':
      return outcome === 'PASS' ? 'Arquivo ainda não enviado' : 'Mesmo arquivo de outra verificação';
    case 'editSignals':
      if (outcome === 'PASS') return 'Nenhuma marca de edição';
      return details.software ? `Editado com ${details.software}` : 'Marcas de edição encontradas';
  }
}

type StepState = CheckResult['outcome'] | 'SKIPPED' | 'WAITING';

const STEP_STYLES: Record<StepState, { label: string; marker: string; text: string }> = {
  PASS: { label: 'Passou', marker: 'bg-status-approved-bg text-status-approved', text: 'text-status-approved' },
  REJECT: { label: 'Reprovou', marker: 'bg-status-rejected text-background', text: 'text-status-rejected' },
  REVIEW: { label: 'Revisão', marker: 'bg-status-review text-background', text: 'text-status-review' },
  SKIPPED: {
    label: 'Não executada',
    marker: 'border-[1.5px] border-dashed border-muted-foreground text-muted-foreground',
    text: 'text-muted-foreground',
  },
  WAITING: {
    label: 'Aguardando',
    marker: 'border-[1.5px] border-dashed border-muted-foreground text-muted-foreground',
    text: 'text-muted-foreground',
  },
};

const OUTCOME_ICONS = { PASS: Check, REJECT: X, REVIEW: Eye } as const;

interface ChecksTimelineProps {
  checks?: CheckResult[];
  /** Enquanto a verificação está em análise, nenhuma checagem tem resultado ainda. */
  isPending: boolean;
}

/** As cinco checagens, numeradas na ordem em que o pipeline as executa. */
export function ChecksTimeline({ checks = [], isPending }: ChecksTimelineProps) {
  const byName = new Map(checks.map((check) => [check.name, check]));

  return (
    <ol className="flex flex-col">
      {CHECK_ORDER.map((name, index) => {
        const check = byName.get(name);
        const state: StepState = check ? check.outcome : isPending ? 'WAITING' : 'SKIPPED';
        const style = STEP_STYLES[state];
        const Icon = check ? OUTCOME_ICONS[check.outcome] : null;
        const isLast = index === CHECK_ORDER.length - 1;
        const description = check ? describeCheck(check) : style.label;

        return (
          <li key={name} className={cn('relative grid grid-cols-[32px_minmax(0,1fr)_auto] gap-3.5', !isLast && 'pb-5')}>
            {!isLast && <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-0.5 bg-border" />}
            <span
              aria-hidden
              className={cn('flex size-8 items-center justify-center rounded-full text-sm font-bold', style.marker)}
            >
              {index + 1}
            </span>
            <span className="flex flex-col gap-0.5 pt-1">
              <span className={cn('text-[15px]', check ? 'font-semibold' : 'font-medium text-muted-foreground')}>
                {CHECK_LABELS[name]}
              </span>
              {description && <span className="text-[13px] text-muted-foreground">{description}</span>}
            </span>
            <span className={cn('inline-flex items-center gap-1 pt-1.5 text-[13px] font-semibold', style.text)}>
              {Icon && <Icon aria-hidden strokeWidth={2.5} className="size-3.5" />}
              {check && style.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

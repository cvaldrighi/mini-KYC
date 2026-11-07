import { api } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { StatusAnnouncer } from '@/components/StatusAnnouncer';
import { VerificationList } from '@/components/VerificationList';
import { useVerifications } from '@/hooks/useVerifications';

/**
 * Layout em duas colunas que se empilham quando não cabem lado a lado:
 * as duas seções usam flex-basis (400px e 560px) dentro de um container com flex-wrap.
 */
export default function App() {
  const { verifications, isLoading, error, refresh } = useVerifications(api);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto flex max-w-7xl flex-wrap items-start gap-10 px-5 py-8 sm:px-10 sm:py-10 lg:gap-14">
        <section aria-labelledby="enviar-titulo" className="flex max-w-[460px] flex-[1_1_400px] flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 id="enviar-titulo" className="text-[28px] leading-tight font-bold tracking-tight">
              Enviar documento
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Foto ou PDF do RG ou da CNH. JPEG, PNG ou PDF, até 5 MB.
            </p>
          </div>
          {/* UploadPanel: tarefa 2.8 */}
        </section>

        <section aria-labelledby="lista-titulo" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="lista-titulo" className="text-[22px] font-bold tracking-tight">
              Verificações
            </h2>
            <p className="text-[13px] text-muted-foreground">Atualiza sozinho a cada 5 segundos</p>
          </div>
          <VerificationList verifications={verifications} isLoading={isLoading} error={error} onRetry={refresh} />
          <StatusAnnouncer verifications={verifications} />
        </section>
      </main>
    </div>
  );
}

import { useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { api } from '@/api';
import { config } from '@/config';
import { AppHeader } from '@/components/AppHeader';
import { DemoBanner } from '@/components/DemoBanner';
import { StatusAnnouncer } from '@/components/StatusAnnouncer';
import { UploadPanel, type UploadPanelHandle } from '@/components/UploadPanel';
import { VerificationSheet } from '@/components/VerificationSheet';
import type { Verification } from '@/domain/verification';
import { VerificationList } from '@/components/VerificationList';
import { useVerifications } from '@/hooks/useVerifications';

/**
 * Layout em duas colunas que se empilham quando não cabem lado a lado:
 * as duas seções usam flex-basis (400px e 560px) dentro de um container com flex-wrap.
 */
export default function App() {
  const { verifications, isLoading, error, refresh } = useVerifications(api);
  const uploadPanelRef = useRef<UploadPanelHandle>(null);

  // Detalhe: guardamos o id (e não o objeto) para o painel refletir as atualizações do polling.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const selected = verifications.find((verification) => verification.verificationId === selectedId) ?? null;
  const rowToFocusRef = useRef<HTMLElement | null>(null);
  const sendAnotherRef = useRef(false);

  function openDetail(verification: Verification, trigger: HTMLElement) {
    rowToFocusRef.current = trigger;
    setSelectedId(verification.verificationId);
    setDetailOpen(true);
  }

  function sendAnother() {
    sendAnotherRef.current = true;
    setDetailOpen(false);
  }

  /**
   * Ao fechar, o Radix tentaria devolver o foco a um "trigger" que não usamos.
   * Decidimos nós: volta para a linha que abriu o painel ou, em "Enviar outra foto",
   * vai para a área de envio, já abrindo o seletor de arquivo.
   */
  function handleDetailCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (sendAnotherRef.current) {
      sendAnotherRef.current = false;
      uploadPanelRef.current?.openFilePicker();
      return;
    }
    rowToFocusRef.current?.focus();
  }

  return (
    <div className="min-h-dvh">
      {config.apiMode === 'mock' && <DemoBanner />}
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
          <UploadPanel ref={uploadPanelRef} api={api} onUploaded={refresh} />
        </section>

        <section aria-labelledby="lista-titulo" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="lista-titulo" className="text-[22px] font-bold tracking-tight">
              Verificações
            </h2>
            <p className="text-[13px] text-muted-foreground">Atualiza sozinho enquanto houver documentos em análise</p>
          </div>
          <VerificationList
            verifications={verifications}
            isLoading={isLoading}
            error={error}
            onRetry={refresh}
            onSelect={openDetail}
          />
          <StatusAnnouncer verifications={verifications} />
        </section>
      </main>
      <VerificationSheet
        verification={selected}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
        onSendAnother={sendAnother}
        onCloseAutoFocus={handleDetailCloseAutoFocus}
      />
      <Toaster
        position="top-center"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-[15px] font-medium text-card-foreground shadow-lg',
            icon: 'text-status-approved',
          },
        }}
      />
    </div>
  );
}

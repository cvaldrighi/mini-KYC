import { Info } from 'lucide-react';

/**
 * Aviso exibido no modo mock (por exemplo, na demo do GitHub Pages): deixa claro que é uma
 * demonstração e evita que alguém envie um documento real achando que é um serviço de verdade.
 */
export function DemoBanner() {
  return (
    <div role="note" className="border-b border-border bg-secondary">
      <div className="mx-auto flex max-w-7xl items-start gap-2.5 px-5 py-2.5 text-[13px] leading-normal sm:px-10">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          <span className="font-semibold">Demonstração com dados simulados.</span> Nenhum arquivo sai do seu
          navegador. Para ver outros resultados, envie arquivos com “baixa” ou “editada” no nome, ou o mesmo
          arquivo duas vezes.
        </p>
      </div>
    </div>
  );
}

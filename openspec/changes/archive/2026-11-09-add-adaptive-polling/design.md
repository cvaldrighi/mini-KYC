## Context

`useVerifications` já usa `setTimeout` encadeado (a próxima busca só é agendada quando a
anterior termina) e um contador de requisições para descartar respostas antigas. A mudança
é só na decisão de agendar a próxima busca.

## Decisions

- **Decidir pelo resultado da busca.** Ao fim de cada busca, agenda a próxima somente se a
  resposta tiver algum item `PENDING`, ou se a busca falhou. A decisão fica dentro do efeito
  que já existe, sem estado novo.
- **`refresh()` continua sendo a forma de retomar.** O `UploadPanel` já chama `refresh()` ao
  terminar um envio; a busca imediata traz a verificação nova `PENDING`, e o polling volta
  sozinho.
- **Visibilidade com a Page Visibility API.** `document.visibilityState` decide se a busca
  agendada roda; o evento `visibilitychange` dispara uma busca imediata ao voltar para a aba.
  Uma busca que venceria com a aba oculta não acontece e fica para quando a aba voltar.
- **Só a primeira página é considerada.** A lista mostra as 20 mais recentes; uma verificação
  `PENDING` mais antiga que isso não mantém o polling ativo. Aceitável: verificações novas
  sempre aparecem no topo.

## Risks / Trade-offs

- [Mudança feita em outra aba ou outro dispositivo não aparece sozinha quando o polling está
  parado] → aparece ao voltar para a aba (visibilidade) ou no próximo envio.
- [Verificação presa em `PENDING` (incidente) mantém o polling ativo indefinidamente] →
  o custo volta a ser o de hoje, só nesse caso. Aceitável.

## Why

O dashboard mostrou que a `list-verifications` é, de longe, a função mais invocada: cada aba
aberta busca a lista a cada 5 segundos, 720 vezes por hora, mesmo quando nada pode mudar.
O status só muda enquanto há verificações em análise; fora disso, quase toda busca devolve
a mesma lista.

## What Changes

- A lista só é buscada periodicamente **enquanto houver alguma verificação `PENDING`** (ou
  enquanto a última busca tiver falhado). Quando todas estão concluídas, o polling para.
- Um novo envio (ou "Tentar de novo") busca na hora e retoma o polling, porque a verificação
  nova começa `PENDING`.
- Com a aba em segundo plano, o polling pausa. Ao voltar para a aba, a lista é buscada na hora.
- O texto "Atualiza sozinho a cada 5 segundos" passa a descrever o comportamento novo.

### Fora do escopo

- WebSocket ou Server-Sent Events. Avaliados e descartados para este caso: exigiriam API
  Gateway WebSocket, tabela de conexões e reconexão, sem ganho que compense numa tela de
  verificação. Ficam como alternativa se o tempo real virar requisito.
- Mudanças no backend.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `web-app`: o requisito "Atualização automática" passa a ser adaptativo.

## Impact

- `frontend/src/hooks/useVerifications.ts` e seus testes; texto em `frontend/src/App.tsx`.
- Menos invocações da `list-verifications`, visível no gráfico "Invocações" do dashboard.

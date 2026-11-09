# Incidente 01: falha de permissão no S3 virou revisão manual silenciosa

| | |
|---|---|
| Data | 09/11/2026 |
| Tipo | Simulado (game day, tarefa 9.7) |
| Duração | Cerca de 30 minutos, do primeiro documento afetado à correção no ar |
| Impacto | 2 documentos válidos enviados para revisão manual por engano. Nenhum dado perdido. |
| Detecção | Manual, pelo sintoma na tela. **O alarme não disparou.** |
| Status | Resolvido: causa corrigida, documentos reprocessados e aprovados. |

## Resumo

Para o exercício, a permissão `s3:GetObject` foi removida da função de processamento. A
expectativa (escrita no runbook) era que as invocações falhassem e o alarme de erros disparasse.
Isso não aconteceu: o pipeline tratou a falha no download do arquivo como um problema do
documento e mandou as verificações para revisão manual com `PROCESSING_ERROR`. A invocação
terminou com sucesso, o alarme ficou em `OK` e não houve nova tentativa.

O exercício revelou uma falha de desenho: erros de infraestrutura e erros de documento eram
tratados da mesma forma dentro do pipeline.

## Linha do tempo (horário de Brasília)

| Horário | Evento |
|---|---|
| ~12:40 | Deploy do template sem a permissão `s3:GetObject` na `ProcessDocumentFunction` (início do exercício). |
| 12:45:37 | Primeiro documento afetado (`261ac3fd-...`) processado: vai para `MANUAL_REVIEW` com `PROCESSING_ERROR`. |
| 12:46:07 | Segundo documento afetado (`26cc997d-...`), mesmo resultado. |
| ~12:50 | Sintoma notado na tela: "Em revisão, Erro ao processar" para fotos válidas. |
| 12:52 | Dashboard sem erros de Lambda e alarme em `OK`. Logs Insights (consulta 3) mostra `ERROR` "Erro inesperado numa checagem" na checagem `fileType`. |
| 12:57 | Causa identificada pelo log: `AccessDenied`, HTTP 403, "not authorized to perform: s3:GetObject". |
| 13:11 | Histórico do alarme confirma que ele nunca saiu de `OK` durante o incidente. |
| ~13:15 | Deploy da mitigação (permissão restaurada) junto com a correção do código. |
| 13:17 | Novo documento enviado e aprovado: fluxo normal restabelecido. |
| 13:21 | Os 2 documentos afetados voltam para `PENDING` e são reprocessados. |

## Evidências

Log da função de processamento (resumido):

```json
{
  "level": "ERROR",
  "message": "Erro inesperado numa checagem; verificação enviada para revisão manual",
  "timestamp": "2026-11-09T15:46:07.453Z",
  "verificationId": "26cc997d-773a-4848-a8c9-54f88b4600e3",
  "check": "fileType",
  "error": {
    "name": "AccessDenied",
    "message": "User: arn:aws:sts::<conta>:assumed-role/mini-kyc-ProcessDocumentFunctionRole-.../mini-kyc-ProcessDocumentFunction-... is not authorized to perform: s3:GetObject on resource: \"arn:aws:s3:::mini-kyc-documents-<conta>/uploads/26cc997d-....jpg\" because no identity-based policy allows the s3:GetObject action",
    "$metadata": { "httpStatusCode": 403 }
  }
}
```

- O `stack` do erro apontava para `src/shared/downloadObject.ts:5`, o arquivo TypeScript
  original, graças aos source maps (`--enable-source-maps` no template).
- Item no DynamoDB: `status = MANUAL_REVIEW`, `reason = PROCESSING_ERROR`, sem a checagem
  `fileType` na lista `checks`.
- Histórico do alarme `ProcessDocumentErrorsAlarm`: só a criação e a primeira avaliação
  (`INSUFFICIENT_DATA` → `OK`, sábado). Nenhuma transição para `ALARM`.
- Dashboard: gráfico de erros das funções zerado durante todo o incidente.

## Causa

**Causa direta:** a função de processamento sem permissão para ler o arquivo no S3.

**Causa raiz (falha de desenho):** o `runPipeline` transformava *qualquer* erro lançado dentro de
uma checagem em revisão manual com `PROCESSING_ERROR`. O download do arquivo acontece dentro da
primeira checagem que precisa do conteúdo (`fileType`, via `lazyFile`). Por isso uma falha de
infraestrutura, que é transitória ou de configuração, foi tratada como defeito do documento.

Consequências:

1. **Incidente invisível no sinal principal:** nenhuma invocação falhou, então o alarme não disparou.
2. **Sem nova tentativa:** uma falha passageira do S3 não teria a chance de se resolver sozinha.
3. **Documentos bons em revisão humana**, e sem reprocessamento automático depois da correção,
   porque já não estavam `PENDING`.

## O que funcionou

- **Logs estruturados:** `verificationId`, `check` e `error.name` em campos próprios levaram da
  tela à causa em poucos minutos, com a consulta 3 do Logs Insights.
- **Source maps:** o erro apontava a linha do TypeScript.
- **Idempotência:** como a gravação só acontece se a verificação estiver `PENDING`, foi seguro
  voltar os documentos afetados para `PENDING` e reprocessá-los.
- **Runbook:** o roteiro guiou a investigação, e a diferença entre o comportamento esperado e o
  real foi o que revelou a falha de desenho.

## Correção

| Ação | Status |
|---|---|
| Restaurar a permissão `s3:GetObject` | Feito |
| `FileDownloadError`: falha de download vira erro de infraestrutura; o pipeline a repassa, a invocação falha, a Lambda tenta de novo e o alarme conta o erro. Erros do documento continuam virando revisão manual. | Feito, com testes (`pipeline.test.ts` e `process-document/handler.test.ts`) |
| Log "Falha de infraestrutura no processamento" com `verificationId` antes de deixar a invocação falhar | Feito |
| Runbook: como reconhecer esse padrão no cenário 1 e procedimento para recuperar verificações afetadas | Feito |
| Reprocessar os 2 documentos afetados | Feito |

## Próximos passos

- Repetir o exercício com a correção no ar e medir quanto tempo o alarme leva para disparar.
- Adicionar um destino de falha (fila SQS ou `OnFailure` da invocação assíncrona) para eventos
  que esgotarem as 2 novas tentativas. Hoje, depois delas, o evento é descartado e a verificação
  fica `PENDING` até alguém agir.
- Alarme para aumento de `PROCESSING_ERROR`: mesmo com a correção, um volume anormal de revisões
  manuais por erro é um sinal que hoje só aparece nos logs.

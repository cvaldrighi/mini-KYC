# Revisão dos critérios de aceite

Tarefa 10.1. Cada cenário das specs em `openspec/changes/add-mini-kyc-mvp/specs/` conferido
contra o código, os testes e o ambiente implantado.

**Legenda:** ✅ coberto por teste automatizado · 🧪 verificado manualmente no ambiente da AWS ·
⚠️ ainda não verificado

## document-upload

| Cenário | Status | Evidência |
|---|---|---|
| Criação com dados válidos | ✅ 🧪 | `create-verification/handler.test.ts`; teste com `curl` no primeiro deploy |
| Tipo de arquivo não permitido | ✅ | `create-verification/handler.test.ts` |
| Corpo inválido | ✅ | `create-verification/handler.test.ts` (7 variações) |
| Upload dentro da validade | 🧪 | `curl -X PUT` na presigned URL devolveu 200 |
| URL expirada | ⚠️ | Garantido pela assinatura (`X-Amz-Expires=300`), mas não testado |
| Acesso público negado | 🧪 | Block Public Access no template; `curl` sem assinatura devolveu 403 para baixar um objeto e para listar o bucket (09/11) |

## document-processing

| Cenário | Status | Evidência |
|---|---|---|
| Documento enviado | ✅ 🧪 | `process-document/handler.test.ts`; fluxo completo no ambiente |
| Verificação inexistente | ✅ | `process-document/handler.test.ts` |
| Todas as checagens passam | ✅ 🧪 | `pipeline.test.ts`; `valid.jpg` aprovado na AWS |
| Checagem reprova | ✅ 🧪 | `pipeline.test.ts`; `low-resolution.jpg` reprovado na AWS |
| Checagem pede revisão | ✅ 🧪 | `pipeline.test.ts`; `edited.jpg` em revisão na AWS |
| Falha inesperada | ✅ | `pipeline.test.ts`, `process-document/handler.test.ts` |
| Sem permissão para ler o arquivo (novo) | ✅ | `pipeline.test.ts`, `process-document/handler.test.ts`; requisito criado no incidente 01 |
| Arquivo grande demais / pequeno demais | ✅ 🧪 | `sizeCheck.test.ts`; `tiny.jpg` na AWS |
| Arquivo renomeado / tipo divergente | ✅ 🧪 | `fileTypeCheck.test.ts`; `renamed.jpg` na AWS |
| Imagem pequena / PDF | ✅ | `resolutionCheck.test.ts` |
| Primeiro envio / arquivo repetido / reprocessamento | ✅ 🧪 | `hashRepository.test.ts`, `duplicateCheck.test.ts`; reenvio do `valid.jpg` na AWS |
| Imagem editada / sem metadados | ✅ 🧪 | `editSignalsCheck.test.ts`; `edited.jpg` na AWS |
| Reprovação no meio do pipeline | ✅ | `process-document/handler.test.ts` |
| Evento duplicado | ✅ 🧪 | `verificationRepository.test.ts`; reprocessamento seguro no incidente 01 |

## verification-query

| Cenário | Status | Evidência |
|---|---|---|
| Listagem padrão / campos de cada item / lista vazia | ✅ 🧪 | `list-verifications/handler.test.ts`; `curl` no primeiro deploy |
| Próxima página / última página | ✅ | `verificationRepository.test.ts`, `cursor.test.ts` |
| Parâmetros inválidos | ✅ | `list-verifications/handler.test.ts`, `cursor.test.ts` |

## web-app

| Cenário | Status | Evidência |
|---|---|---|
| Arrastar e soltar / arquivo inválido / nenhum arquivo | ✅ | `Dropzone.test.tsx`, `UploadPanel.test.tsx` |
| Foto pelo celular | ✅ | `Dropzone.test.tsx` (atributo `capture`); não testado num celular real |
| Envio com progresso / falha no envio | ✅ 🧪 | `UploadPanel.test.tsx`, `useUpload.test.ts`, `uploadWithProgress.test.ts` |
| Carregamento inicial / erro ao carregar / lista vazia | ✅ | `VerificationList.test.tsx` |
| Ver checagens / explicação / enviar outra foto / sem botão / fechar | ✅ | `VerificationSheet.test.tsx`, `ChecksTimeline.test.tsx`, `App.test.tsx` |
| Status finalizado na tela | ✅ | `StatusAnnouncer.test.tsx` |
| Celular (360 px) / teclado | 🧪 | Revisão registrada em `docs/acessibilidade.md` |
| Status muda sozinho / limpeza do intervalo | ✅ 🧪 | `useVerifications.test.ts`; resultado aparecendo sozinho na AWS |
| Modo mock | ✅ | `mockApi.test.ts`, `api/index.test.ts` |

## observability

| Cenário | Status | Evidência |
|---|---|---|
| Correlação ponta a ponta | 🧪 | Consulta 1 de `docs/logs-insights.md` |
| Dados sensíveis | ✅ | Revisão dos logs: nenhuma presigned URL nem conteúdo de arquivo; regra no `shared/logger.ts` |
| Contagem por status | 🧪 | Consultas 2 e 5 de `docs/logs-insights.md` |
| Verificação concluída (métricas) | ✅ 🧪 | `process-document/handler.test.ts`; métricas no namespace `MiniKyc` |
| Visão geral (dashboard) | 🧪 | Dashboard `mini-kyc` implantado |
| Erro não tratado (alarme) | ⚠️ | O incidente 01 mostrou que o alarme não disparava para falhas de download; a correção já está no ar, mas falta repetir o exercício e ver o alarme em `ALARM` |
| Retenção configurada | ✅ | `template.yaml` (`RetentionInDays: 7`) |
| Incidente simulado | 🧪 | `docs/incidente-01.md` |

## Pendências

1. Repetir o incidente 01 com a correção no ar e registrar o tempo até o alarme disparar.
2. Testar a URL expirada: gerar uma verificação, esperar mais de 5 minutos e tentar o upload (esperado: `403`).

# Consultas do CloudWatch Logs Insights

Consultas prontas para investigar o mini-KYC. Os logs das funções saem em JSON (Powertools
Logger), então o Logs Insights já separa os campos: `level`, `message`, `verificationId`,
`function_name`, `cold_start`, `status`, `reason`, `checks`, `durationMs`.

## Como rodar

1. Console da AWS › CloudWatch › Logs › **Logs Insights** (região São Paulo).
2. Em "Select log group(s)", escolha os log groups das funções:
   `/aws/lambda/mini-kyc-CreateVerificationFunction-...`,
   `/aws/lambda/mini-kyc-ProcessDocumentFunction-...` e
   `/aws/lambda/mini-kyc-ListVerificationsFunction-...`.
3. Cole a consulta, ajuste o intervalo de tempo e clique em **Run query**.

Pela CLI (útil para guardar o resultado num registro de incidente):

```bash
aws logs start-query \
  --log-group-names /aws/lambda/<nome-da-funcao> \
  --start-time $(date -v-1H +%s) --end-time $(date +%s) \
  --query-string 'fields @timestamp, message | limit 20'
aws logs get-query-results --query-id <queryId devolvido acima>
```

## 1. A história completa de um documento

Junta a criação e o processamento de uma verificação. Selecione os log groups de criação e de
processamento. É a primeira consulta de qualquer investigação de um caso específico.

```
fields @timestamp, function_name, level, message, status, reason, durationMs, error.message
| filter verificationId = 'COLE-O-ID-AQUI'
| sort @timestamp asc
```

## 2. Verificações por status, a cada 5 minutos

```
filter message = 'Verificação concluída'
| stats count(*) as total by status, bin(5m)
| sort bin(5m) desc
```

Clique em **Visualization** para ver em gráfico. É a mesma informação da métrica
`VerificationCompleted`, mas com a vantagem de poder filtrar por qualquer campo do log.

## 3. Erros recentes nas três funções

```
fields @timestamp, function_name, message, verificationId, check, error.name, error.message
| filter level = 'ERROR'
| sort @timestamp desc
| limit 50
```

`check` aparece quando o erro aconteceu dentro de uma checagem (a verificação foi para revisão
manual). `error.message` traz a mensagem original da exceção.

## 4. Checagens mais lentas

O log "Verificação concluída" traz a lista `checks` na ordem do pipeline, e o Logs Insights
achata a lista em campos numerados (`checks.0.durationMs`, `checks.1.durationMs`...).
Como a ordem é fixa, cada posição é sempre a mesma checagem.

```
filter message = 'Verificação concluída'
| stats avg(`checks.0.durationMs`) as size_ms,
        avg(`checks.1.durationMs`) as fileType_ms,
        avg(`checks.2.durationMs`) as resolution_ms,
        avg(`checks.3.durationMs`) as duplicate_ms,
        avg(`checks.4.durationMs`) as editSignals_ms,
        pct(durationMs, 99) as pipeline_p99_ms,
        count(*) as verificacoes
```

Leitura esperada: `fileType` é a mais lenta porque é a primeira que pede o conteúdo, e o
download do S3 acontece ali (ver `lazyFile` em `backend/src/checks/pipeline.ts`).

## 5. Motivos de reprovação e revisão

```
filter message = 'Verificação concluída' and status != 'APPROVED'
| stats count(*) as total by status, reason
| sort total desc
```

## 6. Memória, duração e cold start de cada invocação

Com o formato de log em JSON, o resumo que a Lambda grava ao fim de cada invocação vira um
registro `platform.report`.

```
filter type = 'platform.report'
| stats count(*) as invocacoes,
        avg(record.metrics.durationMs) as duracao_media_ms,
        max(record.metrics.maxMemoryUsedMB) as memoria_max_mb,
        count(record.metrics.initDurationMs) as cold_starts,
        avg(record.metrics.initDurationMs) as init_medio_ms
  by @log
```

Se `memoria_max_mb` chegar perto da memória configurada (256 MB ou 512 MB no `template.yaml`),
é hora de aumentar a memória da função.

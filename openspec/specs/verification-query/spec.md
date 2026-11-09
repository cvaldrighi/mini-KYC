# verification-query Specification

## Purpose
TBD - created by archiving change add-mini-kyc-mvp. Update Purpose after archive.

## Requirements

### Requirement: Listar verificações
O sistema SHALL expor um endpoint `GET` que devolve as verificações ordenadas da mais recente para a mais antiga, consultando um índice secundário (GSI) ordenado por `createdAt`, sem usar `Scan`.

#### Scenario: Listagem padrão
- **WHEN** o cliente chama o endpoint sem parâmetros
- **THEN** o sistema responde `200` com `{ "items": [...], "nextCursor": ... }` contendo até 20 verificações, da mais recente para a mais antiga

#### Scenario: Campos de cada item
- **WHEN** uma verificação é devolvida
- **THEN** o item contém `verificationId`, `fileName`, `status`, `createdAt` e `updatedAt`, e também `reason` e `checks` quando existirem
- **AND** não expõe `fileKey` nem URLs do bucket

#### Scenario: Lista vazia
- **WHEN** não existe nenhuma verificação
- **THEN** o sistema responde `200` com `{ "items": [], "nextCursor": null }`

### Requirement: Paginação por cursor
O sistema SHALL aceitar os parâmetros `limit` (1 a 50) e `cursor`, onde `cursor` é um valor opaco devolvido pela página anterior.

#### Scenario: Próxima página
- **WHEN** o cliente envia o `nextCursor` recebido anteriormente
- **THEN** o sistema devolve os itens seguintes, sem repetir os da página anterior

#### Scenario: Última página
- **WHEN** não há mais itens após a página atual
- **THEN** `nextCursor` é `null`

#### Scenario: Parâmetros inválidos
- **WHEN** `limit` está fora de 1 a 50 ou `cursor` não pode ser decodificado
- **THEN** o sistema responde `400` com `{ "error": "INVALID_REQUEST" }`

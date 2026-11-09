## MODIFIED Requirements

### Requirement: Atualização automática
A aplicação web SHALL buscar a lista novamente a cada 5 segundos somente enquanto houver alguma verificação `PENDING` na lista ou enquanto a última busca tiver falhado, e SHALL parar de buscar quando todas as verificações estiverem concluídas. A aplicação web MUST pausar as buscas enquanto a aba estiver em segundo plano e MUST interromper o intervalo quando o componente for desmontado.

#### Scenario: Status muda sozinho
- **WHEN** uma verificação passa de `PENDING` para `APPROVED` no backend
- **THEN** a interface exibe o novo status em até 5 segundos sem recarregar a página

#### Scenario: Nada em análise
- **WHEN** nenhuma verificação da lista está `PENDING`
- **THEN** nenhuma nova busca é agendada

#### Scenario: Novo envio retoma a atualização
- **WHEN** o usuário envia um documento depois que as buscas pararam
- **THEN** a lista é buscada na hora e volta a ser buscada a cada 5 segundos enquanto a verificação nova estiver `PENDING`

#### Scenario: Falha na busca
- **WHEN** uma busca da lista falha
- **THEN** uma nova tentativa é agendada para 5 segundos depois, mesmo sem verificações `PENDING` conhecidas

#### Scenario: Aba em segundo plano
- **WHEN** a aba fica oculta enquanto há verificações `PENDING`
- **THEN** nenhuma busca é feita enquanto ela estiver oculta
- **AND** ao voltar para a aba, a lista é buscada na hora

#### Scenario: Limpeza do intervalo
- **WHEN** o componente que faz o polling é desmontado
- **THEN** nenhuma nova requisição de listagem é feita

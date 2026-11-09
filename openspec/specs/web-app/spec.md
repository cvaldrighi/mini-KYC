# web-app Specification

## Purpose
TBD - created by archiving change add-mini-kyc-mvp. Update Purpose after archive.

## Requirements

### Requirement: Envio de documento
A aplicação web SHALL permitir escolher um arquivo JPEG, PNG ou PDF, por clique ou arrastando e soltando na área de envio (no celular, também tirando uma foto com a câmera), mostrar uma prévia antes do envio e enviá-lo, criando a verificação e fazendo o upload direto para o S3 pela presigned URL.

#### Scenario: Arrastar e soltar
- **WHEN** o usuário arrasta um arquivo para a área de envio
- **THEN** a área muda de aparência indicando que pode soltar
- **AND** ao soltar, a interface mostra a prévia da imagem (ou o nome e o ícone, para PDF), o nome e o tamanho do arquivo

#### Scenario: Foto pelo celular
- **WHEN** o usuário está num celular
- **THEN** a área de envio mostra os botões "Tirar foto", que abre a câmera traseira (`capture="environment"`), e "Escolher arquivo", que abre a galeria e os arquivos

#### Scenario: Arquivo inválido escolhido
- **WHEN** o usuário escolhe um arquivo de outro tipo ou com mais de 5 MB
- **THEN** a interface explica o motivo ao lado da área de envio e não habilita o envio

#### Scenario: Envio com progresso
- **WHEN** o usuário clica em "Enviar documento"
- **THEN** a interface mostra uma barra com o progresso real do upload
- **AND** ao terminar, mostra a notificação "Documento enviado" e a nova verificação aparece no topo da lista como "Em análise"

#### Scenario: Nenhum arquivo escolhido
- **WHEN** nenhum arquivo foi escolhido
- **THEN** o botão "Enviar documento" está desabilitado e nenhuma requisição é feita

#### Scenario: Falha no envio
- **WHEN** a criação da verificação ou o upload falha
- **THEN** a interface mostra o que falhou e um botão "Tentar de novo", mantendo o arquivo escolhido

### Requirement: Lista de verificações
A aplicação web SHALL exibir a lista de verificações com nome do arquivo, data relativa ("há 2 min"), status e motivo em texto legível (por exemplo "Documento duplicado"), usando para `PENDING` ("Em análise"), `APPROVED` ("Aprovado"), `REJECTED` ("Reprovado") e `MANUAL_REVIEW` ("Em revisão") um rótulo no mesmo formato, com borda, fundo claro, texto na cor do status e ícone próprio, sem depender só da cor.

#### Scenario: Carregamento inicial
- **WHEN** a página abre
- **THEN** a interface mostra linhas de esqueleto (skeleton) no lugar da lista e, em seguida, as verificações

#### Scenario: Erro ao carregar
- **WHEN** a busca da lista falha
- **THEN** a interface mostra uma mensagem de erro com o botão "Tentar de novo"

#### Scenario: Lista vazia
- **WHEN** não existe nenhuma verificação
- **THEN** a interface mostra "Nenhuma verificação ainda" com um convite para enviar o primeiro documento

### Requirement: Detalhe da verificação
A aplicação web SHALL abrir, ao selecionar uma verificação, um painel lateral com status, motivo, uma explicação do que fazer usando os valores medidos (`details`), datas e a sequência das checagens executadas, indicando para cada uma se passou, reprovou, pediu revisão ou não foi executada. Para verificações reprovadas, o painel SHALL oferecer o botão "Enviar outra foto".

#### Scenario: Ver checagens
- **WHEN** o usuário seleciona uma verificação reprovada por baixa resolução
- **THEN** o painel mostra tamanho e tipo como aprovados, resolução como reprovada com o motivo, e duplicidade e edição como não executadas

#### Scenario: Explicação com valores medidos
- **WHEN** o usuário abre uma verificação reprovada com `LOW_RESOLUTION` e `details` de 520 × 340
- **THEN** o painel mostra "A imagem tem 520 × 340 pixels. O mínimo é 600 × 400." e orienta enviar uma foto mais nítida

#### Scenario: Enviar outra foto
- **WHEN** o usuário clica em "Enviar outra foto" numa verificação reprovada
- **THEN** o painel fecha, o foco vai para a área de envio e o seletor de arquivo é aberto

#### Scenario: Sem botão para outros status
- **WHEN** a verificação está aprovada, em análise ou em revisão
- **THEN** o painel não mostra o botão "Enviar outra foto"

#### Scenario: Fechar painel
- **WHEN** o usuário pressiona Esc ou clica fora do painel
- **THEN** o painel fecha e o foco volta para a linha selecionada

### Requirement: Mudança de status anunciada
A aplicação web SHALL anunciar para leitores de tela, por uma região `aria-live="polite"`, quando uma verificação visível passar de `PENDING` para um status final.

#### Scenario: Status finalizado na tela
- **WHEN** uma verificação visível passa de `PENDING` para `APPROVED`
- **THEN** o rótulo muda para "Aprovado"
- **AND** o leitor de tela anuncia "cnh-frente.jpg: Aprovado"

### Requirement: Tema, responsividade e acessibilidade
A aplicação web SHALL ter tema claro e escuro (seguindo o sistema por padrão, com opção de troca), funcionar de 360 px de largura até desktop, ser navegável por teclado com foco visível e manter contraste mínimo WCAG AA.

#### Scenario: Celular
- **WHEN** a tela tem 360 px de largura
- **THEN** a área de envio e a lista ficam empilhadas, sem rolagem horizontal

#### Scenario: Teclado
- **WHEN** o usuário navega só com Tab, Enter e Esc
- **THEN** consegue escolher arquivo, enviar, abrir e fechar o detalhe de uma verificação

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

### Requirement: Modo de API fake
A aplicação web SHALL permitir rodar sem backend, escolhendo entre API fake e API real pela variável `VITE_API_MODE` (`mock` ou `aws`), sem alterar os componentes.

#### Scenario: Modo mock
- **WHEN** a aplicação roda com `VITE_API_MODE=mock`
- **THEN** criação, upload e listagem funcionam em memória, com atraso simulado, e as verificações mudam de `PENDING` para um status final com motivo e checagens após alguns segundos, cobrindo os quatro status

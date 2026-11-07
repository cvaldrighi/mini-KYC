# Revisão de acessibilidade e responsividade do frontend

Revisão da tarefa 2.12 (`openspec/changes/add-mini-kyc-mvp/tasks.md`), contra o requisito
"Tema, responsividade e acessibilidade" da spec `web-app`: funcionar de 360 px até desktop,
navegação por teclado com foco visível e contraste mínimo WCAG AA nos dois temas.

## Contraste (WCAG 2.2, nível AA)

Razão de contraste calculada pela fórmula da WCAG (luminância relativa) com as cores de
`frontend/src/index.css`. O mínimo AA para texto normal é **4,5:1**.

| Texto sobre fundo | Claro | Escuro |
|---|---|---|
| Texto principal sobre o fundo | 14,53 | 14,53 |
| Texto secundário sobre o fundo | 6,86 | 7,63 |
| Texto secundário sobre o card | 7,59 | 6,73 |
| Texto secundário na linha em hover | 6,34 | 6,19 |
| Texto secundário na área de envio | 7,17 | 7,11 |
| Link e borda primária sobre o fundo | 5,35 | 7,01 |
| Link na área de envio | 5,59 | 6,54 |
| Texto do botão primário | 5,92 | 7,71 |
| Mensagem de erro sobre o fundo | 5,91 | 6,63 |
| Mensagem de erro sobre o card | 6,54 | 5,85 |
| "Em análise" sobre o fundo do rótulo | 7,48 | 8,02 |
| "Aprovado" sobre o fundo do rótulo | 5,48 | 6,89 |
| "Reprovado" sobre o fundo do rótulo | 6,39 | 6,64 |
| "Em revisão" sobre o fundo do rótulo | 5,92 | 7,55 |
| Rótulos de status sobre o card (painel de detalhe) | 6,50 a 9,04 | 6,55 a 8,72 |
| Texto nas caixas de resumo do painel | 13,53 a 14,23 | 11,17 a 12,99 |
| Números da linha do tempo das checagens | 5,48 a 6,86 | 6,89 a 9,26 |

Todos os pares passam no AA. Botões desabilitados (opacidade de 50%) ficam fora da regra,
como a própria WCAG prevê para componentes inativos. O status nunca depende só da cor: todo
rótulo tem texto e ícone.

## Teclado

| Fluxo | Como funciona |
|---|---|
| Trocar o tema | Tab até o botão do cabeçalho, Enter ou Espaço. |
| Escolher arquivo | Desktop: botão "escolha um arquivo". Celular: "Tirar foto" e "Escolher arquivo". Arrastar e soltar é só um atalho, nunca o único caminho. |
| Remover o arquivo escolhido | Botão "Remover <nome do arquivo>". |
| Enviar e tentar de novo | Mesmo botão principal; desabilitado sem arquivo e durante o envio. |
| Abrir o detalhe | Cada linha da lista é um `<button>`. |
| Fechar o detalhe | Esc, botão "Fechar detalhe" ou clique fora. O foco fica preso no painel enquanto ele está aberto (Radix). Ao fechar, volta para a linha que o abriu. |
| Enviar outra foto | No detalhe de uma reprovada. Fecha o painel, leva o foco para a área de envio e abre o seletor de arquivo. |

Todos os elementos interativos têm contorno de foco visível (`focus-visible:outline-ring`).
Os alvos de toque têm no mínimo 44 × 44 px, exceto o link "escolha um arquivo", que fica no meio
do texto (exceção prevista na WCAG para links em linha).

## Leitores de tela

- Idioma da página: `lang="pt-BR"`.
- Estrutura: `header`, `main`, um `h1` ("Enviar documento"), um `h2` por seção e o título do painel.
- Mudança de status anunciada numa região `aria-live="polite"` ("cnh-frente.jpg: Aprovado").
- Erros de validação e de envio com `role="alert"`; barra de progresso com `role="progressbar"`.
- Ícones decorativos com `aria-hidden`; botões só com ícone têm `aria-label`.
- Os `<input type="file">` nativos ficam com `display: none`, para não serem lidos em duplicidade
  com os botões visíveis que os acionam (ajuste feito nesta revisão).

## Responsividade (360 px até desktop)

- As duas colunas usam `flex-basis` (400 px e 560 px) dentro de um container com `flex-wrap`:
  quando não cabem lado a lado, empilham, sem breakpoint fixo.
- Margens laterais de 20 px no celular; nenhum elemento tem largura fixa maior que 320 px.
- A lista troca as três colunas por nome e data empilhados, com o status à direita, abaixo de 640 px.
- Nomes de arquivo longos são truncados com reticências na lista e quebram linha no painel.
- O painel de detalhe ocupa a largura toda no celular e 480 px no desktop.

## Movimento reduzido

Com `prefers-reduced-motion: reduce`, o brilho do Skeleton some e o painel de detalhe aparece
sem deslizar (ajuste feito nesta revisão).

## Como repetir a revisão

1. DevTools › Toggle device toolbar, largura de 360 px, nos dois temas.
2. Navegar a página inteira só com Tab, Shift+Tab, Enter, Espaço e Esc.
3. DevTools › Rendering › "Emulate CSS prefers-reduced-motion: reduce".
4. Contraste: inspecionar um texto e clicar no quadrado de cor no painel de estilos.
5. Leitor de tela: VoiceOver no macOS (Cmd + F5).

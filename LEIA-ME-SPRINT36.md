# CORTEX aba — Sprint 36 · menu sem barra de rolagem

## Sem SQL

## O que mudou

### A barra sumiu
Ela ficava escondida por padrão e cortava o menu ao meio quando aparecia. Agora não existe
mais barra visível — o que indica que há mais conteúdo é um **esmaecido suave na borda**,
feito por máscara: o conteúdo dissolve em vez de ser cortado por uma linha.

O esmaecido só aparece do lado onde ainda existe item. Rolando até o fim, ele muda de
baixo para cima.

### Grupos que recolhem
O rótulo de cada grupo — Clínico, Gestão, Sistema — virou botão. Um toque recolhe o bloco,
com a setinha girando.

A escolha fica guardada no aparelho: se você usa pouco o bloco Sistema, ele continua
recolhido nas próximas vezes. Cada pessoa ajusta o menu ao próprio trabalho.

Grupo que contém a página aberta **nunca começa recolhido** — seria estranho abrir
Auditoria e o bloco dela estar fechado.

### Espaçamento
Um pouco mais apertado entre os itens: 9px em vez de 10px de altura interna, e 2px de
intervalo em vez de 3px. Cabe mais sem ficar apertado de ler.

## Um erro que apareceu no teste
A primeira versão ficou pior que a original. Como usei `overflow: hidden` para animar o
recolhimento, e blocos de flex encolhem por padrão, em janela baixa os blocos **encolhiam
e os itens sumiam cortados** — sem barra, sem esmaecido, sem nada indicando que faltava
menu.

Corrigido com `flex: 0 0 auto` nos itens e nos blocos, e `min-height: 0` na área de
rolagem. Só apareceu porque medi a altura do conteúdo em quatro tamanhos de janela; a
olho nu, em tela grande, parecia perfeito.

## Como fica
| Perfil | Itens | Precisa rolar |
|---|---|---|
| Direção | 17 | em telas abaixo de ~950px |
| Coordenação | 16 | idem |
| Aplicadora | 9 | não |
| Recepção | 7 | não |

Quem mais usa o sistema na sala — a aplicadora — nunca vê rolagem.

## Arquivos
```
styles/components.css   barra escondida, esmaecido e grupos (v=6)
shared/sidebar.js       grupos recolhíveis com memória (v=15)
sw.js                   versão 5
demais páginas          versões novas
```

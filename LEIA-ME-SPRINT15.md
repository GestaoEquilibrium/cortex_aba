# CORTEX aba — Sprint 15 · correção do pattern e login inteligente

## Sem SQL

## Pattern por cima do conteúdo
O fundo de dots é um elemento posicionado. Elementos comuns da página, sem posição
definida, ficam **abaixo** dele na ordem de pintura — por isso os pontos apareciam
sobre o cartão de login em vez de atrás.

Corrigido para todo o sistema, não só o login: conteúdo, modais e o modal de
confirmação agora têm contexto próprio e ficam sempre acima do fundo.

Junto: telas de fundo escuro (o login) recebem `class="tela-escura"` e usam ponto
claro. Antes o ponto era escuro sobre fundo escuro — invisível onde deveria aparecer
e visível onde não deveria.

## Login abre a tela certa
Uma porta só, e cada perfil cai onde trabalha:

| Perfil | Abre em |
|---|---|
| aplicador, itinerante, estagiário | Sessão de hoje |
| recepção | Agenda |
| responsável | Portal da família |
| coordenação, supervisão, direção | Painel |

O aplicador entra e já está na tela de coleta, sem atravessar um painel que não usa.

## Arquivos
```
styles/base.css   camadas corrigidas + tela escura (v=4)
index.html        roteamento por perfil
demais páginas    só a versão do CSS
```

# CORTEX aba — Sprint 42 · correção do menu recolhido

## Substitui o sprint 41
Este pacote contém tudo do 41 mais a correção. **Descarte o zip do 41.**

## Sem SQL

## O que estava errado
No sprint 41, ao acrescentar duas regras para o estado recolhido, eu as inseri **no meio
de uma lista de seletores**:

```css
.sidebar.recolhida .sidebar-marca,      ← vírgula solta
.sidebar.recolhida .sidebar-grupo-itens { max-height: none !important; }
.sidebar.recolhida .sidebar-grupo,
...
#btSino { display: none; }
```

Com isso, `.sidebar-marca` deixou de fazer parte da regra que a escondia e passou a
integrar a regra de `max-height`. Resultado: a marca continuava visível no menu recolhido,
escorrendo para fora — que é o que a imagem mostrava.

Uma vírgula no lugar errado, e a correção que eu tinha acabado de restaurar deixou de valer.

## Agora
As regras novas ficam **depois** do bloco completo, separadas. E o comentário no arquivo
avisa por quê, para não acontecer de novo.

## Como conferi desta vez
Em vez de reler o CSS, medi o estilo aplicado no navegador, nos dois estados:

| | Expandida | Recolhida |
|---|---|---|
| Largura da barra | 224px | 54px |
| Marca | visível, 64px | `display: none`, 0px |
| Sino | visível | escondido |
| Botões do topo | lado a lado | empilhados |
| Ícones do menu | 18 | 18 |
| Rótulos | visíveis | escondidos |

Ler CSS não prova nada — quem decide é o navegador. Foi assim que os dois últimos erros
passaram.

## Arquivos
```
styles/components.css   lista de seletores restaurada (v=8)
sw.js                   versão 8
demais páginas          versão nova do css
```

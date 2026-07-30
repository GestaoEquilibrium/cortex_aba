# CORTEX aba — Sprint 9 · identidade, dots e modo claro/escuro

## Sem SQL
Só frontend. Substitui praticamente todos os arquivos, porque o nome do sistema mudou.

## Nome
"EQ ABA" saiu. Agora é **CORTEX** com **aba** manuscrito ao lado (fonte Caveat,
levemente inclinado). Aparece no menu, no login, no portal, nas abas do navegador
e nos manifestos de instalação.

## Fundo com dots
Pattern de pontos em toda a área do sistema: 14px de espaçamento, 10% de intensidade,
como combinado. No modo escuro os pontos ficam claros e mais discretos (7%).

## Sidebar flutuante
Descolada da borda (12px), cantos de 18px e sombra. Os dots passam por trás dela.
Recolhida, some para 78px só com ícones.

## Modo claro e escuro
Botão de lua/sol no topo do menu, ao lado do sino. A escolha fica salva no aparelho;
sem escolha, o sistema segue a preferência do sistema operacional. O modo é aplicado
antes da página pintar, então não pisca branco ao abrir no escuro.

**O que NÃO muda no escuro:** verde continua sendo independente/presente, âmbar com
ajuda, vermelho erro/falta, e cada área de ensino mantém sua cor. Se essas cores
mudassem por modo, o dado perderia o significado.

## Correções que entraram junto
- Padronização das versões de todos os arquivos compartilhados. O `dashboard.html` e a
  `agenda` ainda pediam a versão antiga do `auth_guard`, de antes do sprint 6.
- `dashboard.html` estava sem o `confirm_modal`, usado pelo botão Sair.
- Portal deixou de carregar o arquivo de dados de exemplo.

## Atenção ao aplicar
Este pacote troca `styles/base.css`, `styles/components.css` e quase todas as páginas.
Ctrl+F5 na primeira abertura.

# CORTEX aba — Sprint 10 · gráficos e correções visuais

## Sem SQL
Só frontend. Usa as tabelas do sprint 8.

## Correções
1. **"aba" por cima do sino.** O texto manuscrito é inclinado, e inclinação não ocupa
   espaço no cálculo do layout — por isso escorregava sobre o botão. Agora a caixa
   tem folga própria e o bloco da marca não pode crescer sobre os botões.
2. **Cartão do usuário vazando no menu recolhido.** Avatar e botão de sair agora
   empilham em coluna, com tamanhos reduzidos, dentro da largura.

## Gráficos — Clínico → Gráficos
Escolha o paciente e o período (30, 60, 90 dias ou tudo).

Um cartão por objetivo do PEI que tenha registro, com:
- **Curva de independência** (verde, preenchida): % de tentativas independentes por sessão
- **Curva de ajuda** (âmbar, tracejada): % de tentativas com dica
- **Linha de critério**: o alvo definido no PEI
- Sessões, total de tentativas, média e resultado da última sessão
- Selo "atingiu o critério" quando as últimas N sessões ficaram acima do alvo

As duas curvas juntas contam a história certa: o esperado é a verde subir enquanto a
âmbar desce. Só a porcentagem de acerto esconderia uma criança que acerta tudo com
ajuda física total.

Os gráficos respeitam o modo escuro (grade e textos ajustam sozinhos).

## Arquivos
```
graficos/index.html      novo
styles/components.css    correções da sidebar (v=5)
demais páginas           só a versão do CSS
```

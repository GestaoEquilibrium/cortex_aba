# CORTEX aba — Sprint 53 · linguagem visual do CORTEX neuro

## Sem SQL

Apliquei o padrão do CORTEX neuro em três telas, adaptado à paleta do aba.

## O princípio que peguei da referência
**Cor por área, não decoração.** No neuro, anamnese é roxo, testes é âmbar, agenda é
azul. Aqui a cor carrega a mesma função: ela informa antes de você ler.

## Portal da família
Refeito. A decisão de partida: **o herói é a criança, não o sistema.**

- Cabeçalho em gradiente roxo→ciano, com dois círculos difusos dando profundidade
- Foto e nome da criança em destaque, com a idade e quantos atendimentos tem na semana
- **"O que precisa de você"** vem antes de tudo, como botão e não como aviso cinza:
  termos para assinar (âmbar) e atividades para fazer (roxo). É a única parte do portal
  que depende da família agir
- Seções com cor: orientações roxo, atendimentos azul, relatórios verde, termos âmbar
- Data do atendimento em bloco — dia grande, dia da semana embaixo — em vez de texto corrido
- Entrada escalonada dos cartões

Também troquei os textos vazios. Antes: "Nenhum relatório liberado ainda." Agora explica
o que vai aparecer ali e quando.

## Painel
- Saudação em gradiente verde→navy, com os círculos difusos
- Indicadores com ícone e **cor por natureza do número**: verde em dia, âmbar pede
  atenção, vermelho atrasado. Zero pendências fica **verde**, não cinza — antes o painel
  não comemorava o que estava certo
- Faixa fina no topo de cada bloco: agenda verde, pacientes azul, supervisão âmbar
- Hora da sessão em bloco destacado, para o olho achar o horário sem ler a linha

## Pacientes
Faixa no topo do card indicando a situação, sem ocupar espaço:

| Cor | Significa |
|---|---|
| verde | em dia |
| âmbar | uma falta, ou 3 a 7 dias sem evolução |
| vermelho | duas faltas ou mais, ou mais de 7 dias |
| roxo | esperando vaga |

## Detalhes de acabamento
- Transição com leve exagero no fim (`cubic-bezier` com overshoot), como na referência
- `prefers-reduced-motion` respeitado em todas as animações
- Raio de 18px, sombras em três níveis

## Arquivos
```
portal/index.html        refeito
dashboard.html           saudação, indicadores e faixas
pacientes/lista.html     faixa de situação nos cards
sw.js                    versão 13
```

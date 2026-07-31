# CORTEX aba — Sprint 37 · agenda com menos botões

## Sem SQL

## O problema
Cada sessão mostrava 4 ou 5 botões. Com 9 atendimentos no dia, eram quase 40 alvos numa
tela só — e o chip da esquerda repetia o botão que já estava aceso.

Para quem marca presença correndo entre atendimentos, é fácil errar o alvo. E errar aqui
significa marcar falta em quem veio.

## O que mudou
Nos dados da clínica, **63% das sessões terminam como realizada**. Então essa continua em
um toque; o resto foi para um menu.

| Situação | O que aparece |
|---|---|
| Sessão em aberto | **Realizada** + botão de três pontos |
| Falta registrada | chip da falta + **Avisar família** + três pontos |
| Já realizada | chip + três pontos |

O menu traz as outras opções: falta com aviso, falta sem aviso e cobertura. Abre ancorado
no botão e sobe sozinho quando não cabe embaixo — importante no fim da lista.

O chip só aparece quando há algo a dizer. Sessão ainda em aberto não precisa de etiqueta
escrito "agendada": isso já é o padrão.

## Efeito
Numa tela com 9 sessões, os alvos caem de cerca de 40 para 15. E o alvo grande e verde é o
que a pessoa vai querer em quase dois terços das vezes.

## Testado
Três linhas com status diferentes geraram 5 botões, onde antes seriam 13. O menu abre com
as quatro opções e fecha ao clicar fora ou rolar.

## Arquivos
```
agenda/agenda.html   ações reorganizadas
```

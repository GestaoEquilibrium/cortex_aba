# CORTEX aba — Sprint 52 · o histórico importado para de cobrar

## SQL já rodado
As migrations 27 e 28 já foram aplicadas. Este pacote é só a parte de tela.

## O problema
O painel mostrava **35 evoluções pendentes** e **19 tarefas atrasadas**. Todas do
histórico de junho e julho que você importou — sessões que aconteceram no sistema
anterior, antes do CORTEX existir.

Ninguém vai escrever evolução para atendimento de junho. Aquele número nunca ia zerar.

E painel com número impossível de zerar ensina a equipe a ignorar o painel. Em duas
semanas ninguém olha mais, e aí o indicador que importa passa despercebido junto.

## O que mudou

**Painel** — evoluções pendentes e compliance por aplicador desconsideram o histórico
importado. Passam a mostrar o que a equipe realmente precisa fazer.

**Sino** — mesma conta.

**Tarefas automáticas** — a função no banco já foi ajustada, e as tarefas antigas foram
canceladas com a observação de que eram do histórico.

**Indicadores continuam contando o histórico** — de propósito. Frequência, absenteísmo e
ocupação de junho e julho são reais e valem para a análise. O que sai da conta é só a
cobrança de evolução.

A tela de Indicadores explica isso na nota de método, para ninguém achar que o número
está inflado.

## A distinção que importa
| | Conta o histórico? | Por quê |
|---|---|---|
| Indicadores | sim | os atendimentos aconteceram de verdade |
| Cobrança de evolução | não | não se escreve evolução do passado |
| Compliance por aplicador | não | seria cobrar por período fora do sistema |

## Arquivos
```
dashboard.html            desconsidera o histórico
shared/avisos.js          idem (v=20)
indicadores/index.html    nota explicando por que ali conta
sw.js                     versão 12
```

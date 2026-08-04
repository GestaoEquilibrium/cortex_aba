# CORTEX aba — Sprints 57 e 59 · linguagem visual completa e detector atualizado

## SQL
`database/30_detector_completo.sql` — mando inline no chat também.

## Sprint 57 · as 14 telas que faltavam
Relatórios, tarefas, indicadores, convênios, supervisão, admissão, comportamento,
gráficos, equipe, auditoria, configurações, diagnóstico e as duas de avaliações.

Todas ganharam o cabeçalho em gradiente. Onde fazia sentido, a faixa colorida no cartão
principal — e a cor não é aleatória, ela diz do que a tela trata:

| Tela | Faixa | Por quê |
|---|---|---|
| Relatórios, Gráficos | verde | progresso da criança |
| Tarefas | âmbar | coisa pendente |
| Convênios, Equipe | azul | administrativo |
| Supervisão, Admissão | roxo | processo interno |
| Comportamento | vermelho | é onde mora o risco |

Foi rápido porque o vocabulário já estava no `components.css` desde o sprint 55 — cada
tela precisou de uma classe, não de um bloco de estilo próprio.

## Sprint 59 · o detector conhecia só até a 27
A `migrations_pendentes()` foi escrita quando a última migration era a 27. As 28 e 29
existem no banco mas não estavam na lista dela.

No seu banco isso não muda nada, porque você já rodou as duas. Mas se você recriasse o
projeto do zero e esquecesse uma delas, o Diagnóstico ficaria calado — e a falha
silenciosa é exatamente o que essa função existe para impedir.

## Testado
As 14 telas foram abertas uma a uma no navegador: nenhuma com erro de script, todas com o
cabeçalho novo.

## Arquivos
```
14 telas                              cabeçalho e faixa
database/30_detector_completo.sql     migration
sw.js                                 versão 16
```

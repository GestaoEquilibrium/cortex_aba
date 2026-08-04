# CORTEX aba — Sprints 60 e 62 · ficha do paciente e texto do relatório

## Sem SQL

## Sprint 60 · as abas avisam antes do clique
Oito abas com o mesmo peso obrigavam a pessoa a entrar em cada uma para descobrir se
tinha algo lá dentro.

Agora cada aba mostra um marcador:

| Aba | Número | Ponto âmbar quando |
|---|---|---|
| PEI | objetivos em ensino | não há PEI vigente |
| Grade semanal | horários fixos | não há horário cadastrado |
| Anamnese | — | respondida e ainda não lida |
| Documentos | — | documento vencido ou termo por assinar |
| Família | — | sem telefone do responsável |

Passando o mouse, o marcador explica o motivo.

**A ordem das abas mudou** para refletir o uso: Resumo, PEI, Sessões vêm antes de Grade,
Anamnese, Documentos, Família e Linha do tempo.

## Sprint 62 · o relatório fala com a família
O texto estava correto mas soava a formulário. Quem lê é a mãe, não um auditor — e
exatidão não obriga a soar como planilha.

**Antes:**
> Nomear objetos comuns: 52% de respostas independentes em 80 tentativas, com queda de 12
> pontos ao longo do mês.

**Agora:**
> • Nomear objetos comuns
>   Fez sozinho em 42 de 80 oportunidades (52%). Houve queda de 12 pontos ao longo do mês.

Três mudanças:

**Usa o primeiro nome da criança.** "Théo compareceu a 9 das 12 sessões" em vez do nome
completo repetido.

**Um objetivo por linha**, em vez de tudo emendado num parágrafo. Relatório de cinco
objetivos virava um bloco ilegível.

**Troca o jargão.** "Respostas independentes em N tentativas" virou "fez sozinho em X de
Y oportunidades" — diz exatamente a mesma coisa, e qualquer pessoa entende.

Quando a presença é integral, o texto reconhece: *"compareceu a todas as 8 sessões
previstas. A presença integral favorece muito a continuidade do trabalho."* Antes ele só
sabia relatar problema.

## Concordância
Corrigi os `(s)` espalhados. Agora é "1 falta avisada" e "2 faltas avisadas", "1 já foi
alcançado" e "3 já foram alcançados". Testei com um e com vários — num documento que a
família lê, o `(s)` passa desleixo.

## O que continua entre colchetes
Os marcadores de leitura clínica permanecem: a equipe escreve as dificuldades, o plano do
próximo mês e a conclusão. O sistema apura números; parecer é de quem atende.

## Arquivos
```
pacientes/pasta.html    marcadores nas abas e nova ordem
relatorios/index.html   texto reescrito
sw.js                   versão 18
```

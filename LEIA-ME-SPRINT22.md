# CORTEX aba — Sprint 22 · encaixe, cobertura, feriados e ausências

## Antes de aplicar
Rodar o SQL do sprint 22. Ele cria `bloqueios_agenda` e `ausencias_profissional`,
**substitui** a função `gerar_sessoes` e acrescenta `sugerir_cobertura` e
`gerar_tarefas_evolucao`.

## Encaixe — Agenda
Sessão avulsa, fora da grade. Escolhe paciente, aplicador, dia, hora e duração, e
marca se é encaixe ou reposição de falta. Era o que faltava para atender reposição
sem inventar horário fixo.

## Cobertura — Agenda, botão em cada sessão
Mostra **quem está livre naquele horário**: sem sessão sobreposta e sem ausência
registrada. A ordem coloca o itinerante primeiro, porque é o perfil desenhado para
cobrir. Um clique transfere a sessão e ela fica marcada como cobertura.

Quem assumir continua vendo o cartão de segurança e o PEI do paciente — foi para isso
que esses campos existem.

## Feriados e bloqueios — Agenda
Bloqueio por dia, para a clínica toda ou para uma equipe. **A geração de sessões passou
a respeitar**: em dia bloqueado, não cria nada. Antes o sistema gerava sessão em feriado
e alguém tinha que cancelar uma a uma.

O bloqueio não apaga o que já existe — avisa se já houver sessões criadas naquele dia.

## Ausências — Equipe, botão em cada profissional
Férias, atestado, folga ou licença, com período. Nos dias marcados, a geração de sessões
**pula essa pessoa**. Quem está fora hoje aparece com etiqueta na lista da equipe.

As sessões já criadas continuam existindo — a ideia é justamente usar a Cobertura para
transferir, e não sumir com o atendimento da criança.

## Tarefa automática de evolução atrasada
Além da tarefa de faltas seguidas, agora existe a de evolução pendente: sessões
realizadas sem evolução escrita além do prazo geram tarefa para o próprio aplicador.
O prazo vem de Configurações → Operação. Uma tarefa por pessoa por dia, sem duplicar.

## Arquivos
```
agenda/agenda.html    encaixe, cobertura e bloqueios
equipe/index.html     ausências
tarefas/index.html    passa a gerar também as de evolução
```

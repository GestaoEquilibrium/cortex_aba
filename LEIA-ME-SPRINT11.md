# CORTEX aba — Sprint 11 · tarefas e painel com números reais

## Antes de aplicar
Rodar o SQL do sprint 11 (tabela `tarefas`, permissões e função `gerar_tarefas_faltas`).

## Tarefas — Gestão → Tarefas
A página que a sidebar já apontava e não existia.

- Criar tarefa com tipo, prioridade, responsável, prazo e paciente relacionado
- Filtros: abertas, minhas, atrasadas, e por tipo
- Concluir com confirmação; fica registrado quem concluiu e quando
- Aplicador entra já filtrado nas tarefas dele

## Tarefa automática de falta
A promessa que estava pendente desde o mapa: **duas faltas seguidas geram tarefa
de contato com a família**, com prioridade alta, atribuída à coordenação da equipe
do paciente. Roda quando a coordenação abre o painel ou a tela de tarefas.

Não duplica: cada tarefa automática tem uma chave (paciente + data da última falta),
então rodar dez vezes cria uma vez só.

## Painel agora com números reais
Saiu o bloco "ainda não implantado". Entraram:

- **Evoluções pendentes (7 dias)** — sessões marcadas como realizadas que não têm
  evolução escrita. É o indicador que a coordenação mais pediu.
- **Faltas na semana**
- **Tarefas abertas**, destacando quantas estão atrasadas
- **Pacientes ativos**
- Na agenda do dia, sessão realizada sem evolução ganha o selo "sem evolução"
- Compliance por aplicador: % das sessões realizadas que já têm evolução, ordenado
  do pior para o melhor

## Arquivos
```
tarefas/index.html    novo
dashboard.html        reescrito com dados reais
```

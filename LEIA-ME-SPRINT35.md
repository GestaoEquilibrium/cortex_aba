# CORTEX aba — Sprint 35 · prestação de contas ao convênio

## Antes de aplicar
Copiar `database/22_convenios.sql` para a pasta `database/` e rodar no Supabase.

## O buraco que os dados importados revelaram
A clínica atende 396 sessões por NDI Minas e 93 por Unimed, e o sistema já controlava
validade de guia — mas não havia como juntar as duas coisas. O risco concreto é atender
com guia vencida e descobrir na glosa, quando o dinheiro já não vem.

## Gestão → Convênios
Filtro por convênio e período, com atalho para o mês passado.

### Resumo por paciente
Uma linha por criança: convênio, número e validade da guia, sessões autorizadas,
realizadas e horas. Total no rodapé.

Conta **apenas sessões com status realizada**. Falta, cancelamento e sessão em aberto
ficam de fora — é o que a clínica pode cobrar.

### Sessão a sessão
Uma linha por atendimento, com data, hora, carteirinha, guia, profissional e registro
no conselho. É o formato que o convênio costuma pedir.

### Risco de glosa
Bloco vermelho no topo com as sessões feitas **depois da guia vencer**.

A conta usa a validade **na data do atendimento**, não a de hoje. É assim que o convênio
olha: sessão de 20/07 com guia válida até 15/07 não é paga, mesmo que a guia tenha sido
renovada depois. Fazer essa conta com a data de hoje esconderia exatamente o problema.

### Passou do autorizado
Aviso quando o número de sessões realizadas ultrapassa o autorizado na guia.

## Campos novos no cadastro
`guia_numero`, `guia_sessoes_autorizadas` e `carteirinha`. A validade já existia.

Sem o número da guia preenchido, a tela mostra "sem número" em âmbar — a prestação de
contas fica incompleta e o convênio devolve.

## Tarefas automáticas
- **Guia vencida ou vencendo em 15 dias** → tarefa para resolver antes do atendimento
- **Sessões autorizadas acabando** (faltando 4) → tarefa para pedir nova autorização

A ideia é avisar antes de virar glosa, não depois.

## Imprimir
A tela imprime limpa, com cabeçalho da clínica, período e total. Também exporta CSV com
uma linha por atendimento.

## Testado no banco
Com os dados reais importados: criei uma guia vencida há 10 dias para um paciente e o
relatório apontou as 4 sessões feitas depois. A tarefa automática foi gerada com
prioridade alta e não duplicou na segunda rodada.

Um erro no caminho: usei um tipo de tarefa que não existe no banco (`administrativa`).
Preferi usar o tipo já previsto a alterar a tabela por causa disso.

## Arquivos
```
convenios/index.html      novo
shared/sidebar.js         item Convênios (v=14)
tarefas/index.html        gera as tarefas de guia
sw.js                     versão 4
database/22_convenios.sql migration
demais páginas            versão do menu
```

# CORTEX aba — Sprint 27 · admissão e fila de espera

## Antes de aplicar
Copiar `database/17_admissao.sql` para a pasta `database/` do repositório e rodar
no Supabase.

## Gestão → Admissão
Antes, o paciente nascia direto como "ativo" ou "fila de espera", sem processo. Agora
existe entrada.

### Novo contato
Quando alguém procura a clínica, registra-se ali: criança, responsável, telefone, como
chegou, quem encaminhou, prioridade, quantas sessões precisa e **a disponibilidade da
família** — dias e turnos.

A criança entra na fila, não na agenda. Ela não aparece como paciente ativo nem conta
nos indicadores até ter horário.

### Fila
Ordenada por prioridade e depois por tempo de espera. Quatro indicadores no topo: quantas
na fila, quantas urgentes, média de dias esperando e quantas passam de 60 dias.

Situação de cada uma: primeiro contato, em triagem, aguardando vaga, desistiu ou não é
caso para a clínica.

### Achar vaga
O botão cruza a disponibilidade da família com os horários em que existe aplicador livre,
e mostra as opções ordenadas por quantidade de gente disponível — mais gente livre dá
margem para trocar depois.

Escolhendo o horário e o aplicador, o sistema cria o horário fixo na grade e o vínculo.
Quando a criança completa o número de sessões previstas, ele pergunta se pode ativar:
aí ela sai da fila e as sessões passam a ser geradas.

### Mapa de vagas
Grade de segunda a sexta mostrando quantos aplicadores estão livres em cada horário.
Passe o mouse para ver quem. É o retrato de onde ainda cabe paciente.

Conta a **grade fixa**, não as sessões do dia: vaga é espaço recorrente, não buraco pontual.
A faixa de horários vem de Configurações → Operação, que ganhou o horário de funcionamento.

## Arquivos
```
admissao/index.html       novo
shared/sidebar.js         item Admissão (v=12)
configuracoes/index.html  horário de funcionamento
database/17_admissao.sql  migration
demais páginas            versão do menu
```

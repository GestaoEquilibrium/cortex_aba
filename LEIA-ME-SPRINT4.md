# EQ ABA — Sprint 4 · sidebar no estilo CORTEX e agenda com três visões

## Não precisa de SQL novo
Este patch é só frontend. Usa a função `gerar_sessoes` do sprint 2.

## Sidebar
Chrome copiado do CORTEX: badge do logo, sino de avisos, botão de recolher,
item ativo como pílula branca e cartão do usuário no rodapé (avatar com iniciais
ou `foto_url`, nome, papel e botão de sair).

O que é do ABA e permanece: menu próprio agrupado em **Clínico** e **Gestão**,
filtragem por perfil e o fundo mudando conforme o tema (verde-navy na coordenação,
preto na equipe, espectro na família).

- Recolher: guarda a preferência no navegador e some com os rótulos, deixando 66px
- Sair: agora pede confirmação
- Sino: placeholder até o sprint de tarefas

## Agenda
- **Dia** — lançamento de presença, como antes
- **Semana** — sem profissional escolhido, colunas = profissionais do dia selecionado;
  escolhendo um profissional, colunas = os cinco dias da semana dele, e os horários
  que a grade prevê mas ainda não viraram sessão aparecem tracejados como "previsto"
- **Mês** — ocupação por dia com proporção de realizadas e faltas; clicar abre o dia
- Filtro por profissional; aplicador entra já filtrado nele mesmo
- Na visão de semana, o botão gera as sessões dos cinco dias de uma vez

## Arquivos
```
shared/sidebar.js          reescrito
styles/components.css      bloco da sidebar reescrito (v=3)
agenda/agenda.html         três visões + filtro
dashboard.html index.html pacientes/ equipe/ portal/ sessao/   só versões dos assets
```

## Pendente conhecido
`sessao/sessao.html` continua no mock do sprint 0 — sai do mock quando entrarem
programas e PEI.

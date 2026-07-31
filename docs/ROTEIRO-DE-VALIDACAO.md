# Roteiro de validação — CORTEX aba

Percurso completo do sistema, do zero ao relatório. Feito para ser executado de uma
vez, marcando cada item. O que falhar, anote o número — é assim que a correção vira
sprint em vez de virar conversa.

**Antes de começar:** rode `database/99_seed_demo.sql`. Ele cria equipe, quatro
pacientes, grade, três semanas de sessões, tentativas com evolução crescente,
comportamento com linha de base e faltas plantadas para disparar a tarefa automática.

---

## 1. Entrada e identidade

- [ ] 1.1 Abrir o sistema em janela anônima. O login mostra CORTEX com "aba" manuscrito ao lado, sem sobreposição.
- [ ] 1.2 O fundo tem os pontos, e eles ficam **atrás** do cartão branco.
- [ ] 1.3 Entrar com a conta de direção. Cai no Painel.
- [ ] 1.4 O menu mostra: Dashboard, Pacientes, Agenda, Sessão de hoje, Programas, Avaliações, Gráficos, Comportamento, Tarefas, Relatórios, Equipe, Auditoria, Configurações.
- [ ] 1.5 Clicar em cada item do menu. Nenhum leva a página em branco ou erro.
- [ ] 1.6 Botão de recolher: barra encolhe, rótulos somem, avatar e sair continuam dentro da barra.
- [ ] 1.7 Botão de lua/sol: alterna claro e escuro. Recarregar mantém a escolha.
- [ ] 1.8 No escuro, verde continua sendo "independente" e vermelho "erro" — as cores de significado não mudaram.

## 2. Painel

- [ ] 2.1 Mostra sessões de hoje com paciente, aplicador e status.
- [ ] 2.2 Sessões realizadas sem evolução aparecem com o selo "sem evolução".
- [ ] 2.3 O indicador de evoluções pendentes traz número maior que zero (o seed deixa as últimas sem evolução).
- [ ] 2.4 O compliance por aplicador lista os profissionais do pior para o melhor.
- [ ] 2.5 O indicador de tarefas abertas traz pelo menos uma — a automática do Bento Demo.

## 3. Pacientes

- [ ] 3.1 Cards mostram próxima sessão, frequência, dias desde a última evolução e faltas do mês.
- [ ] 3.2 Bento Demo aparece com faltas em destaque.
- [ ] 3.3 Théo Demo tem o aviso de cartão de segurança.
- [ ] 3.4 Buscar "Théo" filtra. Buscar pelo nome do responsável também funciona.
- [ ] 3.5 Filtros combinam: Ativos + Com faltas mostra só quem tem os dois.
- [ ] 3.6 Alternar para Lista mostra as mesmas pessoas em tabela.
- [ ] 3.7 Clicar num card abre a ficha.

## 4. Ficha do paciente

- [ ] 4.1 Cabeçalho com idade em anos e meses, aplicador titular e situação.
- [ ] 4.2 Cartão de segurança em destaque, quando houver.
- [ ] 4.3 Clicar no avatar permite enviar foto. A foto aparece no card e na lista.
- [ ] 4.4 Aba Grade: horários fixos listados por dia.
- [ ] 4.5 **Teste do conflito:** adicionar horário no mesmo dia e hora de outro paciente com o mesmo aplicador. O sistema recusa e diz quem já ocupa.
- [ ] 4.6 Adicionar horário válido: aparece na grade e o vínculo do aplicador é criado sozinho.
- [ ] 4.7 Encerrar um horário: some da grade, mas as sessões antigas continuam na aba Sessões.
- [ ] 4.8 Aba PEI: objetivos listados, com contagem de tentativas por sessão completa.
- [ ] 4.9 Ajustar um objetivo para "dominado" sem marcar as três generalizações — o aviso aparece.
- [ ] 4.10 Aba Família: cadastrar responsável com um e-mail seu.
- [ ] 4.11 Aba Família: enviar uma orientação do tipo "atividade".
- [ ] 4.12 Aba Linha do tempo: mostra entrada, vínculos e primeira sessão.

## 5. Agenda

- [ ] 5.1 Visão Dia mostra as sessões de hoje.
- [ ] 5.2 Marcar "Realizada" muda o chip na hora.
- [ ] 5.3 Marcar "Falta sem aviso" pede confirmação antes.
- [ ] 5.4 Ir para amanhã e usar "Gerar sessões do dia": cria a partir da grade.
- [ ] 5.5 Gerar de novo no mesmo dia: avisa que não havia o que criar, sem duplicar.
- [ ] 5.6 Visão Semana sem filtro: colunas são os profissionais.
- [ ] 5.7 Escolher um profissional: colunas viram os cinco dias dele, e horários da grade ainda sem sessão aparecem tracejados.
- [ ] 5.8 Visão Mês: dias com barra verde e vermelha conforme realizadas e faltas. Clicar num dia abre a visão de dia.

## 6. Sessão (coleta)

- [ ] 6.1 Abrir Sessão de hoje. Aparece o seletor com as sessões do dia.
- [ ] 6.2 Cartão de segurança do paciente aparece antes dos objetivos.
- [ ] 6.3 Objetivos do PEI listados com os alvos.
- [ ] 6.4 Tocar em "Independente": a trilha pinta de verde e o percentual sobe.
- [ ] 6.5 Tocar em "Com ajuda" e escolher o nível de dica.
- [ ] 6.6 Completar o número de tentativas: os botões travam.
- [ ] 6.7 Encerrar sem escrever evolução: pede confirmação.
- [ ] 6.8 Escrever a evolução, marcar um contexto e encerrar. A sessão vira "realizada".
- [ ] 6.9 **Teste offline:** desligar o wi-fi, registrar 3 tentativas, ver o aviso de registros aguardando, religar e confirmar que suma.

## 7. Gráficos

- [ ] 7.1 Escolher Théo Demo. Aparece um cartão por objetivo com registro.
- [ ] 7.2 A curva verde (independente) sobe ao longo das semanas.
- [ ] 7.3 A curva âmbar (com ajuda) desce no mesmo período.
- [ ] 7.4 A linha pontilhada do critério aparece na altura configurada no PEI.
- [ ] 7.5 Trocar o período para 30 dias muda o gráfico.
- [ ] 7.6 Alternar para modo escuro: o gráfico continua legível.

## 8. Comportamento

- [ ] 8.1 Escolher Bento Demo. Aparece "Recusa com grito Demo".
- [ ] 8.2 A definição observável aparece abaixo do nome.
- [ ] 8.3 No gráfico, as barras antes da linha de base são cinzas e depois vermelhas.
- [ ] 8.4 A frequência cai depois do início da intervenção.
- [ ] 8.5 O plano de manejo aparece com prevenir, responder e ensinar no lugar.
- [ ] 8.6 Registrar um episódio novo com A-B-C e intensidade. Aparece na lista.

## 9. Tarefas

- [ ] 9.1 Existe a tarefa automática de contato por faltas seguidas, marcada como "automática".
- [ ] 9.2 Criar tarefa manual com prazo para ontem: aparece como atrasada.
- [ ] 9.3 Filtro "Atrasadas" mostra só ela.
- [ ] 9.4 Concluir a tarefa: pede confirmação e some das abertas.

## 10. Avaliações

- [ ] 10.1 Criar protocolo próprio com dois domínios e três itens cada.
- [ ] 10.2 Escolher origem "licenciado" sem preencher autorização: o aviso aparece.
- [ ] 10.3 Criar avaliação AV1 para Théo Demo e responder os itens.
- [ ] 10.4 A barra de progresso e o percentual por domínio atualizam enquanto responde.
- [ ] 10.5 Concluir: a avaliação trava para edição.
- [ ] 10.6 Criar AV2, responder com notas maiores e concluir.
- [ ] 10.7 O gráfico comparativo mostra as duas ondas lado a lado por domínio.

## 11. Relatório mensal

- [ ] 11.1 Escolher Théo Demo e o mês atual. Gerar rascunho.
- [ ] 11.2 Os números de frequência batem com a agenda.
- [ ] 11.3 O texto de progressos cita os objetivos e as porcentagens reais.
- [ ] 11.4 Onde depende de leitura clínica, aparece o marcador entre colchetes.
- [ ] 11.5 Editar um trecho e salvar rascunho.
- [ ] 11.6 Finalizar: o texto trava.
- [ ] 11.7 Tentar editar finalizado: o campo não aceita.
- [ ] 11.8 Reabrir para revisão: volta a aceitar.
- [ ] 11.9 Imprimir: some o menu e sai só o documento com o cabeçalho da clínica.
- [ ] 11.10 Finalizar de novo e liberar à família.

## 12. Portal da família

- [ ] 12.1 Criar no Supabase o usuário com o mesmo e-mail do responsável cadastrado em 4.10.
- [ ] 12.2 Em janela anônima, entrar com esse e-mail. Cai no portal, não no painel.
- [ ] 12.3 Aparece a criança, com foto se houver.
- [ ] 12.4 A atividade enviada em 4.11 aparece com botão de marcar como feito.
- [ ] 12.5 Marcar como feito. Na ficha do paciente, aba Família, aparece "feito em".
- [ ] 12.6 Os próximos atendimentos aparecem.
- [ ] 12.7 O relatório liberado em 11.10 aparece e abre.
- [ ] 12.8 **Teste de vazamento:** no console do navegador, rodar cada consulta abaixo. Todas devem voltar vazias ou com erro.

```js
await eqClient.from('registros_tentativa').select('*')
await eqClient.from('evolucoes_diarias').select('*')
await eqClient.from('comportamentos_alvo').select('*')
await eqClient.from('pei_programas').select('*')
await eqClient.from('profissionais').select('*')
```

## 13. Permissões da equipe

Criar um usuário para cada perfil (Equipe → Novo profissional + usuário no Supabase
com o mesmo e-mail) e conferir em janela anônima:

### Aplicador
- [ ] 13.1 Entra direto na Sessão de hoje.
- [ ] 13.2 O menu **não** mostra Equipe, Auditoria, Configurações nem Avaliações.
- [ ] 13.3 Em Pacientes, vê só os vinculados a ele.
- [ ] 13.4 Na Agenda, o filtro já vem nele mesmo.
- [ ] 13.5 Não consegue marcar presença em sessão de outro aplicador.
- [ ] 13.6 Consegue registrar comportamento, mas não criar comportamento novo.

### Recepção
- [ ] 13.7 Entra direto na Agenda.
- [ ] 13.8 Consegue cadastrar paciente e remarcar sessão.
- [ ] 13.9 O menu não mostra Programas, Avaliações, Comportamento nem Relatórios.
- [ ] 13.10 No console: `await eqClient.from('evolucoes_diarias').select('*')` volta vazio.

### Coordenação
- [ ] 13.11 Vê os pacientes da própria equipe.
- [ ] 13.12 Vê Auditoria, mas não Configurações.
- [ ] 13.13 Consegue montar PEI, biblioteca e relatório.

### Estagiário
- [ ] 13.14 Vê só os pacientes vinculados.
- [ ] 13.15 Consegue coletar na sessão.
- [ ] 13.16 Não consegue alterar PEI nem biblioteca.

## 14. Auditoria

- [ ] 14.1 Abrir Auditoria como direção. Aparecem os registros dos últimos 7 dias.
- [ ] 14.2 Cada linha é uma frase em português: quem, o que fez e em qual registro.
- [ ] 14.3 Existe registro de entrada no sistema para cada usuário testado.
- [ ] 14.4 "Ver detalhes" mostra o que mudou.
- [ ] 14.5 Filtrar por pessoa e por tipo de ação funciona.
- [ ] 14.6 Exportar CSV baixa o arquivo, e a exportação aparece na própria auditoria.
- [ ] 14.7 Como coordenação, a tela abre. Como aplicador, o item nem aparece no menu.

## 15. Configurações

- [ ] 15.1 Meu perfil: trocar foto e telefone.
- [ ] 15.2 Trocar o modo por ali: a tela recarrega no modo escolhido.
- [ ] 15.3 Como direção, mudar "Janela do painel" para 3 dias. O painel passa a dizer "(3 dias)".
- [ ] 15.4 Mudar a duração padrão da sessão. Ao criar horário na grade, já vem com o novo valor.
- [ ] 15.5 Como coordenação, os campos de Operação aparecem desabilitados.

---

## Depois de rodar

Limpe a massa fictícia com o bloco comentado no fim de `99_seed_demo.sql`, **antes**
de cadastrar qualquer paciente real. Nome com "Demo" no meio de prontuário verdadeiro
vira confusão em três meses.

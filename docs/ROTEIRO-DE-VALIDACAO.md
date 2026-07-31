# Roteiro de validação — CORTEX aba

Percurso completo do sistema. Substitui a versão do sprint 18, que cobria menos da metade
do que existe hoje.

**Como usar:** percorra marcando. O que falhar, anote o número do item — é assim que a
correção vira sprint em vez de virar conversa.

**Em que base rodar:** se ainda não importou a base real, use `database/99_seed_demo.sql`.
Se já importou, rode direto sobre ela — os itens estão escritos para funcionar nos dois casos.

---

## 1. Entrada e identidade

- [ ] 1.1 Login em janela anônima: CORTEX com "aba" manuscrito, sem sobreposição
- [ ] 1.2 O fundo tem pontos, e eles ficam **atrás** do cartão
- [ ] 1.3 Entrar como direção → cai no Painel
- [ ] 1.4 Menu completo: Dashboard, Pacientes, Agenda, Sessão de hoje, Programas, Avaliações, Supervisão, Gráficos, Comportamento, Admissão, Tarefas, Indicadores, Relatórios, Auditoria, Equipe, Configurações
- [ ] 1.5 Clicar em cada item: nenhum leva a página em branco
- [ ] 1.6 Recolher o menu: rótulos somem, avatar e sair continuam dentro
- [ ] 1.7 Alternar claro/escuro: a escolha persiste ao recarregar
- [ ] 1.8 No escuro, verde continua sendo independente e vermelho erro
- [ ] 1.9 O sino tem ponto âmbar quando há pendência; clicar abre a lista
- [ ] 1.10 Cada linha do sino leva à tela que resolve

## 2. Painel

- [ ] 2.1 Sessões de hoje com paciente, aplicador e status
- [ ] 2.2 Sessão realizada sem evolução ganha o selo "sem evolução"
- [ ] 2.3 Indicador de evoluções pendentes com número real
- [ ] 2.4 Compliance por aplicador, do pior para o melhor
- [ ] 2.5 Bloco de supervisão com fidelidade média e ciências pendentes
- [ ] 2.6 Tarefas abertas, destacando as atrasadas

## 3. Admissão e fila

- [ ] 3.1 Novo contato: criança, responsável, origem, prioridade e **disponibilidade**
- [ ] 3.2 A criança entra na fila, **não** na agenda
- [ ] 3.3 Ela não aparece como paciente ativo nem conta nos indicadores
- [ ] 3.4 Fila ordenada por prioridade e depois por tempo de espera
- [ ] 3.5 Mapa de vagas desenha a grade de segunda a sexta com números
- [ ] 3.6 Passar o mouse mostra quem está livre
- [ ] 3.7 **Achar vaga**: as sugestões respeitam os dias e turnos marcados
- [ ] 3.8 Marcar um horário cria o item na grade e o vínculo
- [ ] 3.9 Ao completar as sessões previstas, pergunta se ativa
- [ ] 3.10 Ativando, a criança sai da fila e passa a gerar sessões

## 4. Pacientes

- [ ] 4.1 Cards com próxima sessão, frequência, dias desde a evolução e faltas
- [ ] 4.2 Buscar por nome da criança e do responsável
- [ ] 4.3 Filtros combinam (Ativos + Com faltas)
- [ ] 4.4 Filtro **Encerrados** mostra só os que saíram; sem ele, eles não aparecem
- [ ] 4.5 Alternador cards/lista
- [ ] 4.6 Clicar abre a ficha

## 5. Ficha do paciente

- [ ] 5.1 Idade em anos e meses correta (**se aparecer 126 anos, falta corrigir a data de nascimento**)
- [ ] 5.2 Cartão de segurança em destaque
- [ ] 5.3 Enviar foto pelo avatar; ela aparece no card e na lista
- [ ] 5.4 Botão **Falar com a família** abre o menu de mensagens
- [ ] 5.5 A mensagem de confirmação traz a data e hora reais da próxima sessão
- [ ] 5.6 Aba Grade: horários listados por dia
- [ ] 5.7 **Conflito:** tentar horário já ocupado pelo mesmo aplicador → recusa dizendo quem ocupa
- [ ] 5.8 Encerrar horário: some da grade, sessões antigas permanecem
- [ ] 5.9 Aba PEI: objetivos, tentativas por sessão completa, generalização
- [ ] 5.10 Marcar objetivo como dominado sem as três generalizações → aviso
- [ ] 5.11 Ao marcar dominado, ele vira **em manutenção** e aparecem 3 sondagens agendadas
- [ ] 5.12 Reforçadores: adicionar com tipo, preferência e restrição
- [ ] 5.13 Registrar avaliação de preferência: os 3 primeiros viram preferência alta
- [ ] 5.14 Aba Anamnese: gerar link, copiar, abrir WhatsApp
- [ ] 5.15 Aba Documentos: enviar PDF com validade; vencido aparece em vermelho
- [ ] 5.16 Abrir documento gera link temporário e registra na auditoria
- [ ] 5.17 Aba Família: cadastrar responsável e criar acesso
- [ ] 5.18 Enviar orientação do tipo atividade
- [ ] 5.19 Aba Linha do tempo com entrada, vínculos e primeira sessão

## 6. Agenda

- [ ] 6.1 Visão Dia com as sessões
- [ ] 6.2 Marcar Realizada muda o chip na hora
- [ ] 6.3 Marcar Falta sem aviso pede confirmação
- [ ] 6.4 Sessão com falta ganha botão **Avisar família**, com o texto pronto
- [ ] 6.5 Gerar sessões do dia cria a partir da grade
- [ ] 6.6 Gerar de novo não duplica
- [ ] 6.7 **Encaixe**: sessão avulsa fora da grade
- [ ] 6.8 **Cobertura**: lista só quem está livre naquele horário, itinerante primeiro
- [ ] 6.9 Transferir marca a sessão como cobertura
- [ ] 6.10 **Feriado**: cadastrar e conferir que a geração não cria nada naquele dia
- [ ] 6.11 Visão Semana sem filtro: colunas são profissionais
- [ ] 6.12 Com profissional escolhido: colunas viram os cinco dias, e o previsto pela grade aparece tracejado
- [ ] 6.13 Visão Mês com barras de realizadas e faltas; clicar abre o dia

## 7. Equipe

- [ ] 7.1 Cadastrar profissional com "criar acesso agora" marcado
- [ ] 7.2 A senha temporária aparece uma vez, com botão de copiar
- [ ] 7.3 Entrar com essa conta → o sistema exige trocar a senha
- [ ] 7.4 Tentar ir direto para o painel pela URL → volta para a troca de senha
- [ ] 7.5 Redefinir senha de quem já tem acesso
- [ ] 7.6 Registrar **ausência** (férias ou atestado)
- [ ] 7.7 Gerar sessões num dia de ausência: a pessoa é pulada
- [ ] 7.8 Quem está ausente hoje aparece com etiqueta na lista

## 8. Sessão (coleta)

- [ ] 8.1 Abre com o seletor das sessões do dia
- [ ] 8.2 Cartão de segurança antes de tudo
- [ ] 8.3 **Reforçadores** aparecem logo abaixo, com aviso nos que têm restrição
- [ ] 8.4 Objetivos do PEI em ordem de prioridade
- [ ] 8.5 Alvos: aquisição + até 2 de manutenção, estes com contorno tracejado
- [ ] 8.6 Tocar Independente pinta a trilha e sobe o percentual
- [ ] 8.7 Com ajuda + nível de dica
- [ ] 8.8 Ao completar as tentativas, os botões travam
- [ ] 8.9 **Sondagem vencida** aparece no topo, com manteve/parcial/perdeu
- [ ] 8.10 Marcar "perdeu" devolve o objetivo para ensino
- [ ] 8.11 Botão Registrar comportamento abre no paciente certo
- [ ] 8.12 Encerrar sem evolução pede confirmação
- [ ] 8.13 Escrever evolução, marcar contexto e encerrar
- [ ] 8.14 **Offline:** desligar o wi-fi, registrar 3 tentativas, ver o aviso, religar e conferir que sumiu

## 9. Promoção de alvo (a regra mais delicada)

- [ ] 9.1 Rodar uma sessão inteira com 100% de independência num alvo
- [ ] 9.2 Ao final, o alvo **continua em aquisição** — não pode subir na primeira
- [ ] 9.3 Repetir em três sessões perfeitas seguidas → aí sim vira manutenção
- [ ] 9.4 Se uma das três tiver erro, não promove

## 10. Supervisão e IOA

- [ ] 10.1 Nova supervisão: checklist com dez itens
- [ ] 10.2 Marcar N-A: o item sai da conta, não vale zero
- [ ] 10.3 Placar abaixo de 70% pede confirmação lembrando do plano de ação
- [ ] 10.4 Na sessão, ativar **modo observador** e registrar em paralelo
- [ ] 10.5 Criar supervisão vinculada àquela sessão → mostra a concordância
- [ ] 10.6 A aplicadora entra e **dá ciência**
- [ ] 10.7 Média por aplicador, do pior para o melhor

## 11. Comportamento

- [ ] 11.1 Cadastrar com definição observável e linha de base
- [ ] 11.2 Registrar episódio com A-B-C, intensidade e duração
- [ ] 11.3 No gráfico, barras antes da linha de base em cinza; depois, vermelhas
- [ ] 11.4 Criar plano de manejo com prevenir, responder e ensinar no lugar
- [ ] 11.5 Alerta de escalada quando a frequência sobe mais de 30%

## 12. Avaliações

- [ ] 12.1 Cadastrar protocolo com **área marcada** no domínio: `# Linguagem receptiva [receptiva]`
- [ ] 12.2 Domínio sem área: a tela avisa que não gera sugestão
- [ ] 12.3 Origem "licenciado" sem autorização → aviso
- [ ] 12.4 Aplicar AV1 respondendo item a item
- [ ] 12.5 Barra de progresso e percentual por domínio atualizam
- [ ] 12.6 Concluir trava a avaliação
- [ ] 12.7 **Sugestões** aparecem: domínios abaixo de 60% com programas daquela área
- [ ] 12.8 Incluir um no PEI → aparece na ficha do paciente
- [ ] 12.9 O programa incluído some da lista de sugestões
- [ ] 12.10 Criar AV2 com notas maiores → gráfico comparativo mostra as duas ondas

## 13. Gráficos

- [ ] 13.1 Um cartão por objetivo com registro
- [ ] 13.2 Curva verde (independente) sobe; âmbar (com ajuda) desce
- [ ] 13.3 Linha pontilhada do critério na altura certa
- [ ] 13.4 Trocar o período muda o gráfico
- [ ] 13.5 No modo escuro, continua legível

## 14. Tarefas automáticas

- [ ] 14.1 Duas faltas **seguidas** geram tarefa de contato
- [ ] 14.2 Falta, presença, falta → **não** gera (teste importante)
- [ ] 14.3 Evolução atrasada além do prazo gera tarefa para o aplicador
- [ ] 14.4 Sondagem vencida gera tarefa
- [ ] 14.5 Reavaliação de preferência após 90 dias gera tarefa
- [ ] 14.6 Nenhuma duplica ao abrir a tela de novo
- [ ] 14.7 Tarefa de contato tem botão **Falar** com a mensagem pronta

## 15. Indicadores

- [ ] 15.1 Ocupação por aplicador; quem não tem jornada aparece como "sem jornada"
- [ ] 15.2 Horas livres batem com o mapa de vagas
- [ ] 15.3 Absenteísmo por dia da semana e por horário
- [ ] 15.4 Aderência à prescrição por paciente
- [ ] 15.5 Guias vencidas em bloco vermelho
- [ ] 15.6 Exportar CSV

## 16. Relatório mensal

- [ ] 16.1 Gerar rascunho: os números batem com a agenda
- [ ] 16.2 O texto cita os objetivos e as porcentagens reais
- [ ] 16.3 Onde depende de leitura clínica, aparece o marcador entre colchetes
- [ ] 16.4 Finalizar trava a edição
- [ ] 16.5 Tentar editar finalizado: não aceita
- [ ] 16.6 Reabrir volta a aceitar e fica na auditoria
- [ ] 16.7 Imprimir: sai só o documento, com cabeçalho da clínica
- [ ] 16.8 Liberar à família

## 17. Portal da família

- [ ] 17.1 Criar acesso do responsável pela ficha do paciente
- [ ] 17.2 Entrar em janela anônima → cai no portal, não no painel
- [ ] 17.3 Trocar a senha temporária
- [ ] 17.4 A criança aparece, com foto
- [ ] 17.5 A atividade enviada aparece com botão de marcar como feito
- [ ] 17.6 Marcar como feito → a ficha mostra "feito em"
- [ ] 17.7 Próximos atendimentos aparecem
- [ ] 17.8 **Termo pendente** aparece com botão de ler e assinar
- [ ] 17.9 Assinar: o botão só libera depois de marcar a caixa
- [ ] 17.10 A ficha do paciente mostra o termo como assinado, com data
- [ ] 17.11 O relatório liberado aparece e abre

### 17.12 Teste de vazamento
No console, logado como responsável — **todas devem voltar vazias ou com erro**:
```js
await eqClient.from('registros_tentativa').select('*')
await eqClient.from('evolucoes_diarias').select('*')
await eqClient.from('comportamentos_alvo').select('*')
await eqClient.from('pei_programas').select('*')
await eqClient.from('profissionais').select('*')
await eqClient.from('supervisoes').select('*')
await eqClient.from('reforcadores').select('*')
```

## 18. Anamnese

- [ ] 18.1 Cadastrar modelo com seções, obrigatórias e tipos de campo
- [ ] 18.2 Gerar link e abrir em janela anônima, sem login
- [ ] 18.3 Preencher metade, fechar, abrir de novo: as respostas estão lá
- [ ] 18.4 Deixar obrigatória em branco e tentar enviar: recusa
- [ ] 18.5 Enviar → a ficha mostra "respondida"
- [ ] 18.6 Ver respostas na ficha
- [ ] 18.7 Marcar como revisada → o link para de funcionar

## 19. Encerramento

- [ ] 19.1 Encerrar um paciente de teste com alta
- [ ] 19.2 Encerrar sem síntese pede confirmação
- [ ] 19.3 Depois: grade desativada, sessões futuras canceladas, PEI encerrado
- [ ] 19.4 Sessões realizadas, tentativas e gráficos **continuam existindo**
- [ ] 19.5 O paciente some da lista, e aparece no filtro Encerrados
- [ ] 19.6 A ficha mostra a faixa de encerrado com a data
- [ ] 19.7 **Exportar dados**: baixa o arquivo com tudo
- [ ] 19.8 Abrir o arquivo e conferir que traz sessões, objetivos e termos

## 20. Auditoria

- [ ] 20.1 Registros dos últimos 7 dias
- [ ] 20.2 Cada linha é uma frase: quem, o que fez, em qual registro
- [ ] 20.3 Existe registro de entrada para cada usuário testado
- [ ] 20.4 Existe registro de criação de acesso e de exportação de dados
- [ ] 20.5 Filtrar por pessoa e por tipo
- [ ] 20.6 Exportar CSV — e a exportação aparece na própria auditoria
- [ ] 20.7 Como coordenação, a tela abre; como aplicadora, o item nem aparece

## 21. Permissões por perfil

Com um usuário de cada, em janela anônima:

### Aplicadora
- [ ] 21.1 Entra direto na Sessão de hoje
- [ ] 21.2 Menu **sem** Equipe, Auditoria, Configurações, Indicadores, Admissão, Avaliações
- [ ] 21.3 Em Pacientes, vê só os vinculados
- [ ] 21.4 Na Agenda, o filtro já vem nela
- [ ] 21.5 Não marca presença em sessão de outra pessoa
- [ ] 21.6 Registra comportamento, mas não cria comportamento novo
- [ ] 21.7 Registra reforçador (isso é liberado de propósito)
- [ ] 21.8 Vê as próprias supervisões e dá ciência

### Recepção
- [ ] 21.9 Entra direto na Agenda
- [ ] 21.10 Cadastra paciente, faz encaixe, registra ausência
- [ ] 21.11 Menu sem Programas, Comportamento, Relatórios, Supervisão
- [ ] 21.12 No console: `await eqClient.from('evolucoes_diarias').select('*')` volta vazio

### Coordenação
- [ ] 21.13 Vê os pacientes da própria equipe
- [ ] 21.14 Tem Auditoria e Indicadores, **não** tem Configurações
- [ ] 21.15 Monta PEI, biblioteca, relatório e supervisão

### Estagiária
- [ ] 21.16 Vê só os pacientes vinculados
- [ ] 21.17 Coleta na sessão
- [ ] 21.18 Não altera PEI nem biblioteca

## 22. Configurações

- [ ] 22.1 Trocar foto e telefone no próprio perfil
- [ ] 22.2 Trocar a senha
- [ ] 22.3 Como direção, mudar a janela do painel para 3 dias → o painel passa a dizer "(3 dias)"
- [ ] 22.4 Mudar a duração padrão → o novo valor aparece ao criar horário na grade
- [ ] 22.5 Mudar o horário de funcionamento → o mapa de vagas muda a faixa
- [ ] 22.6 Como coordenação, os campos de Operação aparecem desabilitados

---

## Testes do banco

Independentes da tela, rodando `database/98_testes.sql` num banco de teste:

- [ ] Os 9 testes passam

Ele cobre: conflito de horário, sondagem ao dominar, promoção de alvo durante e depois
da sessão, faltas consecutivas e encerramento.

---

## Depois de rodar

Se usou o seed, limpe com o bloco no fim de `99_seed_demo.sql` **antes** de cadastrar
paciente real. Nome com "Demo" no meio de prontuário verdadeiro vira confusão em três meses.

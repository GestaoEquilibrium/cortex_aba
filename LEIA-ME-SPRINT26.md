# CORTEX aba — Sprint 26 · WhatsApp, central de avisos e histórico do banco

## Antes de aplicar
1. Rodar o SQL do sprint 26 (faltas configuráveis) — está no chat
2. Copiar os arquivos de `database/` para a pasta `database/` do repositório
3. Rodar no Supabase, na ordem: `12`, `13`, `14`, `15`, `16`

Os arquivos 12 a 16 são o **histórico dos sprints 20 a 25**, que só existia no chat.
Sem eles, o banco não é recriável do zero. Ver `database/README-ATUALIZACAO.md`.

## WhatsApp do responsável
Botão **"Falar com a família"** na ficha do paciente. Abre um menu com mensagens
prontas para a situação:

- confirmar o próximo atendimento (já com data e hora reais)
- perguntar sobre a última falta (com a data)
- cobrar renovação de guia vencida
- avisar sobre atividade em casa ou relatório liberado
- pedir documento
- escrever do zero

Também aparece:
- **na agenda**, em cada sessão marcada como falta: botão "Avisar família"
- **nas tarefas** de contato com a família: botão "Falar", com o texto de faltas seguidas
- **no telefone** do resumo da ficha, que virou link

Não é integração paga. O sistema monta o link e abre o WhatsApp com o texto pronto,
para a pessoa **revisar antes de enviar**. Mensagem sobre criança não deve sair
automática — e assim o histórico fica no WhatsApp de quem falou, como já é hoje.

Números são normalizados: aceita com ou sem código do país, com parênteses e traços.

## Central de avisos — o sino ganhou função
Estava enfeitando a barra lateral desde o sprint 4. Agora reúne, num painel só:

- tarefas suas atrasadas e abertas
- evoluções pendentes
- sondagens de manutenção vencidas
- guias vencidas e vencendo em 30 dias
- anamneses respondidas aguardando revisão
- supervisões aguardando sua ciência

O sino ganha um ponto âmbar quando há algo esperando. Cada linha leva à tela que resolve.

O que aparece depende do perfil: aplicador vê o que é dele, coordenação vê o da clínica.

## Configuração ligada
**Faltas seguidas que geram tarefa** estava fixo em 2 dentro da função. Agora vem de
Configurações → Operação, como a tela já dizia.

## Arquivos
```
shared/whatsapp.js         novo
shared/avisos.js           novo
shared/sidebar.js          sino funcionando (v=11)
pacientes/pasta.html       botão de contato
agenda/agenda.html         avisar família na falta
tarefas/index.html         botão nas tarefas de contato
database/12 a 16           histórico do banco, sprints 20 a 25
demais páginas             carregam o módulo de avisos
```

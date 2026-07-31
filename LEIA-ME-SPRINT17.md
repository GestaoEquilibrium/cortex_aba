# CORTEX aba — Sprint 17 · configurações

## Antes de aplicar
Rodar o SQL do sprint 17 (tabela `configuracoes` com os valores iniciais).

## Última tela do menu
Fecha o último link que apontava para página inexistente.

### Meu perfil (todos)
Foto, telefone, modo claro/escuro e sair. Perfil, turno e equipe continuam sendo
alterados pela direção, na tela de Equipe.

### Clínica (direção altera, todos veem)
Nome, setor e telefone — usados no cabeçalho dos relatórios impressos.

### Operação (direção altera)
- Duração padrão da sessão — já usada ao criar horários na grade
- Faltas seguidas que geram tarefa
- Prazo para lançar evolução
- Janela do painel — o painel passa a contar evoluções pendentes com esse número,
  e o rótulo do indicador muda junto
- Encerrar sessão inativa após X minutos — **substitui** o valor fixo do config.js.
  Zero continua desligando. Para religar, agora é pela tela, sem mexer em arquivo.

## O que já responde às configurações
- Painel: janela de evoluções pendentes
- Grade da ficha do paciente: duração padrão
- Guard: inatividade

Os demais valores estão gravados e passam a ser lidos conforme as telas forem
ajustadas — não há número inventado em lugar nenhum.

## Arquivos
```
configuracoes/index.html    novo
shared/config_sistema.js    novo — leitura com cache e valores padrão
shared/auth_guard.js        carrega configurações e usa a inatividade do banco
dashboard.html              usa a janela configurada
pacientes/pasta.html        grade usa a duração padrão
demais páginas              passam a carregar o módulo
```

# CORTEX aba — Sprint 14 · portal da família

## Antes de aplicar
Rodar o SQL do sprint 14 (responsaveis, responsaveis_pacientes, orientacoes_responsavel,
funções e políticas).

## Como funciona
Responsável **não** é profissional. Tem cadastro próprio (`responsaveis`), guard próprio
e nenhum acesso às telas clínicas.

### Cadastrar
Ficha do paciente → aba **Família** → Adicionar responsável (nome, e-mail, telefone,
parentesco). Depois crie o usuário no Supabase com o **mesmo e-mail**: o vínculo é
automático, igual ao da equipe.

### O que a família vê
- A criança, com foto
- Orientações e atividades enviadas pela equipe, com botão "marcar como feito"
- Próximos atendimentos
- Relatórios **finalizados e liberados** pela coordenação

### O que a família NÃO vê
Tentativas, evoluções diárias, comportamentos, PEI, agenda de outros pacientes.
Isso não depende da tela: as políticas do banco simplesmente não dão acesso.

## Enviar orientação
Ficha do paciente → aba Família → Enviar orientação. Tipo atividade, orientação ou aviso,
com validade opcional. A tela mostra se foi lida e se foi marcada como feita —
o que vira indicador de adesão ao treino parental.

## Login
Uma porta só. O sistema identifica se é equipe ou responsável e manda para o lugar certo.

## Arquivos
```
shared/auth_guard_portal.js   novo
portal/index.html             reescrito, com dados reais
portal/relatorio.html         novo — leitura do relatório liberado
pacientes/pasta.html          nova aba Família
index.html                    desvia responsável para o portal
```

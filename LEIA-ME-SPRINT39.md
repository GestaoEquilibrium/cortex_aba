# CORTEX aba — Sprint 39 · diagnóstico do sistema

## Antes de aplicar
Copiar `database/24_diagnostico.sql` para a pasta `database/` e rodar no Supabase.

## Sistema → Diagnóstico
Uma tela que varre o banco e mostra o que está incompleto, com quantos casos e um link
direto para resolver. É o roteiro de implantação virando tela.

Nasceu da sua situação: 32 pacientes importados com data de nascimento provisória e 4
profissionais com e-mail falso. Nada disso quebra o sistema — ele só passa a mostrar
número errado sem avisar.

## O que ele verifica

**Pacientes** — data de nascimento provisória, ativo sem horário na grade, ativo sem PEI
vigente, sem telefone do responsável, sem sessões prescritas.

**Equipe** — e-mail provisório, sem acesso criado, sem jornada contratada.

**Configuração** — nome da clínica, termos de consentimento, modelo de anamnese,
biblioteca de programas quase vazia.

**Operação** — guias vencidas, sessões sem evolução, sondagens vencidas, anamneses
aguardando revisão, supervisões sem ciência.

**Segurança** — tabela sem proteção de acesso no banco. Esta é a mais importante: o
repositório é público e a chave do site também, então é a proteção no banco que impede
leitura indevida.

## Três níveis
- **Resolver antes de usar** — faz o sistema mostrar informação errada ou deixa dado exposto
- **Atrapalha o uso** — trava alguém no meio do trabalho
- **Pode esperar** — acúmulo normal de operação

## Rodado na sua base
Antes de entregar, rodei sobre os dados que você importou. Apontou 10 pontos, sendo 5
graves: as 32 datas de nascimento, os 4 e-mails, ausência de termo de consentimento e a
guia vencida.

## Um erro que o teste pegou
A primeira versão mostrou "6 casos" para as datas de nascimento, quando são 32. Eu usei
`limit 6` para listar alguns nomes, e ele acabou limitando a contagem junto. Um
diagnóstico que informa menos problema do que existe é pior que não ter diagnóstico.

Corrigido: a contagem é feita separada da listagem de nomes.

## Arquivos
```
diagnostico/index.html        novo
shared/sidebar.js             item Diagnóstico (v=16)
sw.js                         versão 6
database/24_diagnostico.sql   migration
demais páginas                versão do menu
```

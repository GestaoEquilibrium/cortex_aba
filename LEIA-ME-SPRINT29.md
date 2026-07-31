# CORTEX aba — Sprint 29 · reforçadores e supervisão no painel

## Antes de aplicar
Copiar `database/19_reforcadores.sql` para a pasta `database/` e rodar no Supabase.

## Reforçadores — ficha do paciente, aba PEI
Abaixo da tabela de objetivos, a lista do que funciona com aquela criança: nome, tipo
(comestível, atividade, social, sensorial, item), nível de preferência e **restrição** —
alergia, limite de tempo, "só no fim da sessão".

Quem pode registrar: qualquer pessoa que atende a criança, incluindo estagiário.
Reforçador se descobre na sala, não na reunião.

## Na tela de sessão
Os reforçadores aparecem logo abaixo do cartão de segurança, antes dos objetivos.
Item com restrição vem com aviso e o texto no toque.

É o que permite alguém assumir uma cobertura sem perguntar "o que funciona com ele?".

## Avaliação de preferência
Registro do resultado, em ordem: um item por linha, com o número de escolhas depois
dos dois-pontos. Os **três primeiros viram reforçadores de preferência alta**
automaticamente.

Quatro métodos: múltiplos estímulos, pareado, operante livre e entrevista com a família.

### Reavaliação automática
Passados 90 dias sem avaliação — prazo configurável — o sistema gera tarefa para o
aplicador titular. Só cobra de quem já tem objetivo em ensino: sem PEI andando,
reforçador ainda não pesa.

Testei: cria a tarefa, não duplica ao rodar de novo, e para de cobrar depois da avaliação.

## Supervisão no painel
O painel ganhou um bloco com a fidelidade média do período, quantas supervisões
aconteceram e quantas ainda aguardam ciência do aplicador.

Antes isso só existia dentro da própria tela de Supervisão — quem abria o painel de
manhã não via.

## Arquivos
```
pacientes/pasta.html          reforçadores e avaliação de preferência
sessao/sessao.html            reforçadores visíveis durante a sessão
dashboard.html                bloco de supervisão
tarefas/index.html            gera as tarefas de reavaliação
database/19_reforcadores.sql  migration
```

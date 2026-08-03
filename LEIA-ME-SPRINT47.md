# CORTEX aba — Sprint 47 · dois erros do console

## 1. `sw.js:105` — erro de cache com extensão do Chrome

**Bug meu.** O service worker tentava guardar em cache toda requisição de outra origem,
inclusive as de extensões do navegador, que usam o esquema `chrome-extension:`. A API de
cache só aceita `http` e `https`, então cada carregamento deixava um erro no console.

Não quebrava nada — mas polui o console e esconde erro de verdade no meio.

Corrigido de duas formas:
- o service worker ignora qualquer esquema que não seja `http` ou `https`
- toda gravação em cache passou a ter `catch` próprio: falhar ao guardar não pode virar
  erro na tela, porque a resposta já foi obtida

O `sw.js` subiu para a versão 9.

## 2. Erro 400 na agenda — migration faltando

**Não é bug de código.** A agenda pede a coluna `sessoes.sala`, que só passa a existir
depois de rodar `database/23_salas.sql`. Sem ela, o Supabase devolve 400 e a lista fica
vazia.

Esse é o erro mais comum do processo: as telas são atualizadas pelo PowerShell, mas o SQL
correspondente não é executado.

## database/00_conferir_migrations.sql
Consulta nova. Rode no SQL Editor e ela lista, na ordem, quais migrations ainda não foram
aplicadas — e para que serve cada uma.

Confere procurando a marca de cada migration no banco: uma tabela, uma função, um índice
ou uma coluna. Não altera nada, é só leitura.

No fim, ela ainda verifica se a trava antiga do modo observador continua presente. Se
aparecer alguma linha ali, falta rodar a `25_corrige_ioa.sql`.

**Rode isso primeiro.** Provavelmente faltam outras além da 23 — as telas de Convênios,
Diagnóstico e Cópia de segurança também dependem de SQL que pode não ter sido executado.

## Sintoma para reconhecer no futuro
Tela abre, lista fica vazia, console mostra 400. É quase sempre migration faltando: a
tela pede coluna ou função que ainda não existe no banco.

## Arquivos
```
sw.js                                 ignora esquemas não-http (v9)
database/00_conferir_migrations.sql   novo
demais páginas                        sem mudança
```

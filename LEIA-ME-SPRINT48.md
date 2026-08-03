# CORTEX aba — Sprint 48 · o sistema avisa quando o banco está atrás

## Antes de aplicar
Rodar `database/27_migrations.sql`. **E, se ainda não rodou, as que faltam antes dela.**

## O problema que isto resolve
As telas são atualizadas pelo PowerShell; o SQL é rodado à mão, no SQL Editor. Quando o
segundo passo é esquecido, a tela pede uma coluna que não existe e o navegador devolve
400 — sem dizer o motivo. A lista fica vazia e ninguém sabe por quê.

Foi o que aconteceu com a agenda: `column sessoes.sala does not exist`.

## Agora o sistema percebe sozinho

**No painel**, faixa vermelha no topo listando os arquivos que faltam rodar, em ordem.
Aparece só para coordenação e direção.

**No sino**, o aviso entra no topo da lista, acima de tudo. Quando o banco está atrás,
várias telas simplesmente não funcionam — e o sintoma não explica a causa.

**No Diagnóstico**, entra como item grave, na primeira posição.

## Como funciona
A função `migrations_pendentes()` procura, para cada migration, a marca que ela deixa no
banco: uma tabela, uma função, um índice ou uma coluna. O que não estiver lá aparece.

Tem um detalhe: se a própria função ainda não existir — porque a 27 não foi rodada —
a faixa mostra um aviso mais simples pedindo para rodar a conferência. O caso em que o
detector não existe é justamente o caso que ele detecta.

## O que já era e continua
`database/00_conferir_migrations.sql` segue disponível para rodar direto no SQL Editor,
com a lista completa e a verificação da trava do modo observador.

## Testado
Simulei o seu banco, sem as migrations 23 e 26. A faixa apareceu listando os dois
arquivos, e o diagnóstico colocou o item no topo. Também testei o caso da função ausente.

## Arquivos
```
database/27_migrations.sql   migration
dashboard.html               faixa no topo
shared/avisos.js             alerta no sino (v=18)
sw.js                        versão 10
```

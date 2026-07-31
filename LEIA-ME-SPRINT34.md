# CORTEX aba — Sprint 34 · registro de erros

## Antes de aplicar
Copiar `database/21_erros.sql` para a pasta `database/` e rodar no Supabase.

## O problema
Quando alguma coisa quebra para a aplicadora no meio da sessão, o erro vai para o console
do navegador e desaparece. Ela diz "deu erro" e não tem print. Com quatro pessoas e 32
crianças entrando no sistema, cada problema viraria adivinhação.

## O que muda
Todo erro de JavaScript passa a ser gravado: o que aconteceu, em qual tela, com quem,
em que navegador. A coordenação vê em **Auditoria → Erros do sistema**.

Erros iguais aparecem **agrupados**, com a contagem e as pessoas afetadas. O mesmo
problema em cinco pessoas é um problema, não cinco.

Dá para marcar como resolvido, e o filtro mostra só os que estão em aberto.

## Três cuidados que valem mais que a captura

**1. Nunca atrapalha a pessoa.** Se o registro falhar, falha calado. Um erro ao registrar
erro não pode virar um segundo problema no meio do atendimento.

**2. Limpa o que pode vazar.** Mensagem de erro às vezes carrega trecho do que estava
sendo gravado. Antes de salvar, o módulo remove:

| O quê | Vira |
|---|---|
| `{"nome_completo":"Maria Laura","telefone":"34999..."}` | `{...}` |
| `?id=eq.9f8a7b6c-1234-...` | `?id=***` |
| `responsavel@gmail.com` | `***@***` |
| `eyJhbGciOiJIUzI1NiIs...` (token) | `***token***` |
| `sb_publishable_A1b2C3...` (chave) | `***` |

Testado com esses cinco casos. O primeiro teste deixou o token JWT passar — os pontos
quebravam a detecção de sequência longa. Corrigido e revalidado.

**3. Não repete.** Erro dentro de um loop geraria centenas de linhas iguais. Cada
mensagem é registrada uma vez por sessão, com limite de 20 no total.

## Limpeza
Erro já resolvido com mais de 90 dias é apagado pela função `limpar_erros_antigos()`.
A tabela não cresce sozinha sem ninguém olhando.

## Quem vê
Coordenação, supervisão e direção. A aplicadora registra sem saber que registrou —
não aparece nada para ela.

## Service worker
Subiu para `cortex-aba-v3`, com o `erros.js` na lista de pré-carregamento.

## Arquivos
```
shared/erros.js         novo — captura e limpeza
auditoria/index.html    aba "Erros do sistema"
sw.js                   versão 3
database/21_erros.sql   migration
demais páginas          carregam o módulo
```

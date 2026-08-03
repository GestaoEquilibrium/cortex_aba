# CORTEX aba — Sprint 51 · tira o aviso de manutenção da vista da equipe

## Sem SQL

## O que estava errado
A faixa "Banco desatualizado — rode database/00_conferir_migrations.sql" aparecia no
painel de qualquer pessoa da coordenação. Para quem só quer trabalhar, isso não significa
nada: é nome de arquivo e ferramenta de desenvolvedor num lugar onde se espera ver a
agenda do dia.

Pior, assusta. Quem lê "banco desatualizado" e não sabe do que se trata imagina que o
sistema está com problema e para de confiar nele.

## O que mudou
- **Fora do painel.** A faixa foi removida.
- **Fora do sino.** O aviso não entra mais na central.
- **Continua no Diagnóstico**, que é a tela de manutenção — e lá só a **direção** vê.
  Coordenação abrindo o Diagnóstico quer saber de cadastro incompleto, não de arquivo
  SQL pendente.

## O princípio
Informação de suporte não aparece para quem opera. Quem precisa dela sabe onde procurar;
quem não precisa só fica confuso.

Vale como regra daqui em diante: se a mensagem cita nome de arquivo, comando ou detalhe
técnico, ela pertence ao Diagnóstico ou à Auditoria — nunca ao painel.

## Arquivos
```
dashboard.html            faixa removida
shared/avisos.js          alerta removido do sino (v=19)
diagnostico/index.html    item só para a direção
sw.js                     versão 11
```

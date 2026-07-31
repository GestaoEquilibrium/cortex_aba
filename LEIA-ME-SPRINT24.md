# CORTEX aba — Sprint 24 · manutenção e rotação de alvos

## Antes de aplicar
Rodar o SQL do sprint 24. Ele cria `sondagens_manutencao`, acrescenta três colunas em
`pei_alvos` e instala dois gatilhos automáticos.

## O problema que isto resolve
"Dominado" estava virando arquivo morto. O objetivo saía do ensino e ninguém verificava
de novo — a perda só apareceria meses depois, sem ninguém saber quando aconteceu.

## Sondagem automática
Ao marcar um objetivo como **dominado**, o sistema:
1. agenda as sondagens nos prazos definidos no programa (15, 30 e 60 dias por padrão)
2. muda o status para **em manutenção** — dominado não é ponto final, é mudança de fase

Nas datas previstas, a sondagem aparece no topo da tela de sessão do aplicador, com três
botões: manteve, parcial, perdeu.

**Perdeu volta para ensino automaticamente.** Manutenção sem retorno ao ensino seria
perda registrada e ignorada.

Sondagem vencida também vira tarefa para o aplicador responsável.

## Rotação de alvos
A tela de sessão deixa de mostrar todos os alvos. Passa a trazer:
- todos os alvos **em aquisição**
- até **2 de manutenção**, escolhendo os que estão há mais tempo sem rodar

Os de manutenção aparecem com contorno tracejado verde e um ponto. É o que evita a
sessão inteira nos mesmos itens e o abandono dos já aprendidos.

## Promoção automática do alvo
Três sessões seguidas com 100% de independência naquele alvo específico movem ele de
aquisição para manutenção, sozinho. O contador zera se a criança errar.

## Onde acompanhar
Ficha do paciente → aba PEI, abaixo da tabela de objetivos: sondagens agendadas,
vencidas e resultados.

## Arquivos
```
sessao/sessao.html      rotação de alvos e registro de sondagem
pacientes/pasta.html    bloco de sondagens no PEI
tarefas/index.html      gera as tarefas de sondagem
```

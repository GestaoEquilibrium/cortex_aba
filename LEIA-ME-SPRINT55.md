# CORTEX aba — Sprint 55 · linguagem visual nas telas restantes

## SQL
Nenhum novo. Os arquivos `28_historico_importado.sql` e `29_cpf.sql` vão no pacote
apenas para completar a pasta `database/` — **você já rodou os dois**.

Eles nunca tinham virado arquivo, o que quebrava a regra do banco recriável do zero.
Agora a pasta está completa: 01 a 29.

## A linguagem saiu das telas e foi para o CSS compartilhado
Antes, cada tela redesenhada carregava a própria cópia dos estilos. Agora o vocabulário
mora em `components.css` e qualquer tela usa com uma classe:

| Classe | O que faz |
|---|---|
| `.heroi` | cabeçalho em gradiente com o círculo difuso |
| `.faixa-verde` `.faixa-azul` `.faixa-roxo` `.faixa-ambar` `.faixa-vermelho` | faixa de 3px no topo do cartão |
| `.hora-bloco` + `.tom-azul` `.tom-ambar` `.tom-cinza` | horário em bloco destacado |
| `.secao-titulo` | rótulo de seção com a linha |
| `.surge` | entrada escalonada |
| `.levanta` | cartão que sobe ao passar o mouse |

Repetir estilo em cada arquivo é como as correções se perdem — foi o que aconteceu com
o menu recolhido nos sprints 41 e 42.

## Agenda
- Cabeçalho em gradiente
- Cada sessão virou cartão com respiro, não linha de tabela
- **O bloco de hora carrega o status**: verde realizada, âmbar falta, cinza ainda por
  acontecer. Dá para varrer a coluna da esquerda e saber como foi o dia sem ler nada

## Sessão e ficha do paciente
Cabeçalho em gradiente e faixa no cartão de identificação. Mudança menor de propósito:
a tela de sessão é usada com criança do lado, e enfeite ali atrapalha.

## Arquivos
```
styles/components.css              linguagem compartilhada (v=9)
agenda/agenda.html                 herói e hora com status
sessao/sessao.html                 herói
pacientes/pasta.html               faixa no cartão
database/28_historico_importado.sql   arquivo que faltava
database/29_cpf.sql                   arquivo que faltava
sw.js                              versão 15
```

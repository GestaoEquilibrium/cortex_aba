# CORTEX aba — Sprints 58 e 61 · anamnese e avisos por perfil

## Sem SQL

## Sprint 58 · a anamnese sai do papel
Existe desde o sprint 21 e nunca foi usada, porque faltava o primeiro passo: alguém
precisa escrever o questionário.

**Configurações → Anamnese → Novo modelo → "Carregar um ponto de partida"**

Carrega um esqueleto de 10 seções e 30 perguntas, no formato que o construtor entende.
Testei a interpretação: 10 seções, 30 perguntas, 3 obrigatórias, com os três tipos de
campo em uso.

As seções cobrem o que se costuma levantar numa entrada de ABA infantil — sobre a
criança, gestação e nascimento, desenvolvimento, comunicação, rotina e autonomia,
interesses, comportamento, saúde, outros acompanhamentos e expectativas da família.

**É esqueleto, não modelo pronto.** O aviso ao carregar diz isso com todas as letras: a
anamnese certa depende de como a clínica trabalha, e ninguém de fora sabe. A coordenação
precisa tirar, acrescentar e reescrever antes de mandar para qualquer família.

Duas escolhas que vale explicar. As perguntas são **abertas quase sempre** — mãe
respondendo pelo celular escreve melhor em texto livre do que escolhendo opção. E só
**três são obrigatórias**, porque anamnese longa com campo obrigatório em tudo é
anamnese que ninguém termina.

## Sprint 61 · o sino separa de verdade
Antes havia um único grupo "coordena", que juntava recepção com coordenação e direção.
São necessidades diferentes, e aviso que não é seu faz a pessoa parar de abrir o sino.

| Perfil | Passa a ver |
|---|---|
| Aplicadora, estagiário | tarefas, evoluções, supervisão, sondagens · **+ pacientes seus sem PEI** |
| Recepção | tarefas, evoluções, supervisão, sondagens · **+ guias, anamneses sem resposta** |
| Coordenação, direção | tudo, mais anamneses para revisar |
| Supervisão clínica | o clínico, sem o administrativo |

Dois avisos novos:

**"X pacientes seus sem PEI"** — só para quem aplica, com a explicação de que a sessão
abre sem objetivo para registrar. Hoje isso valeria para os 32.

**"X anamneses sem resposta há mais de uma semana"** — só para a recepção, sugerindo o
lembrete no WhatsApp. Anamnese enviada e esquecida não vira informação nenhuma.

## Arquivos
```
configuracoes/index.html   ponto de partida da anamnese
shared/avisos.js           avisos por perfil (v=22)
sw.js                      versão 17
```

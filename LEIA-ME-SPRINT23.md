# CORTEX aba — Sprint 23 · indicadores de gestão

## Sem SQL
Tudo é calculado a partir do que já está no banco.

## Gestão → Indicadores
Tela nova, para direção, supervisão e coordenação. Período de 30, 90, 180 ou 365 dias.

### Ocupação por aplicador
Horas efetivamente atendidas dividido pela jornada contratada × dias úteis do período,
descontando os dias bloqueados. É o número que responde **"quanta demanda ainda cabe"**.

Quem não tem jornada cadastrada aparece como "sem jornada" em vez de entrar com valor
inventado no cálculo.

### Capacidade
Pacientes ativos, fila de espera, **horas livres** e objetivos em ensino. Horas livres é
o que sobra da jornada — o dado que sustenta decisão de contratar ou de abrir vaga.

### Absenteísmo
Taxa geral e três recortes: por dia da semana, por horário e os pacientes que mais
faltaram. Horário com falta crônica costuma ser logística da família, não da criança —
e resolve realocando, não conversando.

### Aderência à prescrição
Sessões realizadas dividido pelas prescritas no período, por paciente. Mostra quem está
recebendo menos do que foi prescrito. Pacientes sem número de sessões no cadastro ficam
de fora do cálculo, e a tela avisa quantos são.

### Guias vencidas
Bloco vermelho separado, com paciente, convênio e data. Atendimento com guia vencida
costuma virar glosa.

### Resultado clínico
Objetivos dominados no período e tempo médio até o domínio.

## Exportar
CSV com sessão por sessão do período, para conferência ou planilha.

## Uma escolha de método
Todos os cálculos mostram como foram feitos, numa nota abaixo do bloco. Indicador de
gestão sem método explícito vira discussão — "esses 62% saíram de onde?".

## Arquivos
```
indicadores/index.html   novo
shared/sidebar.js        item Indicadores no menu (v=9)
demais páginas           versão do menu
```

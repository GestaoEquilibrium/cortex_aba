# EQ ABA — Sprint 8 · coleta na sessão

## Antes de aplicar
Rodar o SQL do sprint 8 (registros_tentativa, evolucoes_diarias e permissões).

## O que muda
"Sessão de hoje" deixa de ser exemplo. Agora:

1. Lista as sessões de hoje. Aplicador vê só as dele; coordenação vê todas.
2. Mostra o cartão de segurança do paciente antes de tudo.
3. Traz os objetivos do PEI que estão em ensino ou manutenção, na ordem de prioridade.
4. Cada objetivo tem os alvos (se houver), três botões grandes e os quatro níveis de ajuda.
5. Cada toque grava uma tentativa. A trilha embaixo mostra o que já foi registrado,
   com a cor do resultado, e a porcentagem de independência atualiza na hora.
6. Ao encerrar, abre a evolução do dia com os marcadores de contexto (dormiu mal,
   não almoçou, medicação alterada...). A sessão vira "realizada".

## Sem internet
A tela nunca espera o servidor: o toque desenha na hora e a gravação vai para uma
fila no próprio aparelho. Quando a rede volta, sobe sozinha. Um aviso no topo mostra
quantos registros estão aguardando. Duplicidade é descartada na sincronização.

## Detalhes de comportamento
- A primeira tentativa muda a sessão para "em atendimento" sozinha
- Ao completar o número de tentativas do objetivo, os botões travam
- Encerrar sem escrever evolução pede confirmação
- Só quem é o aplicador daquela sessão registra; coordenação e supervisão corrigem

## Arquivos
```
sessao/sessao.html          reescrito, sem mock
shared/fila_offline.js      novo
```

## Fim do ciclo
Com este pacote dá para rodar um caso completo: cadastrar paciente, montar grade,
gerar sessão, criar PEI, aplicar e registrar. Falta transformar isso em gráfico —
que é o próximo passo natural.

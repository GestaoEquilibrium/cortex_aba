# EQ ABA — Sprint 5 · pasta do paciente e grade pela tela

## Antes de aplicar
Rodar o SQL do sprint 5: trigger `eq_valida_cronograma` (conflito de horário) e
função `salas_ocupadas` (aviso de sala).

## O que entra
`pacientes/pasta.html` — abre ao clicar no card ou na linha da lista.

- **Cabeçalho**: identidade, idade em anos e meses, aplicador titular, situação,
  convênio, faltas do mês e o cartão de segurança em destaque
- **Quatro indicadores**: sessões realizadas no mês, faltas, horários fixos e próxima sessão
- **Resumo**: cadastro completo e equipe do paciente. Guia vencida aparece em vermelho
- **Grade semanal**: adicionar e encerrar horários fixos, sem SQL
- **Sessões**: últimos registros com status
- **Linha do tempo**: cadastro, entrada, vínculos, primeira sessão e faltas recentes

## Regras aplicadas
- Conflito de horário é bloqueado no **banco**, não só na tela: mesmo profissional ou
  mesmo paciente, mesmo dia, horários que se sobrepõem e vigências que se cruzam.
  A mensagem que aparece no formulário vem do trigger.
- Sala ocupada **avisa** e deixa seguir — clínica improvisa espaço o tempo todo.
- Encerrar horário é `ativo = false` + `vigencia_fim`, nunca delete: as sessões
  já lançadas continuam no histórico.
- Primeiro horário com um aplicador cria o vínculo sozinho (titular se for o primeiro,
  secundário depois).
- Mudança de situação do paciente pede confirmação, porque altera listas e geração de sessões.

## Arquivos
```
pacientes/pasta.html    novo
pacientes/lista.html    card e linha agora abrem a pasta
```

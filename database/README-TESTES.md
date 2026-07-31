# Testes das regras automáticas

`98_testes.sql` monta cenários controlados e responde PASSOU ou FALHOU. **Só em banco de
teste** — ele cria e apaga a própria massa, com o prefixo `ZZTESTE`.

## Como rodar
Cole o conteúdo no SQL Editor e execute. O resultado aparece na aba de mensagens.

## As 15 regras cobertas

| # | Regra |
|---|---|
| 1 | Conflito de horário do mesmo profissional é bloqueado |
| 2 | Objetivo dominado vira manutenção e agenda 3 sondagens |
| 3 | Alvo **não** é promovido no meio da sessão |
| 4 | Sessão com um erro **não** promove o alvo |
| 5 | Três sessões perfeitas seguidas promovem |
| 6 | Faltou-veio-faltou **não** conta como faltas seguidas |
| 7 | Sala ocupada é bloqueada |
| 8 | Sala diferente no mesmo horário é aceita |
| 9 | Grade sem sala não é travada |
| 10 | Registros de aplicador e observador convivem |
| 11 | Concordância entre observadores calculada corretamente |
| 12 | Nenhuma tabela sem proteção de acesso |
| 13 | Encerramento desativa a grade |
| 14 | Encerramento cancela sessões futuras |
| 15 | Encerramento preserva o histórico |

## Testes que ficam de fora
Funções como `gerar_sessoes`, `relatorio_convenio` e `diagnostico_sistema` checam
permissão de usuário. No SQL Editor não existe sessão logada, então elas recusam por
princípio — e o arquivo avisa **PULADO** em vez de acusar falha onde não há.

Essas precisam ser conferidas pelas telas, com o roteiro de validação.

## Três erros silenciosos encontrados assim
1. **Alvo promovido no meio da sessão** — o critério rodava a cada tentativa
2. **Falta não consecutiva gerando contato** — a consulta numerava só as faltas
3. **Modo observador quebrado** — a trava antiga nunca foi removida, porque o nome
   usado no `drop` tinha 64 caracteres e o PostgreSQL corta em 63

Nenhum dos três quebrava o sistema. Todos faziam ele decidir errado em silêncio.

## Regra
Regra automática nova entra no sistema, teste dela entra aqui. Senão ela nunca é
exercitada até quebrar com paciente de verdade.

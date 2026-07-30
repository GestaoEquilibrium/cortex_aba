# EQ ABA — Sprint 2 · agenda e equipe

## Antes de aplicar
Rodar no SQL Editor o bloco do Sprint 2 (função `gerar_sessoes` + trigger de vínculo
automático de conta por e-mail).

## Arquivos
```
agenda/agenda.html          sessões do dia + lançamento de presença + grade da semana
equipe/index.html           profissionais e equipes, cadastro e ativação
shared/confirm_modal.js     modal de confirmação compartilhado (EqConfirm)
```
Nenhum arquivo existente foi alterado — por isso o `?v=` das páginas antigas continua em 2.
O `confirm_modal.js` entra como `?v=3` por ser novo.

## O que dá para fazer agora
- Navegar por dia, gerar as sessões a partir da grade e lançar presença
- Ver a grade fixa da semana montada a partir de `cronograma_terapeutico`
- Cadastrar equipes e profissionais pela tela, sem SQL
- Ativar/desativar profissional (só direção e supervisão)

## Liberar acesso de alguém
1. Cadastrar a pessoa em Equipe, com o e-mail dela
2. Supabase → Authentication → Users → Add user, com o MESMO e-mail
3. O trigger `trg_vincular_profissional` preenche o `auth_user_id` sozinho

## Regras aplicadas
- Toda ação de fluxo passa pelo `EqConfirm`: falta sem aviso, geração de sessões,
  desativar profissional
- Aplicador só altera sessão em que ele é o profissional (RLS); coordenação e
  recepção alteram todas
- Datas sempre em horário local, sem `toISOString()`
- `rpc()` sempre dentro de try/catch — nunca `.catch()` direto

## Ainda fora
Criar e editar a grade pela tela (hoje só por SQL), encaixe avulso, cobertura de
ausência e feriados.

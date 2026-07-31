# Atualização da pasta database/

Estes arquivos completam o histórico do banco, que estava parado no sprint 18.

| Arquivo | Vem do sprint | O que traz |
|---|---|---|
| `12_documentos_termos.sql` | 20 | documentos do paciente, termos, assinaturas, bucket privado |
| `13_anamnese.sql` | 21 | modelos, anamneses e as duas funções de acesso público |
| `14_agenda_avancada.sql` | 22 e 26 | feriados, ausências, cobertura, `gerar_sessoes` nova e as tarefas automáticas |
| `15_manutencao_alvos.sql` | 24 | sondagens, rotação de alvos e promoção automática |
| `16_supervisao_ioa.sql` | 25 | supervisão, checklist e cálculo de concordância |

Coloque na mesma pasta `database/` e atualize a tabela do `README.md` de lá.

**Ordem completa agora:** 01 a 11, depois 12 a 16, e `99_seed_demo.sql` só em base de teste.

## Cuidado com o 14
Ele **substitui** três funções que já existem: `gerar_sessoes`, `gerar_tarefas_evolucao`
e `gerar_tarefas_faltas`. Rodar de novo é seguro — é `create or replace` — mas rode o
arquivo inteiro, não pedaços.

## Confirmação
Depois de rodar tudo:

```sql
select routine_name from information_schema.routines
where routine_schema = 'public' order by routine_name;
```

Devem aparecer, entre outras: `alvos_do_dia`, `anamnese_abrir`, `anamnese_salvar`,
`calcular_ioa`, `gerar_sessoes`, `gerar_tarefas_evolucao`, `gerar_tarefas_faltas`,
`gerar_tarefas_sondagem`, `sugerir_cobertura`.

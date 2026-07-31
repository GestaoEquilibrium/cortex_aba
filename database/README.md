# Banco de dados — CORTEX aba

Todo o SQL do sistema, na ordem de execução. Com estes arquivos, o banco pode ser
recriado do zero num projeto Supabase vazio.

## Ordem

| Arquivo | O que cria |
|---|---|
| `01_fundacao.sql` | profissionais, equipes, funções de permissão, trava de autopromoção |
| `02_pacientes_agenda.sql` | pacientes, vínculos, cronograma, sessões, geração e conflito |
| `03_auditoria_fotos.sql` | trilha de auditoria e bucket privado de fotos |
| `04_biblioteca_pei.sql` | biblioteca de programas, PEI, objetivos e alvos |
| `05_coleta.sql` | tentativas e evolução diária |
| `06_tarefas.sql` | tarefas e geração automática |
| `07_comportamento.sql` | comportamentos-alvo, registros ABC e planos de manejo |
| `08_relatorios.sql` | relatórios mensais e trava do finalizado |
| `09_portal_familia.sql` | responsáveis, orientações e o que a família enxerga |
| `10_avaliacoes.sql` | protocolos, domínios, itens, avaliações e respostas |
| `11_configuracoes.sql` | configurações do sistema |
| `12_documentos_termos.sql` | documentos, termos e assinaturas |
| `13_anamnese.sql` | modelos, anamneses e funções de acesso público |
| `14_agenda_avancada.sql` | feriados, ausências, cobertura e tarefas automáticas |
| `15_manutencao_alvos.sql` | sondagens, rotação e promoção de alvos |
| `16_supervisao_ioa.sql` | supervisão, checklist e concordância entre observadores |
| `17_admissao.sql` | admissão, fila de espera e mapa de vagas |
| `18_encerramento.sql` | encerramento de acompanhamento e portabilidade de dados |
| `19_reforcadores.sql` | reforçadores e avaliação de preferência |
| `20_sugestao_programas.sql` | área do domínio e sugestão de programas |
| `98_testes.sql` | **só em banco de teste** — valida as regras automáticas |
| `99_seed_demo.sql` | **só em banco de teste** — massa fictícia |

## Recriar do zero

1. Criar projeto no Supabase
2. SQL Editor → rodar de `01` a `20`, na ordem
3. Authentication → Users → criar o usuário da direção
4. Inserir a linha correspondente em `profissionais`:

```sql
insert into public.profissionais (auth_user_id, nome_completo, email, perfil, turno)
select u.id, 'Seu Nome', u.email, 'admin_direcao', 'integral'
from auth.users u where u.email = 'SEU-EMAIL';
```

5. Preencher `config.js` com a URL e a anon key
6. Publicar a Edge Function `criar-acesso`

## Conferência obrigatória

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and rowsecurity = false;
```

Precisa vir **vazio**. Qualquer tabela aqui é falha grave: o repositório é público e a
anon key está no `config.js` — é o RLS que protege os dados.

## Funções que devem existir

```sql
select routine_name from information_schema.routines
where routine_schema = 'public' order by routine_name;
```

Entre outras: `alvos_do_dia`, `anamnese_abrir`, `anamnese_salvar`, `calcular_ioa`,
`exportar_paciente`, `fila_espera`, `gerar_sessoes`, `gerar_tarefas_evolucao`,
`gerar_tarefas_faltas`, `gerar_tarefas_preferencia`, `gerar_tarefas_sondagem`,
`mapa_vagas`, `resumo_acompanhamento`, `sugerir_cobertura`, `sugerir_programas`.

## Regra

Nenhuma alteração de banco entra pelo SQL Editor sem virar arquivo aqui. Foi assim que
o CORTEX original acabou sem histórico do próprio schema.

## Testes

Antes de subir qualquer mudança de regra automática, rode `98_testes.sql` num banco de
teste. Ele monta cenários e responde PASSOU ou FALHOU em nove regras.

Dois erros silenciosos já foram encontrados assim: alvo promovido no meio da sessão e
falta não consecutiva gerando contato com a família.

# Banco de dados — CORTEX aba

Todo o SQL do sistema, na ordem em que deve ser executado. Com estes arquivos, o
banco pode ser recriado do zero num projeto Supabase vazio.

## Ordem de execução

| Arquivo | O que cria |
|---|---|
| `01_fundacao.sql` | profissionais, equipes, funções de permissão, trava de autopromoção |
| `02_pacientes_agenda.sql` | pacientes, vínculos, cronograma, sessões, geração e validação de conflito |
| `03_auditoria_fotos.sql` | trilha de auditoria e bucket privado de fotos |
| `04_biblioteca_pei.sql` | biblioteca de programas, PEI, objetivos e alvos |
| `05_coleta.sql` | tentativas e evolução diária |
| `06_tarefas.sql` | tarefas e geração automática por faltas seguidas |
| `07_comportamento.sql` | comportamentos-alvo, registros ABC e planos de manejo |
| `08_relatorios.sql` | relatórios mensais e trava do finalizado |
| `09_portal_familia.sql` | responsáveis, orientações e o que a família enxerga |
| `10_avaliacoes.sql` | protocolos, domínios, itens, avaliações e respostas |
| `11_configuracoes.sql` | configurações do sistema com valores iniciais |
| `99_seed_demo.sql` | massa fictícia para teste — **nunca em produção com dados reais** |

## Recriar do zero

1. Criar projeto no Supabase
2. SQL Editor → executar de `01` a `11`, na ordem
3. Authentication → Users → criar o usuário da direção
4. Inserir a linha correspondente em `profissionais` (ver abaixo)
5. Preencher `config.js` com a URL e a anon key do projeto

```sql
insert into public.profissionais (auth_user_id, nome_completo, email, perfil, turno)
select u.id, 'Seu Nome', u.email, 'admin_direcao', 'integral'
from auth.users u where u.email = 'SEU-EMAIL';
```

## Conferência

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```

Toda tabela deve aparecer com `rowsecurity = true`. Qualquer `false` é falha grave:
o repositório é público e a anon key está no `config.js` — é o RLS que protege os dados.

## Regra daqui em diante

Nenhuma alteração de banco entra direto pelo SQL Editor sem virar arquivo aqui.
Foi assim que o CORTEX original acabou sem histórico do próprio schema.

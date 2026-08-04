-- ============================================================================
-- CORTEX aba — 30 · o detector passa a conhecer as migrations 28 e 29
-- ----------------------------------------------------------------------------
-- A `migrations_pendentes()` foi escrita quando a última era a 27. As duas
-- seguintes existem no banco mas não na lista: se faltassem num projeto novo,
-- o Diagnóstico não acusaria e a falha voltaria a ser silenciosa.
-- ============================================================================
create or replace function public.migrations_pendentes()
returns table (ordem integer, arquivo text, para_que text)
language sql stable security definer set search_path = public, pg_temp as $$
    with esperado(ordem, arquivo, objeto, tipo, para_que) as (values
        (12, '12_documentos_termos.sql', 'documentos_paciente',  'tabela', 'documentos e termos'),
        (13, '13_anamnese.sql',          'anamneses',            'tabela', 'anamnese pelo link'),
        (14, '14_agenda_avancada.sql',   'bloqueios_agenda',     'tabela', 'feriados e ausências'),
        (15, '15_manutencao_alvos.sql',  'sondagens_manutencao', 'tabela', 'sondagem de manutenção'),
        (16, '16_supervisao_ioa.sql',    'supervisoes',          'tabela', 'supervisão de fidelidade'),
        (17, '17_admissao.sql',          'admissoes',            'tabela', 'fila de espera'),
        (18, '18_encerramento.sql',      'encerramentos',        'tabela', 'alta e portabilidade'),
        (19, '19_reforcadores.sql',      'reforcadores',         'tabela', 'reforçadores'),
        (20, '20_sugestao_programas.sql','sugerir_programas',    'funcao', 'sugestão pela avaliação'),
        (21, '21_erros.sql',             'erros_sistema',        'tabela', 'registro de erros'),
        (22, '22_convenios.sql',         'relatorio_convenio',   'funcao', 'prestação de contas'),
        (23, '23_salas.sql',             'sala',        'coluna_sessoes', 'conflito de sala e agenda'),
        (25, '25_corrige_ioa.sql',       'idx_tent_unico',       'indice', 'modo observador'),
        (26, '26_backup.sql',            'backup_completo',      'funcao', 'cópia de segurança'),
        (27, '27_migrations.sql',        'migrations_pendentes', 'funcao', 'este aviso'),
        (28, '28_historico_importado.sql','idx_sessoes_importadas','indice','histórico não cobra evolução'),
        (29, '29_cpf.sql',               'eq_cpf_valido',        'funcao', 'CPF do paciente')
    )
    select e.ordem, e.arquivo, e.para_que
    from esperado e
    where not (case e.tipo
        when 'tabela' then exists (
            select 1 from pg_tables where schemaname = 'public' and tablename = e.objeto)
        when 'funcao' then exists (
            select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = e.objeto)
        when 'indice' then exists (
            select 1 from pg_indexes where schemaname = 'public' and indexname = e.objeto)
        when 'coluna_sessoes' then exists (
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sessoes' and column_name = e.objeto)
    end)
    order by e.ordem
$$;

revoke execute on function public.migrations_pendentes() from public, anon;
grant  execute on function public.migrations_pendentes() to authenticated;

notify pgrst, 'reload schema';

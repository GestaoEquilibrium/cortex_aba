-- ============================================================================
-- CORTEX aba — quais migrations ainda não foram rodadas
-- ----------------------------------------------------------------------------
-- Rode isto no SQL Editor. Ele confere se cada migration deixou sua marca no
-- banco e lista o que falta, na ordem.
--
-- Serve para o caso mais comum de erro: as telas foram atualizadas pelo
-- PowerShell, mas o SQL correspondente não foi executado. Aí a tela pede uma
-- coluna que não existe e o navegador devolve erro 400, sem dizer o motivo.
--
-- Não altera nada. É só leitura.
-- ============================================================================
with esperado(ordem, arquivo, objeto, tipo, para_que) as (values
    (12, '12_documentos_termos.sql', 'documentos_paciente',   'tabela',  'documentos e termos'),
    (13, '13_anamnese.sql',          'anamneses',             'tabela',  'anamnese pelo link'),
    (14, '14_agenda_avancada.sql',   'bloqueios_agenda',      'tabela',  'feriados e ausências'),
    (15, '15_manutencao_alvos.sql',  'sondagens_manutencao',  'tabela',  'sondagem de manutenção'),
    (16, '16_supervisao_ioa.sql',    'supervisoes',           'tabela',  'supervisão de fidelidade'),
    (17, '17_admissao.sql',          'admissoes',             'tabela',  'fila de espera'),
    (18, '18_encerramento.sql',      'encerramentos',         'tabela',  'alta e portabilidade'),
    (19, '19_reforcadores.sql',      'reforcadores',          'tabela',  'reforçadores'),
    (20, '20_sugestao_programas.sql','sugerir_programas',     'funcao',  'sugestão pela avaliação'),
    (21, '21_erros.sql',             'erros_sistema',         'tabela',  'registro de erros'),
    (22, '22_convenios.sql',         'relatorio_convenio',    'funcao',  'prestação de contas'),
    (23, '23_salas.sql',             'salas',                 'coluna_sessoes', 'conflito de sala'),
    (24, '24_diagnostico.sql',       'diagnostico_sistema',   'funcao',  'tela de diagnóstico'),
    (25, '25_corrige_ioa.sql',       'idx_tent_unico',        'indice',  'modo observador'),
    (26, '26_backup.sql',            'backup_completo',       'funcao',  'cópia de segurança')
),
conferido as (
    select e.*,
           case e.tipo
             when 'tabela' then exists (
                 select 1 from pg_tables
                  where schemaname = 'public' and tablename = e.objeto)
             when 'funcao' then exists (
                 select 1 from pg_proc p
                  join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = e.objeto)
             when 'indice' then exists (
                 select 1 from pg_indexes
                  where schemaname = 'public' and indexname = e.objeto)
             when 'coluna_sessoes' then exists (
                 select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'sessoes'
                    and column_name = e.objeto)
           end as aplicada
    from esperado e
)
select ordem,
       arquivo,
       case when aplicada then 'aplicada' else '>>> FALTA RODAR <<<' end as situacao,
       para_que
from conferido
order by aplicada, ordem;

-- ----------------------------------------------------------------------------
-- Se a coluna "situacao" mostrar FALTA RODAR em alguma linha, abra o arquivo
-- correspondente em database/ e rode no SQL Editor, na ordem do número.
--
-- Sintoma típico de migration faltando: a tela abre, mas a lista fica vazia e o
-- console do navegador mostra erro 400. Isso acontece porque a tela pede uma
-- coluna ou função que ainda não existe.
-- ----------------------------------------------------------------------------

-- Conferência extra: a trava antiga do modo observador ainda existe?
-- Se aparecer alguma linha aqui, o registro em modo observador vai falhar.
select conname as trava_antiga_ainda_presente,
       pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.registros_tentativa'::regclass
  and contype = 'u'
  and pg_get_constraintdef(oid) not like '%observador%';

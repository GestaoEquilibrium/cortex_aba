-- ============================================================================
-- CORTEX aba — 27 · o sistema avisa quando o banco está atrás das telas
-- ----------------------------------------------------------------------------
-- As telas são atualizadas pelo PowerShell e o SQL é rodado à mão, no SQL Editor.
-- Quando o segundo passo é esquecido, a tela pede uma coluna que não existe e o
-- navegador devolve 400 — sem dizer o motivo. Já aconteceu.
--
-- Aqui o banco passa a saber o que deveria ter, e o sistema mostra isso na cara
-- de quem pode resolver, em vez de esperar alguém abrir o console.
--
-- Cada migration é reconhecida por uma marca que ela deixa: uma tabela, uma
-- função, um índice ou uma coluna.
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
        (24, '24_diagnostico.sql',       'diagnostico_sistema',  'funcao', 'tela de diagnóstico'),
        (25, '25_corrige_ioa.sql',       'idx_tent_unico',       'indice', 'modo observador'),
        (26, '26_backup.sql',            'backup_completo',      'funcao', 'cópia de segurança'),
        (27, '27_migrations.sql',        'migrations_pendentes', 'funcao', 'este aviso')
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

-- ── entra no diagnóstico, no topo da lista ───────────────────────────────────
create or replace function public.diagnostico_sistema()
returns table (
    grupo text, item text, gravidade text,
    quantos integer, detalhe text, onde text
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
    v_n integer;
    v_txt text;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico') then
        return;
    end if;

    -- ── Banco atrás das telas ───────────────────────────────────────────────
    select count(*), string_agg(arquivo, ', ' order by ordem)
      into v_n, v_txt
      from public.migrations_pendentes();
    if v_n > 0 then
        return query select 'Banco de dados',
            'Atualização de banco não aplicada', 'alto', v_n,
            'As telas foram atualizadas mas o banco não. Telas que dependem disso ' ||
            'abrem vazias e devolvem erro. Rode em database/: ' || v_txt,
            'diagnostico/index.html';
    end if;

    -- ── Pacientes ───────────────────────────────────────────────────────────
    select count(*) into v_n from public.pacientes
     where status = 'ativo' and data_nascimento < '1990-01-01';
    select string_agg(nome_completo, ', ' order by nome_completo) into v_txt
      from (select nome_completo from public.pacientes
             where status = 'ativo' and data_nascimento < '1990-01-01'
             order by nome_completo limit 4) x;
    if v_n > 0 then
        return query select 'Pacientes', 'Data de nascimento provisória', 'alto', v_n,
            'A idade aparece errada em toda tela, e idade importa clinicamente. ' ||
            coalesce(v_txt, '') || case when v_n > 4 then ' e outros.' else '' end,
            'pacientes/lista.html';
    end if;

    select count(*) into v_n from public.pacientes p
     where p.status = 'ativo'
       and not exists (select 1 from public.cronograma_terapeutico c
                       where c.paciente_id = p.id and c.ativo);
    if v_n > 0 then
        return query select 'Pacientes', 'Ativo sem horário na grade', 'alto', v_n,
            'Não geram sessão e não aparecem na agenda.', 'pacientes/lista.html';
    end if;

    select count(*) into v_n from public.pacientes p
     where p.status = 'ativo'
       and not exists (select 1 from public.pei pe
                       where pe.paciente_id = p.id and pe.status = 'vigente');
    if v_n > 0 then
        return query select 'Pacientes', 'Ativo sem PEI vigente', 'medio', v_n,
            'A sessão abre sem objetivo para registrar.', 'pacientes/lista.html';
    end if;

    select count(*) into v_n from public.pacientes
     where status = 'ativo' and (responsavel_telefone is null or btrim(responsavel_telefone) = '');
    if v_n > 0 then
        return query select 'Pacientes', 'Sem telefone do responsável', 'medio', v_n,
            'Sem contato para falta, aviso ou anamnese.', 'pacientes/lista.html';
    end if;

    select count(*) into v_n from public.pacientes
     where status = 'ativo' and coalesce(sessoes_semana_prescritas, 0) = 0;
    if v_n > 0 then
        return query select 'Pacientes', 'Sem sessões prescritas', 'baixo', v_n,
            'Ficam fora do cálculo de aderência nos Indicadores.', 'indicadores/index.html';
    end if;

    -- ── Equipe ──────────────────────────────────────────────────────────────
    select count(*) into v_n from public.profissionais
     where ativo and (email like '%@%.local' or email is null);
    select string_agg(nome_completo, ', ' order by nome_completo) into v_txt
      from (select nome_completo from public.profissionais
             where ativo and (email like '%@%.local' or email is null)
             order by nome_completo limit 4) x;
    if v_n > 0 then
        return query select 'Equipe', 'E-mail provisório', 'alto', v_n,
            'Sem e-mail real não dá para criar acesso. ' || coalesce(v_txt,''), 'equipe/index.html';
    end if;

    select count(*) into v_n from public.profissionais where ativo and auth_user_id is null;
    if v_n > 0 then
        return query select 'Equipe', 'Sem acesso criado', 'medio', v_n,
            'A pessoa está cadastrada mas não consegue entrar.', 'equipe/index.html';
    end if;

    select count(*) into v_n from public.profissionais
     where ativo and perfil in ('aplicador','aplicador_itinerante','estagiario_aba')
       and coalesce(jornada_horas, 0) = 0;
    if v_n > 0 then
        return query select 'Equipe', 'Sem jornada contratada', 'medio', v_n,
            'Aparecem como "sem jornada" e ficam fora do cálculo de ocupação.',
            'equipe/index.html';
    end if;

    -- ── Configuração ────────────────────────────────────────────────────────
    if not exists (select 1 from public.configuracoes
                   where chave = 'clinica_nome' and btrim(valor #>> '{}') <> '') then
        return query select 'Configuração', 'Nome da clínica não preenchido', 'medio', 1,
            'Aparece em branco no cabeçalho dos relatórios e nas mensagens.',
            'configuracoes/index.html';
    end if;

    if not exists (select 1 from public.termos_modelos where ativo) then
        return query select 'Configuração', 'Nenhum termo de consentimento', 'alto', 1,
            'Sem termo, não há registro de consentimento da família.',
            'configuracoes/index.html';
    end if;

    if not exists (select 1 from public.anamnese_modelos where ativo) then
        return query select 'Configuração', 'Nenhum modelo de anamnese', 'baixo', 1,
            'Sem modelo, não dá para enviar o link à família.', 'configuracoes/index.html';
    end if;

    select count(*) into v_n from public.biblioteca_programas where ativo;
    if v_n < 5 then
        return query select 'Configuração', 'Biblioteca de programas quase vazia', 'medio', v_n,
            'Apenas ' || v_n || ' programa(s). O PEI depende dela.', 'programas/biblioteca.html';
    end if;

    -- ── Operação ────────────────────────────────────────────────────────────
    select count(*) into v_n from public.pacientes
     where status = 'ativo' and guia_validade is not null and guia_validade < current_date;
    if v_n > 0 then
        return query select 'Operação', 'Guias vencidas', 'alto', v_n,
            'Atendimento com guia vencida costuma virar glosa.', 'convenios/index.html';
    end if;

    select count(*) into v_n
      from public.sessoes s
      left join public.evolucoes_diarias e on e.sessao_id = s.id
     where s.status = 'realizada' and e.id is null
       and s.data >= current_date - 30 and s.data < current_date - 2;
    if v_n > 0 then
        return query select 'Operação', 'Sessões sem evolução', 'medio', v_n,
            'Realizadas há mais de 2 dias e ainda sem registro escrito.', 'tarefas/index.html';
    end if;

    select count(*) into v_n from public.sondagens_manutencao
     where data_realizada is null and data_prevista < current_date;
    if v_n > 0 then
        return query select 'Operação', 'Sondagens de manutenção vencidas', 'medio', v_n,
            'Objetivos dados como dominados sem verificação.', 'tarefas/index.html';
    end if;

    select count(*) into v_n from public.anamneses where status = 'respondida';
    if v_n > 0 then
        return query select 'Operação', 'Anamneses aguardando revisão', 'baixo', v_n,
            'A família respondeu e a equipe ainda não leu.', 'pacientes/lista.html';
    end if;

    select count(*) into v_n from public.supervisoes where ciente_em is null;
    if v_n > 0 then
        return query select 'Operação', 'Supervisões sem ciência', 'baixo', v_n,
            'A devolutiva só fecha o ciclo quando a pessoa lê.', 'supervisao/index.html';
    end if;

    -- ── Segurança ───────────────────────────────────────────────────────────
    select count(*) into v_n
      from pg_tables t where t.schemaname = 'public' and t.rowsecurity = false;
    if v_n > 0 then
        return query select 'Segurança', 'Tabela sem proteção de acesso', 'alto', v_n,
            'Falha grave: o repositório é público e a chave do site também. ' ||
            'É a proteção no banco que impede leitura indevida.', 'auditoria/index.html';
    end if;

    -- a trava antiga do observador é falha silenciosa: só aparece na sala
    select count(*) into v_n from pg_constraint
     where conrelid = 'public.registros_tentativa'::regclass and contype = 'u'
       and pg_get_constraintdef(oid) not like '%observador%';
    if v_n > 0 then
        return query select 'Segurança', 'Modo observador travado', 'alto', v_n,
            'A trava antiga não foi removida: registrar em modo observador vai falhar. ' ||
            'Rode database/25_corrige_ioa.sql.', 'supervisao/index.html';
    end if;

    return;
end $$;

revoke execute on function public.diagnostico_sistema() from public, anon;
grant  execute on function public.diagnostico_sistema() to authenticated;

notify pgrst, 'reload schema';

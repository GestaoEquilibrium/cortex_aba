-- ============================================================================
-- CORTEX aba — 24 · diagnóstico do sistema
-- ----------------------------------------------------------------------------
-- Depois de importar uma base, muita coisa fica pela metade: data de nascimento
-- provisória, profissional sem jornada, paciente sem PEI. Nada disso quebra o
-- sistema — ele só passa a mostrar número errado sem avisar.
--
-- Esta função varre tudo e devolve o que está incompleto, com quantos casos e
-- para onde ir resolver. É o roteiro de implantação virando tela.
-- ============================================================================
create or replace function public.diagnostico_sistema()
returns table (
    grupo     text,
    item      text,
    gravidade text,      -- alto, medio, baixo
    quantos   integer,
    detalhe   text,
    onde      text
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
    v_n integer;
    v_txt text;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico') then
        return;
    end if;

    -- ── Pacientes ───────────────────────────────────────────────────────────
    -- 1900-01-01 é o marcador da importação; qualquer coisa antes de 1990 numa
    -- clínica infantil também é engano de digitação
    -- conta o total, mas lista só alguns nomes: `limit` dentro da subconsulta
    -- limitaria a contagem também, e o número mostrado sairia menor que o real
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

    select count(*) into v_n from public.profissionais
     where ativo and auth_user_id is null;
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
    -- O repositório é público e a chave do frontend também: é o RLS que protege.
    select count(*) into v_n
      from pg_tables t
     where t.schemaname = 'public' and t.rowsecurity = false;
    if v_n > 0 then
        return query select 'Segurança', 'Tabela sem proteção de acesso', 'alto', v_n,
            'Falha grave: o repositório é público e a chave do site também. ' ||
            'É a proteção no banco que impede leitura indevida.', 'auditoria/index.html';
    end if;

    return;
end $$;

revoke execute on function public.diagnostico_sistema() from public, anon;
grant  execute on function public.diagnostico_sistema() to authenticated;

notify pgrst, 'reload schema';

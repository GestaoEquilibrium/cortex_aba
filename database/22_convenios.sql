-- ============================================================================
-- CORTEX aba — 22 · prestação de contas ao convênio
-- ----------------------------------------------------------------------------
-- A clínica atende por convênio e controla validade de guia, mas não havia como
-- juntar as duas coisas. O risco concreto é atender com guia vencida e descobrir
-- na glosa, quando o dinheiro já não vem.
-- ============================================================================

-- 1. Número da guia por paciente ----------------------------------------------
-- A validade já existia em `pacientes`; faltava o número, que o convênio exige
-- na prestação de contas.
alter table public.pacientes add column if not exists guia_numero text;
alter table public.pacientes add column if not exists guia_sessoes_autorizadas integer;
alter table public.pacientes add column if not exists carteirinha text;

-- 2. Sessões prestáveis, com o estado da guia no dia do atendimento ------------
create or replace function public.relatorio_convenio(
    p_convenio text default null,
    p_ini      date default null,
    p_fim      date default null
)
returns table (
    paciente_id     uuid,
    paciente        text,
    carteirinha     text,
    convenio        text,
    guia_numero     text,
    guia_validade   date,
    autorizadas     integer,
    data            date,
    hora            time,
    duracao_min     integer,
    profissional    text,
    conselho        text,
    status          text,
    guia_vencida    boolean
)
language sql stable security definer set search_path = public, pg_temp as $$
    select p.id, p.nome_completo, p.carteirinha, p.convenio,
           p.guia_numero, p.guia_validade, p.guia_sessoes_autorizadas,
           s.data, s.hora_inicio, s.duracao_min,
           pr.nome_completo,
           coalesce(pr.registro_conselho, ''),
           s.status,
           -- vencida NA DATA DO ATENDIMENTO, não hoje: é isso que o convênio olha
           (p.guia_validade is not null and p.guia_validade < s.data)
    from public.sessoes s
    join public.pacientes p     on p.id = s.paciente_id
    left join public.profissionais pr on pr.id = s.profissional_id
    where s.status = 'realizada'
      and (p_convenio is null or p.convenio = p_convenio)
      and (p_ini is null or s.data >= p_ini)
      and (p_fim is null or s.data <= p_fim)
      and public.eq_ve_paciente(p.id)
    order by p.nome_completo, s.data, s.hora_inicio
$$;

revoke execute on function public.relatorio_convenio(text, date, date) from public, anon;
grant  execute on function public.relatorio_convenio(text, date, date) to authenticated;

-- 3. Resumo por paciente, com o que passou do autorizado ------------------------
create or replace function public.resumo_convenio(
    p_convenio text default null,
    p_ini      date default null,
    p_fim      date default null
)
returns table (
    paciente_id      uuid,
    paciente         text,
    convenio         text,
    guia_numero      text,
    guia_validade    date,
    autorizadas      integer,
    realizadas       integer,
    com_guia_vencida integer,
    minutos          integer,
    excedeu          boolean
)
language sql stable security definer set search_path = public, pg_temp as $$
    select p.id, p.nome_completo, p.convenio, p.guia_numero, p.guia_validade,
           p.guia_sessoes_autorizadas,
           count(*)::integer,
           count(*) filter (where p.guia_validade is not null and p.guia_validade < s.data)::integer,
           coalesce(sum(s.duracao_min), 0)::integer,
           (p.guia_sessoes_autorizadas is not null
            and count(*) > p.guia_sessoes_autorizadas)
    from public.sessoes s
    join public.pacientes p on p.id = s.paciente_id
    where s.status = 'realizada'
      and (p_convenio is null or p.convenio = p_convenio)
      and (p_ini is null or s.data >= p_ini)
      and (p_fim is null or s.data <= p_fim)
      and public.eq_ve_paciente(p.id)
    group by p.id, p.nome_completo, p.convenio, p.guia_numero,
             p.guia_validade, p.guia_sessoes_autorizadas
    order by p.nome_completo
$$;

revoke execute on function public.resumo_convenio(text, date, date) from public, anon;
grant  execute on function public.resumo_convenio(text, date, date) to authenticated;

-- 4. Aviso antes de virar glosa -------------------------------------------------
-- Guia vencendo em 15 dias ou sessões acabando: tarefa para a recepção resolver
-- antes, e não depois que o atendimento já aconteceu.
create or replace function public.gerar_tarefas_guia()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_criadas integer := 0; r record; v_realizadas integer;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','recepcao') then
        return 0;
    end if;

    for r in
        select p.id, p.nome_completo, p.convenio, p.guia_validade,
               p.guia_sessoes_autorizadas, p.equipe_id
        from public.pacientes p
        where p.status = 'ativo'
          and p.convenio is not null
          and p.convenio <> 'particular'
    loop
        -- guia vencida ou vencendo
        if r.guia_validade is not null and r.guia_validade <= current_date + 15 then
            insert into public.tarefas
                (titulo, descricao, tipo, paciente_id, criado_por, prazo, prioridade,
                 origem, chave_unica)
            values
                (case when r.guia_validade < current_date
                      then 'Guia VENCIDA — ' || r.nome_completo
                      else 'Guia vencendo — ' || r.nome_completo end,
                 'Convênio ' || r.convenio || '. Validade ' ||
                 to_char(r.guia_validade, 'DD/MM/YYYY') || '. ' ||
                 case when r.guia_validade < current_date
                      then 'Atendimento com guia vencida costuma virar glosa.'
                      else 'Renove antes de vencer para não interromper o atendimento.' end,
                 'outro', r.id, public.eq_prof_id(),
                 r.guia_validade, 
                 case when r.guia_validade < current_date then 'alta' else 'media' end,
                 'automatica', 'guia:' || r.id || ':' || r.guia_validade)
            on conflict (chave_unica) do nothing;
            if found then v_criadas := v_criadas + 1; end if;
        end if;

        -- sessões autorizadas acabando
        if r.guia_sessoes_autorizadas is not null then
            select count(*) into v_realizadas
              from public.sessoes s
             where s.paciente_id = r.id and s.status = 'realizada'
               and (r.guia_validade is null or s.data <= r.guia_validade);

            if v_realizadas >= r.guia_sessoes_autorizadas - 4 then
                insert into public.tarefas
                    (titulo, descricao, tipo, paciente_id, criado_por, prazo, prioridade,
                     origem, chave_unica)
                values
                    ('Sessões autorizadas acabando — ' || r.nome_completo,
                     v_realizadas || ' de ' || r.guia_sessoes_autorizadas ||
                     ' sessões já realizadas no convênio ' || r.convenio ||
                     '. Peça nova autorização antes de estourar.',
                     'outro', r.id, public.eq_prof_id(),
                     current_date + 7, 'media', 'automatica',
                     'autorizacao:' || r.id || ':' || v_realizadas)
                on conflict (chave_unica) do nothing;
                if found then v_criadas := v_criadas + 1; end if;
            end if;
        end if;
    end loop;

    return v_criadas;
end $$;

revoke execute on function public.gerar_tarefas_guia() from public, anon;
grant  execute on function public.gerar_tarefas_guia() to authenticated;

notify pgrst, 'reload schema';

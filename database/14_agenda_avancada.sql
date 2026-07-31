-- ============================================================================
-- CORTEX aba — 14 · feriados, ausências, cobertura e tarefas automáticas
-- ============================================================================
create table if not exists public.bloqueios_agenda (
    id         uuid primary key default gen_random_uuid(),
    data       date not null,
    descricao  text not null,
    tipo       text not null default 'feriado' check (tipo in ('feriado','recesso','evento','outro')),
    equipe_id  uuid references public.equipes_aba(id) on delete cascade,
    criado_por uuid references public.profissionais(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (data, equipe_id)
);
create index if not exists idx_bloq_data on public.bloqueios_agenda(data);

create table if not exists public.ausencias_profissional (
    id              uuid primary key default gen_random_uuid(),
    profissional_id uuid not null references public.profissionais(id) on delete cascade,
    data_inicio     date not null,
    data_fim        date not null,
    motivo          text not null default 'outro' check (motivo in
                    ('ferias','atestado','folga','licenca','outro')),
    observacao      text,
    registrado_por  uuid references public.profissionais(id) on delete set null,
    created_at      timestamptz not null default now(),
    check (data_fim >= data_inicio)
);
create index if not exists idx_aus_prof on public.ausencias_profissional(profissional_id, data_inicio);

alter table public.bloqueios_agenda       enable row level security;
alter table public.ausencias_profissional enable row level security;

drop policy if exists bloq_select on public.bloqueios_agenda;
create policy bloq_select on public.bloqueios_agenda for select to authenticated
using (public.eq_prof_id() is not null);
drop policy if exists bloq_escrita on public.bloqueios_agenda;
create policy bloq_escrita on public.bloqueios_agenda for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

drop policy if exists aus_select on public.ausencias_profissional;
create policy aus_select on public.ausencias_profissional for select to authenticated
using (public.eq_prof_id() is not null);
drop policy if exists aus_escrita on public.ausencias_profissional;
create policy aus_escrita on public.ausencias_profissional for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

-- geração passa a respeitar feriado e ausência
create or replace function public.gerar_sessoes(p_data date default current_date)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
    v_perfil text := public.eq_perfil();
    v_equipe uuid := public.eq_equipe_id();
    v_criadas integer;
begin
    if v_perfil is null or v_perfil not in ('admin_direcao','coordenador_aba','recepcao') then
        raise exception 'Sem permissão para gerar sessões.';
    end if;

    if exists (select 1 from public.bloqueios_agenda b
               where b.data = p_data and b.equipe_id is null) then
        return 0;
    end if;

    insert into public.sessoes (paciente_id, profissional_id, cronograma_id, data,
                                hora_inicio, duracao_min, status, origem, registrado_por)
    select c.paciente_id, c.profissional_id, c.id, p_data,
           c.hora_inicio, c.duracao_min, 'agendada', 'grade', public.eq_prof_id()
    from public.cronograma_terapeutico c
    join public.pacientes pa on pa.id = c.paciente_id
    where c.ativo
      and c.dia_semana = extract(dow from p_data)
      and c.vigencia_inicio <= p_data
      and (c.vigencia_fim is null or c.vigencia_fim >= p_data)
      and pa.status = 'ativo'
      and (v_perfil in ('admin_direcao','recepcao') or pa.equipe_id = v_equipe)
      and not exists (select 1 from public.bloqueios_agenda b
                      where b.data = p_data and b.equipe_id = pa.equipe_id)
      and not exists (select 1 from public.ausencias_profissional a
                      where a.profissional_id = c.profissional_id
                        and p_data between a.data_inicio and a.data_fim)
    on conflict (paciente_id, data, hora_inicio) do nothing;

    get diagnostics v_criadas = row_count;
    return v_criadas;
end $$;

create or replace function public.sugerir_cobertura(p_data date, p_hora time, p_duracao integer)
returns table (id uuid, nome text, perfil text, ja_atende_paciente boolean)
language sql stable security definer set search_path = public, pg_temp as $$
    select p.id, p.nome_completo, p.perfil, false
    from public.profissionais p
    where p.ativo
      and p.perfil in ('aplicador','aplicador_itinerante','estagiario_aba','coordenador_aba')
      and not exists (select 1 from public.ausencias_profissional a
                      where a.profissional_id = p.id
                        and p_data between a.data_inicio and a.data_fim)
      and not exists (
          select 1 from public.sessoes s
          where s.profissional_id = p.id and s.data = p_data
            and s.status not in ('cancelada_clinica','remarcada','feriado')
            and s.hora_inicio < (p_hora + (p_duracao || ' minutes')::interval)
            and p_hora < (s.hora_inicio + (s.duracao_min || ' minutes')::interval))
    order by case p.perfil when 'aplicador_itinerante' then 1 when 'aplicador' then 2
                           when 'estagiario_aba' then 3 else 4 end, p.nome_completo
$$;

revoke execute on function public.sugerir_cobertura(date, time, integer) from public, anon;
grant  execute on function public.sugerir_cobertura(date, time, integer) to authenticated;

-- tarefa de evolução atrasada (prazo vem de Configurações)
create or replace function public.gerar_tarefas_evolucao()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_criadas integer := 0; v_prazo integer; r record;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico') then
        return 0;
    end if;

    select coalesce((valor #>> '{}')::integer, 2) into v_prazo
      from public.configuracoes where chave = 'prazo_evolucao_dias';
    if v_prazo is null then v_prazo := 2; end if;

    for r in
        select s.profissional_id, count(*) as quantas, min(s.data) as mais_antiga
        from public.sessoes s
        left join public.evolucoes_diarias e on e.sessao_id = s.id
        where s.status = 'realizada' and e.id is null
          and s.data < current_date - v_prazo and s.data >= current_date - 30
          and s.profissional_id is not null
        group by s.profissional_id
    loop
        insert into public.tarefas
            (titulo, descricao, tipo, responsavel_id, criado_por, prazo, prioridade, origem, chave_unica)
        values ('Evoluções pendentes',
             r.quantas || ' sessão(ões) realizada(s) sem evolução escrita. A mais antiga é de ' ||
             to_char(r.mais_antiga, 'DD/MM/YYYY') || '.',
             'evolucao', r.profissional_id, public.eq_prof_id(),
             current_date, 'media', 'automatica',
             'evolucao:' || r.profissional_id || ':' || to_char(current_date, 'YYYY-MM-DD'))
        on conflict (chave_unica) do nothing;
        if found then v_criadas := v_criadas + 1; end if;
    end loop;
    return v_criadas;
end $$;

revoke execute on function public.gerar_tarefas_evolucao() from public, anon;
grant  execute on function public.gerar_tarefas_evolucao() to authenticated;

-- faltas seguidas: o limite vem de Configurações → Operação
create or replace function public.gerar_tarefas_faltas()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_criadas integer := 0; v_limite integer; r record;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico','recepcao') then
        return 0;
    end if;

    select coalesce((valor #>> '{}')::integer, 2) into v_limite
      from public.configuracoes where chave = 'faltas_para_tarefa';
    if v_limite is null or v_limite < 1 then v_limite := 2; end if;

    for r in
        with faltas as (
            select s.paciente_id, s.data,
                   row_number() over (partition by s.paciente_id order by s.data) as seq
            from public.sessoes s
            where s.status in ('falta_injustificada','falta_justificada')
              and s.data >= current_date - 30
        ),
        seguidas as (
            select f1.paciente_id, max(f2.data) as data_ultima
            from faltas f1
            join faltas f2 on f2.paciente_id = f1.paciente_id
                          and f2.seq between f1.seq + 1 and f1.seq + (v_limite - 1)
            group by f1.paciente_id, f1.seq
            having count(*) = v_limite - 1
        )
        select sg.paciente_id, max(sg.data_ultima) as data_ultima, p.nome_completo, p.equipe_id
        from seguidas sg join public.pacientes p on p.id = sg.paciente_id
        where p.status = 'ativo'
        group by sg.paciente_id, p.nome_completo, p.equipe_id
    loop
        insert into public.tarefas
            (titulo, descricao, tipo, paciente_id, responsavel_id, criado_por,
             prazo, prioridade, origem, chave_unica)
        values ('Contatar responsável — faltas seguidas',
             r.nome_completo || ' faltou em ' || v_limite || ' sessões consecutivas. Última falta em ' ||
             to_char(r.data_ultima, 'DD/MM/YYYY') || '. Falta repetida é o principal sinal de desistência.',
             'contato_familia', r.paciente_id,
             (select coordenador_id from public.equipes_aba where id = r.equipe_id),
             public.eq_prof_id(), current_date, 'alta', 'automatica',
             'falta:' || r.paciente_id || ':' || r.data_ultima)
        on conflict (chave_unica) do nothing;
        if found then v_criadas := v_criadas + 1; end if;
    end loop;
    return v_criadas;
end $$;

notify pgrst, 'reload schema';

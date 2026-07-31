-- ============================================================================
-- CORTEX aba — 15 · sondagem de manutenção e rotação de alvos
-- ============================================================================
create table if not exists public.sondagens_manutencao (
    id              uuid primary key default gen_random_uuid(),
    pei_programa_id uuid not null references public.pei_programas(id) on delete cascade,
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    data_prevista   date not null,
    data_realizada  date,
    resultado       text check (resultado in ('manteve','perdeu','parcial')),
    percentual      integer check (percentual between 0 and 100),
    observacao      text,
    registrado_por  uuid references public.profissionais(id) on delete set null,
    created_at      timestamptz not null default now(),
    unique (pei_programa_id, data_prevista)
);

create index if not exists idx_sond_prev on public.sondagens_manutencao(data_prevista)
    where data_realizada is null;
create index if not exists idx_sond_pac on public.sondagens_manutencao(paciente_id);

alter table public.sondagens_manutencao enable row level security;

drop policy if exists sond_select on public.sondagens_manutencao;
create policy sond_select on public.sondagens_manutencao for select to authenticated
using (public.eq_ve_paciente(paciente_id));
drop policy if exists sond_escrita on public.sondagens_manutencao;
create policy sond_escrita on public.sondagens_manutencao for all to authenticated
using  (public.eq_ve_paciente(paciente_id)) with check (public.eq_ve_paciente(paciente_id));

-- dominado não é ponto final: vira manutenção com sondagens agendadas
create or replace function public.eq_agenda_sondagens()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_dias integer[]; d integer;
begin
    if new.status = 'dominado' and old.status is distinct from 'dominado' then
        select coalesce(manutencao_dias, array[15,30,60]) into v_dias
          from public.biblioteca_programas where id = new.programa_id;
        foreach d in array v_dias loop
            insert into public.sondagens_manutencao (pei_programa_id, paciente_id, data_prevista)
            values (new.id, new.paciente_id, current_date + d)
            on conflict (pei_programa_id, data_prevista) do nothing;
        end loop;
        new.status := 'em_manutencao';
        new.data_status := current_date;
    end if;
    return new;
end $$;

drop trigger if exists trg_agenda_sondagens on public.pei_programas;
create trigger trg_agenda_sondagens before update on public.pei_programas
    for each row execute function public.eq_agenda_sondagens();

alter table public.pei_alvos add column if not exists ultima_aplicacao date;
alter table public.pei_alvos add column if not exists acertos_seguidos integer not null default 0;
alter table public.pei_alvos add column if not exists dominado_em date;

create or replace function public.alvos_do_dia(p_pei_programa uuid, p_manutencao integer default 2)
returns table (id uuid, nome text, status text, ultima_aplicacao date)
language sql stable security definer set search_path = public, pg_temp as $$
    (select a.id, a.nome, a.status, a.ultima_aplicacao
       from public.pei_alvos a
      where a.pei_programa_id = p_pei_programa and a.status = 'aquisicao'
      order by a.ordem)
    union all
    (select a.id, a.nome, a.status, a.ultima_aplicacao
       from public.pei_alvos a
      where a.pei_programa_id = p_pei_programa and a.status = 'manutencao'
      order by a.ultima_aplicacao nulls first, a.ordem
      limit greatest(p_manutencao, 0))
$$;

revoke execute on function public.alvos_do_dia(uuid, integer) from public, anon;
grant  execute on function public.alvos_do_dia(uuid, integer) to authenticated;

create or replace function public.eq_avalia_alvo()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_alvo record; v_data date; v_indep integer; v_total integer;
begin
    if new.alvo_id is null then return new; end if;

    select * into v_alvo from public.pei_alvos where id = new.alvo_id;
    if not found or v_alvo.status <> 'aquisicao' then
        update public.pei_alvos set ultima_aplicacao = current_date where id = new.alvo_id;
        return new;
    end if;

    select s.data into v_data from public.sessoes s where s.id = new.sessao_id;

    select count(*) filter (where resultado = 'independente'), count(*)
      into v_indep, v_total
      from public.registros_tentativa r
      join public.sessoes s on s.id = r.sessao_id
     where r.alvo_id = new.alvo_id and s.data = v_data;

    if v_total >= 3 and v_indep = v_total then
        update public.pei_alvos
           set acertos_seguidos = acertos_seguidos + 1, ultima_aplicacao = current_date
         where id = new.alvo_id;
        update public.pei_alvos
           set status = 'manutencao', dominado_em = current_date
         where id = new.alvo_id and acertos_seguidos >= 3;
    else
        update public.pei_alvos
           set acertos_seguidos = case when v_total >= 3 then 0 else acertos_seguidos end,
               ultima_aplicacao = current_date
         where id = new.alvo_id;
    end if;
    return new;
end $$;

drop trigger if exists trg_avalia_alvo on public.registros_tentativa;
create trigger trg_avalia_alvo after insert on public.registros_tentativa
    for each row execute function public.eq_avalia_alvo();

create or replace function public.gerar_tarefas_sondagem()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_criadas integer := 0; r record;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico') then
        return 0;
    end if;

    for r in
        select s.id, s.paciente_id, s.data_prevista, p.nome_completo,
               b.nome as programa, pp.profissional_id
        from public.sondagens_manutencao s
        join public.pacientes p            on p.id  = s.paciente_id
        join public.pei_programas pp       on pp.id = s.pei_programa_id
        join public.biblioteca_programas b on b.id  = pp.programa_id
        where s.data_realizada is null and s.data_prevista <= current_date
          and p.status = 'ativo'
    loop
        insert into public.tarefas
            (titulo, descricao, tipo, paciente_id, responsavel_id, criado_por,
             prazo, prioridade, origem, chave_unica)
        values ('Sondagem de manutenção — ' || r.programa,
             'Verificar se ' || r.nome_completo || ' mantém o objetivo "' || r.programa ||
             '", dominado anteriormente. Prevista para ' || to_char(r.data_prevista,'DD/MM/YYYY') || '.',
             'supervisao', r.paciente_id, r.profissional_id, public.eq_prof_id(),
             r.data_prevista, 'media', 'automatica', 'sondagem:' || r.id)
        on conflict (chave_unica) do nothing;
        if found then v_criadas := v_criadas + 1; end if;
    end loop;
    return v_criadas;
end $$;

revoke execute on function public.gerar_tarefas_sondagem() from public, anon;
grant  execute on function public.gerar_tarefas_sondagem() to authenticated;

notify pgrst, 'reload schema';

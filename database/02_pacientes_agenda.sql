-- ============================================================================
-- CORTEX aba — 02 · pacientes, vínculos, cronograma e sessões
-- ============================================================================
create table if not exists public.pacientes (
    id                        uuid primary key default gen_random_uuid(),
    nome_completo             text not null,
    data_nascimento           date not null,
    sexo                      text check (sexo in ('masculino','feminino','outro')),
    responsavel_nome          text,
    responsavel_cpf           text,
    responsavel_telefone      text,
    responsavel_email         text,
    escola                    text,
    medico_encaminhador       text,
    cid                       text,
    convenio                  text,
    sessoes_semana_prescritas integer check (sessoes_semana_prescritas between 0 and 20),
    guia_validade             date,
    cartao_seguranca          text,
    foto_url                  text,
    equipe_id                 uuid references public.equipes_aba(id) on delete set null,
    status                    text not null default 'fila_espera'
                              check (status in ('fila_espera','ativo','suspenso','alta','desligado')),
    data_entrada              date,
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now()
);

create table if not exists public.vinculos_paciente_aplicador (
    id              uuid primary key default gen_random_uuid(),
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    profissional_id uuid not null references public.profissionais(id) on delete cascade,
    tipo            text not null default 'titular' check (tipo in ('titular','secundario','cobertura')),
    data_inicio     date not null default current_date,
    data_fim        date,
    ativo           boolean not null default true,
    created_at      timestamptz not null default now()
);

create table if not exists public.cronograma_terapeutico (
    id              uuid primary key default gen_random_uuid(),
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    profissional_id uuid not null references public.profissionais(id) on delete restrict,
    dia_semana      smallint not null check (dia_semana between 0 and 6),
    hora_inicio     time not null,
    duracao_min     integer not null default 60,
    sala            text,
    vigencia_inicio date not null default current_date,
    vigencia_fim    date,
    ativo           boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists public.sessoes (
    id                  uuid primary key default gen_random_uuid(),
    paciente_id         uuid not null references public.pacientes(id) on delete cascade,
    profissional_id     uuid not null references public.profissionais(id) on delete restrict,
    cronograma_id       uuid references public.cronograma_terapeutico(id) on delete set null,
    data                date not null,
    hora_inicio         time not null,
    duracao_min         integer not null default 60,
    status              text not null default 'agendada' check (status in (
                            'agendada','em_andamento','realizada','falta_justificada',
                            'falta_injustificada','cancelada_clinica','remarcada','substituicao','feriado')),
    origem              text not null default 'grade' check (origem in ('grade','encaixe','reposicao')),
    observacao          text,
    registrado_por      uuid references public.profissionais(id) on delete set null,
    status_alterado_em  timestamptz,
    status_alterado_por uuid references public.profissionais(id) on delete set null,
    realizada_em        timestamptz,
    realizada_por       uuid references public.profissionais(id) on delete set null,
    motivo_alteracao    text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (paciente_id, data, hora_inicio)
);

create index if not exists idx_pac_status on public.pacientes(status);
create index if not exists idx_pac_equipe on public.pacientes(equipe_id);
create index if not exists idx_vinc_pac   on public.vinculos_paciente_aplicador(paciente_id) where ativo;
create index if not exists idx_vinc_prof  on public.vinculos_paciente_aplicador(profissional_id) where ativo;
create index if not exists idx_cron_pac   on public.cronograma_terapeutico(paciente_id) where ativo;
create index if not exists idx_sess_data  on public.sessoes(data);
create index if not exists idx_sess_prof  on public.sessoes(profissional_id, data);
create index if not exists idx_sess_pac   on public.sessoes(paciente_id, data);

drop trigger if exists trg_pac_updated  on public.pacientes;
create trigger trg_pac_updated  before update on public.pacientes
    for each row execute function public.set_updated_at();
drop trigger if exists trg_cron_updated on public.cronograma_terapeutico;
create trigger trg_cron_updated before update on public.cronograma_terapeutico
    for each row execute function public.set_updated_at();
drop trigger if exists trg_sess_updated on public.sessoes;
create trigger trg_sess_updated before update on public.sessoes
    for each row execute function public.set_updated_at();

create or replace function public.eq_ve_paciente(p_paciente uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
    select case
        when public.eq_perfil() in ('admin_direcao','supervisor_clinico','recepcao','aplicador_itinerante')
            then true
        when public.eq_perfil() = 'coordenador_aba'
            then exists (select 1 from public.pacientes p
                         where p.id = p_paciente and p.equipe_id = public.eq_equipe_id())
        when public.eq_perfil() in ('aplicador','estagiario_aba')
            then exists (select 1 from public.vinculos_paciente_aplicador v
                         where v.paciente_id = p_paciente
                           and v.profissional_id = public.eq_prof_id() and v.ativo)
        else false
    end $$;

revoke execute on function public.eq_ve_paciente(uuid) from public, anon;
grant  execute on function public.eq_ve_paciente(uuid) to authenticated;

alter table public.pacientes                   enable row level security;
alter table public.vinculos_paciente_aplicador enable row level security;
alter table public.cronograma_terapeutico      enable row level security;
alter table public.sessoes                     enable row level security;

drop policy if exists pac_select on public.pacientes;
create policy pac_select on public.pacientes for select to authenticated
using (public.eq_ve_paciente(id));

drop policy if exists pac_escrita on public.pacientes;
create policy pac_escrita on public.pacientes for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

drop policy if exists vinc_select on public.vinculos_paciente_aplicador;
create policy vinc_select on public.vinculos_paciente_aplicador for select to authenticated
using (public.eq_ve_paciente(paciente_id) or profissional_id = public.eq_prof_id());

drop policy if exists vinc_escrita on public.vinculos_paciente_aplicador;
create policy vinc_escrita on public.vinculos_paciente_aplicador for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba'));

drop policy if exists cron_select on public.cronograma_terapeutico;
create policy cron_select on public.cronograma_terapeutico for select to authenticated
using (public.eq_ve_paciente(paciente_id) or profissional_id = public.eq_prof_id());

drop policy if exists cron_escrita on public.cronograma_terapeutico;
create policy cron_escrita on public.cronograma_terapeutico for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

drop policy if exists sess_select on public.sessoes;
create policy sess_select on public.sessoes for select to authenticated
using (public.eq_ve_paciente(paciente_id) or profissional_id = public.eq_prof_id());

drop policy if exists sess_update_propria on public.sessoes;
create policy sess_update_propria on public.sessoes for update to authenticated
using  (profissional_id = public.eq_prof_id())
with check (profissional_id = public.eq_prof_id());

drop policy if exists sess_escrita on public.sessoes;
create policy sess_escrita on public.sessoes for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

-- carimbo de quem mudou o status e quando
create or replace function public.eq_carimba_status_sessao()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
    if new.status is distinct from old.status then
        new.status_alterado_em  := now();
        new.status_alterado_por := public.eq_prof_id();
        if new.status = 'realizada' and old.status <> 'realizada' then
            new.realizada_em  := now();
            new.realizada_por := public.eq_prof_id();
        end if;
    end if;
    return new;
end $$;

drop trigger if exists trg_carimba_status on public.sessoes;
create trigger trg_carimba_status before update on public.sessoes
    for each row execute function public.eq_carimba_status_sessao();

-- conflito de horário: mesmo profissional ou mesmo paciente, com vigências que se cruzam
create or replace function public.eq_valida_cronograma()
returns trigger language plpgsql as $$
declare
    v_fim time := new.hora_inicio + (new.duracao_min || ' minutes')::interval;
    v_conflito record;
begin
    if not new.ativo then return new; end if;

    select c.*, p.nome_completo as paciente_nome, pr.nome_completo as prof_nome
      into v_conflito
    from public.cronograma_terapeutico c
    join public.pacientes p      on p.id  = c.paciente_id
    join public.profissionais pr on pr.id = c.profissional_id
    where c.ativo
      and c.id is distinct from new.id
      and c.dia_semana = new.dia_semana
      and (c.profissional_id = new.profissional_id or c.paciente_id = new.paciente_id)
      and c.hora_inicio < v_fim
      and new.hora_inicio < (c.hora_inicio + (c.duracao_min || ' minutes')::interval)
      and (c.vigencia_fim is null or c.vigencia_fim >= new.vigencia_inicio)
      and (new.vigencia_fim is null or new.vigencia_fim >= c.vigencia_inicio)
    limit 1;

    if found then
        if v_conflito.profissional_id = new.profissional_id then
            raise exception 'Conflito: % já atende % neste dia às %.',
                v_conflito.prof_nome, v_conflito.paciente_nome, to_char(v_conflito.hora_inicio,'HH24:MI');
        else
            raise exception 'Conflito: este paciente já tem atendimento neste dia às % com %.',
                to_char(v_conflito.hora_inicio,'HH24:MI'), v_conflito.prof_nome;
        end if;
    end if;
    return new;
end $$;

drop trigger if exists trg_valida_cronograma on public.cronograma_terapeutico;
create trigger trg_valida_cronograma before insert or update on public.cronograma_terapeutico
    for each row execute function public.eq_valida_cronograma();

create or replace function public.salas_ocupadas(p_dia smallint, p_hora time, p_duracao integer)
returns table (sala text, paciente text, profissional text)
language sql stable security definer set search_path = public, pg_temp as $$
    select c.sala, p.nome_completo, pr.nome_completo
    from public.cronograma_terapeutico c
    join public.pacientes p      on p.id  = c.paciente_id
    join public.profissionais pr on pr.id = c.profissional_id
    where c.ativo and c.sala is not null
      and c.dia_semana = p_dia
      and c.hora_inicio < (p_hora + (p_duracao || ' minutes')::interval)
      and p_hora < (c.hora_inicio + (c.duracao_min || ' minutes')::interval) $$;

revoke execute on function public.salas_ocupadas(smallint, time, integer) from public, anon;
grant  execute on function public.salas_ocupadas(smallint, time, integer) to authenticated;

-- geração das sessões do dia a partir da grade
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
    on conflict (paciente_id, data, hora_inicio) do nothing;

    get diagnostics v_criadas = row_count;
    return v_criadas;
end $$;

revoke execute on function public.gerar_sessoes(date) from public, anon;
grant  execute on function public.gerar_sessoes(date) to authenticated;

-- vínculo automático da conta pelo e-mail (equipe e responsáveis)
create or replace function public.eq_vincular_novo_usuario()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
    update public.profissionais set auth_user_id = new.id
     where lower(email) = lower(new.email) and auth_user_id is null;
    begin
        update public.responsaveis set auth_user_id = new.id
         where lower(email) = lower(new.email) and auth_user_id is null;
    exception when undefined_table then null;   -- responsaveis vem no arquivo 09
    end;
    return new;
end $$;

drop trigger if exists trg_vincular_profissional on auth.users;
create trigger trg_vincular_profissional after insert on auth.users
    for each row execute function public.eq_vincular_novo_usuario();

notify pgrst, 'reload schema';

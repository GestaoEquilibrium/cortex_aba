-- ============================================================================
-- CORTEX aba — 01 · fundação: profissionais, equipes e regras de acesso
-- Ordem: primeiro arquivo. Tudo depende dele.
-- ============================================================================
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists public.profissionais (
    id                uuid primary key default gen_random_uuid(),
    auth_user_id      uuid unique references auth.users(id) on delete set null,
    nome_completo     text not null,
    email             text not null unique,
    cpf               text unique,
    telefone          text,
    foto_url          text,
    perfil            text not null check (perfil in (
                          'admin_direcao','coordenador_aba','supervisor_clinico',
                          'aplicador','aplicador_itinerante','estagiario_aba','recepcao')),
    registro_conselho text,
    formacao          text,
    turno             text check (turno in ('manha','tarde','integral')),
    jornada_horas     numeric(4,2),
    equipe_id         uuid,
    ativo             boolean not null default true,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create table if not exists public.equipes_aba (
    id                   uuid primary key default gen_random_uuid(),
    nome                 text not null,
    turno                text not null check (turno in ('manha','tarde','integral')),
    coordenador_id       uuid references public.profissionais(id) on delete set null,
    capacidade_pacientes integer,
    ativo                boolean not null default true,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

do $$ begin
    alter table public.profissionais
        add constraint profissionais_equipe_fk
        foreign key (equipe_id) references public.equipes_aba(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists idx_prof_auth    on public.profissionais(auth_user_id);
create index if not exists idx_prof_perfil  on public.profissionais(perfil) where ativo;
create index if not exists idx_prof_equipe  on public.profissionais(equipe_id) where ativo;
create index if not exists idx_equipe_coord on public.equipes_aba(coordenador_id);

drop trigger if exists trg_prof_updated on public.profissionais;
create trigger trg_prof_updated before update on public.profissionais
    for each row execute function public.set_updated_at();
drop trigger if exists trg_equipe_updated on public.equipes_aba;
create trigger trg_equipe_updated before update on public.equipes_aba
    for each row execute function public.set_updated_at();

-- SECURITY DEFINER é obrigatório: sem isso a policy de profissionais consultaria
-- profissionais e entraria em recursão infinita.
create or replace function public.eq_perfil()
returns text language sql stable security definer set search_path = public, pg_temp as $$
    select perfil from public.profissionais where auth_user_id = auth.uid() and ativo limit 1 $$;

create or replace function public.eq_prof_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
    select id from public.profissionais where auth_user_id = auth.uid() and ativo limit 1 $$;

create or replace function public.eq_equipe_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
    select equipe_id from public.profissionais where auth_user_id = auth.uid() and ativo limit 1 $$;

create or replace function public.eq_is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
    select coalesce((select perfil in ('admin_direcao','supervisor_clinico')
                     from public.profissionais where auth_user_id = auth.uid() and ativo limit 1), false) $$;

revoke execute on function public.eq_perfil(), public.eq_prof_id(),
                          public.eq_equipe_id(), public.eq_is_admin() from public, anon;
grant  execute on function public.eq_perfil(), public.eq_prof_id(),
                          public.eq_equipe_id(), public.eq_is_admin() to authenticated;

alter table public.profissionais enable row level security;
alter table public.equipes_aba   enable row level security;

drop policy if exists prof_select on public.profissionais;
create policy prof_select on public.profissionais for select to authenticated
using (auth_user_id = auth.uid()
    or public.eq_perfil() in ('admin_direcao','supervisor_clinico','recepcao','aplicador_itinerante')
    or (public.eq_perfil() = 'coordenador_aba' and equipe_id = public.eq_equipe_id()));

drop policy if exists prof_self_update on public.profissionais;
create policy prof_self_update on public.profissionais for update to authenticated
using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

drop policy if exists prof_admin_all on public.profissionais;
create policy prof_admin_all on public.profissionais for all to authenticated
using (public.eq_is_admin()) with check (public.eq_is_admin());

drop policy if exists equipe_select on public.equipes_aba;
create policy equipe_select on public.equipes_aba for select to authenticated using (true);

drop policy if exists equipe_admin_all on public.equipes_aba;
create policy equipe_admin_all on public.equipes_aba for all to authenticated
using (public.eq_is_admin()) with check (public.eq_is_admin());

-- Ninguém muda o próprio perfil, status ou equipe.
-- A checagem de auth.uid() não nulo permite manutenção pelo SQL Editor.
create or replace function public.eq_bloqueia_autopromocao()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
    if auth.uid() is not null and not public.eq_is_admin() then
        if new.perfil    is distinct from old.perfil    then raise exception 'Alteração de perfil é restrita à direção.'; end if;
        if new.ativo     is distinct from old.ativo     then raise exception 'Alteração de status é restrita à direção.'; end if;
        if new.equipe_id is distinct from old.equipe_id then raise exception 'Alteração de equipe é restrita à direção.'; end if;
    end if;
    return new;
end $$;

drop trigger if exists trg_prof_autopromocao on public.profissionais;
create trigger trg_prof_autopromocao before update on public.profissionais
    for each row execute function public.eq_bloqueia_autopromocao();

notify pgrst, 'reload schema';

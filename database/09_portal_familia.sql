-- ============================================================================
-- CORTEX aba — 09 · responsáveis e portal da família
-- ============================================================================
create table if not exists public.responsaveis (
    id           uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique references auth.users(id) on delete set null,
    nome         text not null,
    email        text not null unique,
    telefone     text,
    cpf          text,
    ativo        boolean not null default true,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create table if not exists public.responsaveis_pacientes (
    id             uuid primary key default gen_random_uuid(),
    responsavel_id uuid not null references public.responsaveis(id) on delete cascade,
    paciente_id    uuid not null references public.pacientes(id) on delete cascade,
    parentesco     text,
    principal      boolean not null default true,
    created_at     timestamptz not null default now(),
    unique (responsavel_id, paciente_id)
);

create table if not exists public.orientacoes_responsavel (
    id                 uuid primary key default gen_random_uuid(),
    paciente_id        uuid not null references public.pacientes(id) on delete cascade,
    titulo             text not null,
    texto              text not null,
    tipo               text not null default 'orientacao' check (tipo in ('orientacao','atividade','aviso')),
    enviado_por        uuid references public.profissionais(id) on delete set null,
    vigencia_ate       date,
    ativo              boolean not null default true,
    lido_em            timestamptz,
    executado_em       timestamptz,
    observacao_familia text,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists idx_resp_auth  on public.responsaveis(auth_user_id);
create index if not exists idx_rp_resp    on public.responsaveis_pacientes(responsavel_id);
create index if not exists idx_rp_pac     on public.responsaveis_pacientes(paciente_id);
create index if not exists idx_orient_pac on public.orientacoes_responsavel(paciente_id, created_at desc);

drop trigger if exists trg_resp_upd on public.responsaveis;
create trigger trg_resp_upd before update on public.responsaveis
    for each row execute function public.set_updated_at();
drop trigger if exists trg_orient_upd on public.orientacoes_responsavel;
create trigger trg_orient_upd before update on public.orientacoes_responsavel
    for each row execute function public.set_updated_at();

create or replace function public.eq_responsavel_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
    select id from public.responsaveis where auth_user_id = auth.uid() and ativo limit 1 $$;

create or replace function public.eq_responsavel_ve(p_paciente uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
    select exists (select 1 from public.responsaveis_pacientes rp
                   where rp.paciente_id = p_paciente
                     and rp.responsavel_id = public.eq_responsavel_id()) $$;

revoke execute on function public.eq_responsavel_id(), public.eq_responsavel_ve(uuid) from public, anon;
grant  execute on function public.eq_responsavel_id(), public.eq_responsavel_ve(uuid) to authenticated;

alter table public.responsaveis            enable row level security;
alter table public.responsaveis_pacientes  enable row level security;
alter table public.orientacoes_responsavel enable row level security;

drop policy if exists resp_self on public.responsaveis;
create policy resp_self on public.responsaveis for select to authenticated
using (auth_user_id = auth.uid()
       or public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao','supervisor_clinico'));

drop policy if exists resp_escrita on public.responsaveis;
create policy resp_escrita on public.responsaveis for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

drop policy if exists rp_select on public.responsaveis_pacientes;
create policy rp_select on public.responsaveis_pacientes for select to authenticated
using (responsavel_id = public.eq_responsavel_id() or public.eq_ve_paciente(paciente_id));

drop policy if exists rp_escrita on public.responsaveis_pacientes;
create policy rp_escrita on public.responsaveis_pacientes for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

drop policy if exists orient_select on public.orientacoes_responsavel;
create policy orient_select on public.orientacoes_responsavel for select to authenticated
using (public.eq_ve_paciente(paciente_id) or public.eq_responsavel_ve(paciente_id));

drop policy if exists orient_escrita on public.orientacoes_responsavel;
create policy orient_escrita on public.orientacoes_responsavel for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','aplicador'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','aplicador'));

drop policy if exists orient_familia on public.orientacoes_responsavel;
create policy orient_familia on public.orientacoes_responsavel for update to authenticated
using (public.eq_responsavel_ve(paciente_id)) with check (public.eq_responsavel_ve(paciente_id));

-- o que a família enxerga nas tabelas que já existiam
drop policy if exists pac_familia on public.pacientes;
create policy pac_familia on public.pacientes for select to authenticated
using (public.eq_responsavel_ve(id));

drop policy if exists sess_familia on public.sessoes;
create policy sess_familia on public.sessoes for select to authenticated
using (public.eq_responsavel_ve(paciente_id));

drop policy if exists rel_familia on public.relatorios_mensais;
create policy rel_familia on public.relatorios_mensais for select to authenticated
using (public.eq_responsavel_ve(paciente_id) and status = 'finalizado' and liberado_familia = true);

notify pgrst, 'reload schema';

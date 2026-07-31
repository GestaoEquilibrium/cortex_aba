-- ============================================================================
-- CORTEX aba — 04 · biblioteca de programas e PEI
-- ============================================================================
create table if not exists public.biblioteca_programas (
    id                     uuid primary key default gen_random_uuid(),
    nome                   text not null,
    area                   text not null check (area in
                           ('receptiva','expressiva','cognicao','motora','social','autocuidado')),
    objetivo               text,
    sd                     text,
    resposta_esperada      text,
    consequencia           text,
    tipo_registro          text not null default 'tentativas_discretas' check (tipo_registro in
                           ('tentativas_discretas','frequencia','duracao','latencia','intervalo','analise_tarefa')),
    dicas                  text[] default array['gestual','verbal','modelo','fisica'],
    tentativas_padrao      integer default 10 check (tentativas_padrao between 1 and 100),
    criterio_percentual    integer default 80 check (criterio_percentual between 1 and 100),
    criterio_sessoes       integer default 3  check (criterio_sessoes between 1 and 20),
    criterio_generalizacao text,
    manutencao_dias        integer[] default array[15,30,60],
    materiais              text,
    pre_requisitos         text,
    faixa_etaria           text,
    ativo                  boolean not null default true,
    autor_id               uuid references public.profissionais(id) on delete set null,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);

create table if not exists public.pei (
    id             uuid primary key default gen_random_uuid(),
    paciente_id    uuid not null references public.pacientes(id) on delete cascade,
    versao         integer not null default 1,
    data_inicio    date not null default current_date,
    data_revisao   date,
    status         text not null default 'vigente' check (status in ('rascunho','vigente','encerrado')),
    coordenador_id uuid references public.profissionais(id) on delete set null,
    observacoes    text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create table if not exists public.pei_programas (
    id                    uuid primary key default gen_random_uuid(),
    pei_id                uuid not null references public.pei(id) on delete cascade,
    paciente_id           uuid not null references public.pacientes(id) on delete cascade,
    programa_id           uuid not null references public.biblioteca_programas(id) on delete restrict,
    profissional_id       uuid references public.profissionais(id) on delete set null,
    prioridade            integer default 3 check (prioridade between 1 and 5),
    tentativas_por_sessao integer not null default 10 check (tentativas_por_sessao between 1 and 100),
    criterio_percentual   integer not null default 80,
    criterio_sessoes      integer not null default 3,
    status                text not null default 'em_ensino' check (status in
                          ('em_ensino','em_manutencao','dominado','suspenso','arquivado')),
    generalizou_pessoa    boolean not null default false,
    generalizou_ambiente  boolean not null default false,
    generalizou_material  boolean not null default false,
    data_inicio           date not null default current_date,
    data_status           date,
    observacao            text,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create table if not exists public.pei_alvos (
    id              uuid primary key default gen_random_uuid(),
    pei_programa_id uuid not null references public.pei_programas(id) on delete cascade,
    nome            text not null,
    status          text not null default 'aquisicao' check (status in ('aquisicao','manutencao','dominado','pausado')),
    ordem           integer default 0,
    data_status     date,
    created_at      timestamptz not null default now()
);

create index if not exists idx_bib_area    on public.biblioteca_programas(area) where ativo;
create index if not exists idx_pei_pac     on public.pei(paciente_id, status);
create index if not exists idx_peiprog_pei on public.pei_programas(pei_id);
create index if not exists idx_peiprog_pac on public.pei_programas(paciente_id, status);
create index if not exists idx_alvos_prog  on public.pei_alvos(pei_programa_id);

drop trigger if exists trg_bib_upd on public.biblioteca_programas;
create trigger trg_bib_upd before update on public.biblioteca_programas
    for each row execute function public.set_updated_at();
drop trigger if exists trg_pei_upd on public.pei;
create trigger trg_pei_upd before update on public.pei
    for each row execute function public.set_updated_at();
drop trigger if exists trg_peiprog_upd on public.pei_programas;
create trigger trg_peiprog_upd before update on public.pei_programas
    for each row execute function public.set_updated_at();

alter table public.biblioteca_programas enable row level security;
alter table public.pei                  enable row level security;
alter table public.pei_programas        enable row level security;
alter table public.pei_alvos            enable row level security;

drop policy if exists bib_select on public.biblioteca_programas;
create policy bib_select on public.biblioteca_programas for select to authenticated
using (public.eq_prof_id() is not null);
drop policy if exists bib_escrita on public.biblioteca_programas;
create policy bib_escrita on public.biblioteca_programas for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists pei_select on public.pei;
create policy pei_select on public.pei for select to authenticated
using (public.eq_ve_paciente(paciente_id));
drop policy if exists pei_escrita on public.pei;
create policy pei_escrita on public.pei for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists peiprog_select on public.pei_programas;
create policy peiprog_select on public.pei_programas for select to authenticated
using (public.eq_ve_paciente(paciente_id));
drop policy if exists peiprog_escrita on public.pei_programas;
create policy peiprog_escrita on public.pei_programas for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists alvos_select on public.pei_alvos;
create policy alvos_select on public.pei_alvos for select to authenticated
using (exists (select 1 from public.pei_programas pp
               where pp.id = pei_programa_id and public.eq_ve_paciente(pp.paciente_id)));
drop policy if exists alvos_escrita on public.pei_alvos;
create policy alvos_escrita on public.pei_alvos for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

notify pgrst, 'reload schema';

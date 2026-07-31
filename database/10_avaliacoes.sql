-- ============================================================================
-- CORTEX aba — 10 · avaliações
-- ============================================================================
create table if not exists public.protocolos_avaliacao (
    id                  uuid primary key default gen_random_uuid(),
    nome                text not null,
    versao              text,
    descricao           text,
    faixa_etaria        text,
    origem              text not null default 'propria' check (origem in ('propria','licenciada','dominio_publico')),
    observacao_direitos text,
    escala_min          integer not null default 0,
    escala_max          integer not null default 3,
    escala_rotulos      jsonb,
    ativo               boolean not null default true,
    criado_por          uuid references public.profissionais(id) on delete set null,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create table if not exists public.protocolo_dominios (
    id           uuid primary key default gen_random_uuid(),
    protocolo_id uuid not null references public.protocolos_avaliacao(id) on delete cascade,
    nome         text not null,
    ordem        integer not null default 0,
    cor          text
);

create table if not exists public.protocolo_itens (
    id         uuid primary key default gen_random_uuid(),
    dominio_id uuid not null references public.protocolo_dominios(id) on delete cascade,
    codigo     text,
    enunciado  text not null,
    ordem      integer not null default 0
);

create table if not exists public.avaliacoes (
    id           uuid primary key default gen_random_uuid(),
    paciente_id  uuid not null references public.pacientes(id) on delete cascade,
    protocolo_id uuid not null references public.protocolos_avaliacao(id) on delete restrict,
    onda         integer not null default 1,
    data         date not null default current_date,
    avaliador_id uuid references public.profissionais(id) on delete set null,
    contexto     text,
    duracao_min  integer,
    status       text not null default 'em_andamento' check (status in ('em_andamento','concluida')),
    observacoes  text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    unique (paciente_id, protocolo_id, onda)
);

create table if not exists public.avaliacao_respostas (
    id           uuid primary key default gen_random_uuid(),
    avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
    item_id      uuid not null references public.protocolo_itens(id) on delete cascade,
    pontuacao    integer,
    observacao   text,
    unique (avaliacao_id, item_id)
);

create index if not exists idx_dom_prot  on public.protocolo_dominios(protocolo_id, ordem);
create index if not exists idx_item_dom  on public.protocolo_itens(dominio_id, ordem);
create index if not exists idx_aval_pac  on public.avaliacoes(paciente_id, onda);
create index if not exists idx_resp_aval on public.avaliacao_respostas(avaliacao_id);

drop trigger if exists trg_prot_upd on public.protocolos_avaliacao;
create trigger trg_prot_upd before update on public.protocolos_avaliacao
    for each row execute function public.set_updated_at();
drop trigger if exists trg_aval_upd on public.avaliacoes;
create trigger trg_aval_upd before update on public.avaliacoes
    for each row execute function public.set_updated_at();

alter table public.protocolos_avaliacao enable row level security;
alter table public.protocolo_dominios   enable row level security;
alter table public.protocolo_itens      enable row level security;
alter table public.avaliacoes           enable row level security;
alter table public.avaliacao_respostas  enable row level security;

drop policy if exists prot_select on public.protocolos_avaliacao;
create policy prot_select on public.protocolos_avaliacao for select to authenticated
using (public.eq_prof_id() is not null);
drop policy if exists prot_escrita on public.protocolos_avaliacao;
create policy prot_escrita on public.protocolos_avaliacao for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists dom_select on public.protocolo_dominios;
create policy dom_select on public.protocolo_dominios for select to authenticated
using (public.eq_prof_id() is not null);
drop policy if exists dom_escrita on public.protocolo_dominios;
create policy dom_escrita on public.protocolo_dominios for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists item_select on public.protocolo_itens;
create policy item_select on public.protocolo_itens for select to authenticated
using (public.eq_prof_id() is not null);
drop policy if exists item_escrita on public.protocolo_itens;
create policy item_escrita on public.protocolo_itens for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists aval_select on public.avaliacoes;
create policy aval_select on public.avaliacoes for select to authenticated
using (public.eq_ve_paciente(paciente_id));
drop policy if exists aval_escrita on public.avaliacoes;
create policy aval_escrita on public.avaliacoes for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists resp_select on public.avaliacao_respostas;
create policy resp_select on public.avaliacao_respostas for select to authenticated
using (exists (select 1 from public.avaliacoes a
               where a.id = avaliacao_id and public.eq_ve_paciente(a.paciente_id)));
drop policy if exists resp_escrita on public.avaliacao_respostas;
create policy resp_escrita on public.avaliacao_respostas for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

notify pgrst, 'reload schema';

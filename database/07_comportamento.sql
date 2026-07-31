-- ============================================================================
-- CORTEX aba — 07 · comportamento-problema
-- ============================================================================
create table if not exists public.comportamentos_alvo (
    id                  uuid primary key default gen_random_uuid(),
    paciente_id         uuid not null references public.pacientes(id) on delete cascade,
    nome                text not null,
    definicao           text,
    tipo                text not null default 'outro' check (tipo in
                        ('agressao','autolesao','fuga','estereotipia','birra','destruicao','outro')),
    funcao_hipotetizada text check (funcao_hipotetizada in ('atencao','fuga','tangivel','sensorial','indefinida')),
    status              text not null default 'ativo' check (status in ('ativo','resolvido','arquivado')),
    linha_base_ate      date,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create table if not exists public.registros_comportamento (
    id               uuid primary key default gen_random_uuid(),
    comportamento_id uuid not null references public.comportamentos_alvo(id) on delete cascade,
    paciente_id      uuid not null references public.pacientes(id) on delete cascade,
    sessao_id        uuid references public.sessoes(id) on delete set null,
    data             date not null default current_date,
    hora             time,
    antecedente      text,
    descricao        text,
    consequencia     text,
    intensidade      smallint check (intensidade between 1 and 5),
    duracao_seg      integer,
    episodios        integer not null default 1 check (episodios > 0),
    registrado_por   uuid references public.profissionais(id) on delete set null,
    created_at       timestamptz not null default now()
);

create table if not exists public.planos_manejo (
    id                       uuid primary key default gen_random_uuid(),
    comportamento_id         uuid not null references public.comportamentos_alvo(id) on delete cascade,
    estrategia_preventiva    text,
    resposta_equipe          text,
    comportamento_substituto text,
    inicio                   date not null default current_date,
    ativo                    boolean not null default true,
    criado_por               uuid references public.profissionais(id) on delete set null,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);

create index if not exists idx_comp_pac   on public.comportamentos_alvo(paciente_id, status);
create index if not exists idx_regc_comp  on public.registros_comportamento(comportamento_id, data);
create index if not exists idx_regc_pac   on public.registros_comportamento(paciente_id, data);
create index if not exists idx_plano_comp on public.planos_manejo(comportamento_id) where ativo;

drop trigger if exists trg_comp_upd on public.comportamentos_alvo;
create trigger trg_comp_upd before update on public.comportamentos_alvo
    for each row execute function public.set_updated_at();
drop trigger if exists trg_plano_upd on public.planos_manejo;
create trigger trg_plano_upd before update on public.planos_manejo
    for each row execute function public.set_updated_at();

alter table public.comportamentos_alvo     enable row level security;
alter table public.registros_comportamento enable row level security;
alter table public.planos_manejo           enable row level security;

drop policy if exists comp_select on public.comportamentos_alvo;
create policy comp_select on public.comportamentos_alvo for select to authenticated
using (public.eq_ve_paciente(paciente_id));
drop policy if exists comp_escrita on public.comportamentos_alvo;
create policy comp_escrita on public.comportamentos_alvo for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists regc_select on public.registros_comportamento;
create policy regc_select on public.registros_comportamento for select to authenticated
using (public.eq_ve_paciente(paciente_id));
drop policy if exists regc_insert on public.registros_comportamento;
create policy regc_insert on public.registros_comportamento for insert to authenticated
with check (public.eq_ve_paciente(paciente_id));
drop policy if exists regc_update on public.registros_comportamento;
create policy regc_update on public.registros_comportamento for update to authenticated
using (registrado_por = public.eq_prof_id()
       or public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists plano_select on public.planos_manejo;
create policy plano_select on public.planos_manejo for select to authenticated
using (exists (select 1 from public.comportamentos_alvo c
               where c.id = comportamento_id and public.eq_ve_paciente(c.paciente_id)));
drop policy if exists plano_escrita on public.planos_manejo;
create policy plano_escrita on public.planos_manejo for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

notify pgrst, 'reload schema';

-- ============================================================================
-- CORTEX aba — 05 · coleta na sessão e evolução diária
-- ============================================================================
create table if not exists public.registros_tentativa (
    id              bigserial primary key,
    sessao_id       uuid not null references public.sessoes(id) on delete cascade,
    pei_programa_id uuid not null references public.pei_programas(id) on delete cascade,
    alvo_id         uuid references public.pei_alvos(id) on delete set null,
    numero          integer not null,
    resultado       text not null check (resultado in ('independente','com_ajuda','erro','sem_resposta')),
    nivel_dica      text check (nivel_dica in ('gestual','verbal','modelo','fisica')),
    aplicador_id    uuid references public.profissionais(id) on delete set null,
    registrado_em   timestamptz not null default now(),
    unique (sessao_id, pei_programa_id, alvo_id, numero)
);

create table if not exists public.evolucoes_diarias (
    id              uuid primary key default gen_random_uuid(),
    sessao_id       uuid not null unique references public.sessoes(id) on delete cascade,
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    profissional_id uuid references public.profissionais(id) on delete set null,
    texto           text,
    contexto        text[],
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists idx_tent_sessao on public.registros_tentativa(sessao_id);
create index if not exists idx_tent_prog   on public.registros_tentativa(pei_programa_id, registrado_em);
create index if not exists idx_evol_pac    on public.evolucoes_diarias(paciente_id, created_at desc);

drop trigger if exists trg_evol_upd on public.evolucoes_diarias;
create trigger trg_evol_upd before update on public.evolucoes_diarias
    for each row execute function public.set_updated_at();

alter table public.registros_tentativa enable row level security;
alter table public.evolucoes_diarias   enable row level security;

drop policy if exists tent_select on public.registros_tentativa;
create policy tent_select on public.registros_tentativa for select to authenticated
using (exists (select 1 from public.sessoes s where s.id = sessao_id and public.eq_ve_paciente(s.paciente_id)));

drop policy if exists tent_insert on public.registros_tentativa;
create policy tent_insert on public.registros_tentativa for insert to authenticated
with check (exists (select 1 from public.sessoes s where s.id = sessao_id
                    and (s.profissional_id = public.eq_prof_id()
                         or public.eq_perfil() in ('admin_direcao','coordenador_aba','supervisor_clinico'))));

drop policy if exists tent_delete on public.registros_tentativa;
create policy tent_delete on public.registros_tentativa for delete to authenticated
using (exists (select 1 from public.sessoes s where s.id = sessao_id
               and (s.profissional_id = public.eq_prof_id()
                    or public.eq_perfil() in ('admin_direcao','coordenador_aba'))));

drop policy if exists evol_select on public.evolucoes_diarias;
create policy evol_select on public.evolucoes_diarias for select to authenticated
using (public.eq_ve_paciente(paciente_id));

drop policy if exists evol_escrita on public.evolucoes_diarias;
create policy evol_escrita on public.evolucoes_diarias for all to authenticated
using  (profissional_id = public.eq_prof_id()
        or public.eq_perfil() in ('admin_direcao','coordenador_aba','supervisor_clinico'))
with check (profissional_id = public.eq_prof_id()
        or public.eq_perfil() in ('admin_direcao','coordenador_aba','supervisor_clinico'));

notify pgrst, 'reload schema';

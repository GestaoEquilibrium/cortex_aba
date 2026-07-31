-- ============================================================================
-- CORTEX aba — 08 · relatórios mensais
-- ============================================================================
create table if not exists public.relatorios_mensais (
    id               uuid primary key default gen_random_uuid(),
    paciente_id      uuid not null references public.pacientes(id) on delete cascade,
    mes_referencia   date not null,
    status           text not null default 'rascunho' check (status in ('rascunho','em_revisao','finalizado')),
    frequencia       text,
    objetivos        text,
    progressos       text,
    dificuldades     text,
    comportamento    text,
    plano_proximo    text,
    conclusao        text,
    numeros          jsonb,
    gerado_por       uuid references public.profissionais(id) on delete set null,
    finalizado_por   uuid references public.profissionais(id) on delete set null,
    finalizado_em    timestamptz,
    liberado_familia boolean not null default false,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    unique (paciente_id, mes_referencia)
);

create index if not exists idx_rel_pac    on public.relatorios_mensais(paciente_id, mes_referencia desc);
create index if not exists idx_rel_status on public.relatorios_mensais(status);

drop trigger if exists trg_rel_upd on public.relatorios_mensais;
create trigger trg_rel_upd before update on public.relatorios_mensais
    for each row execute function public.set_updated_at();

alter table public.relatorios_mensais enable row level security;

drop policy if exists rel_select on public.relatorios_mensais;
create policy rel_select on public.relatorios_mensais for select to authenticated
using (public.eq_ve_paciente(paciente_id));

drop policy if exists rel_escrita on public.relatorios_mensais;
create policy rel_escrita on public.relatorios_mensais for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

create or replace function public.eq_trava_relatorio_finalizado()
returns trigger language plpgsql as $$
begin
    if old.status = 'finalizado' and new.status = 'finalizado' then
        if (new.frequencia, new.objetivos, new.progressos, new.dificuldades,
            new.comportamento, new.plano_proximo, new.conclusao)
           is distinct from
           (old.frequencia, old.objetivos, old.progressos, old.dificuldades,
            old.comportamento, old.plano_proximo, old.conclusao) then
            raise exception 'Relatório finalizado. Para editar, volte o status para "em revisão".';
        end if;
    end if;
    return new;
end $$;

drop trigger if exists trg_trava_relatorio on public.relatorios_mensais;
create trigger trg_trava_relatorio before update on public.relatorios_mensais
    for each row execute function public.eq_trava_relatorio_finalizado();

notify pgrst, 'reload schema';

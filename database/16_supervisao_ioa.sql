-- ============================================================================
-- CORTEX aba — 16 · fidelidade de aplicação e concordância entre observadores
-- ============================================================================
-- Sem `observador` na chave única, o registro do supervisor sobrescreveria o do
-- aplicador — e os dois dados virariam um só, que é o que o IOA existe para evitar.
alter table public.registros_tentativa
    add column if not exists observador boolean not null default false;

alter table public.registros_tentativa
    drop constraint if exists registros_tentativa_sessao_id_pei_programa_id_alvo_id_numero_key;

create unique index if not exists idx_tent_unico
    on public.registros_tentativa (sessao_id, pei_programa_id,
        coalesce(alvo_id, '00000000-0000-0000-0000-000000000000'::uuid), numero, observador);

create or replace function public.calcular_ioa(p_sessao uuid)
returns table (pei_programa_id uuid, programa text, comparadas integer,
               concordantes integer, percentual integer)
language sql stable security definer set search_path = public, pg_temp as $$
    select a.pei_programa_id, b.nome, count(*)::integer,
           count(*) filter (where a.resultado = o.resultado)::integer,
           case when count(*) = 0 then 0
                else round(count(*) filter (where a.resultado = o.resultado) * 100.0 / count(*))::integer
           end
    from public.registros_tentativa a
    join public.registros_tentativa o
      on o.sessao_id = a.sessao_id and o.pei_programa_id = a.pei_programa_id
     and o.numero = a.numero
     and coalesce(o.alvo_id,'00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(a.alvo_id,'00000000-0000-0000-0000-000000000000'::uuid)
     and o.observador = true
    join public.pei_programas pp       on pp.id = a.pei_programa_id
    join public.biblioteca_programas b on b.id  = pp.programa_id
    where a.sessao_id = p_sessao and a.observador = false
    group by a.pei_programa_id, b.nome
$$;

revoke execute on function public.calcular_ioa(uuid) from public, anon;
grant  execute on function public.calcular_ioa(uuid) to authenticated;

create table if not exists public.supervisoes (
    id              uuid primary key default gen_random_uuid(),
    profissional_id uuid not null references public.profissionais(id) on delete cascade,
    supervisor_id   uuid references public.profissionais(id) on delete set null,
    paciente_id     uuid references public.pacientes(id) on delete set null,
    sessao_id       uuid references public.sessoes(id) on delete set null,
    data            date not null default current_date,
    itens           jsonb not null,
    percentual      integer check (percentual between 0 and 100),
    ioa_percentual  integer check (ioa_percentual between 0 and 100),
    pontos_fortes   text,
    pontos_ajustar  text,
    plano_acao      text,
    ciente_em       timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists idx_sup_prof on public.supervisoes(profissional_id, data desc);

drop trigger if exists trg_sup_upd on public.supervisoes;
create trigger trg_sup_upd before update on public.supervisoes
    for each row execute function public.set_updated_at();

alter table public.supervisoes enable row level security;

drop policy if exists sup_select on public.supervisoes;
create policy sup_select on public.supervisoes for select to authenticated
using (profissional_id = public.eq_prof_id()
       or public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists sup_escrita on public.supervisoes;
create policy sup_escrita on public.supervisoes for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

drop policy if exists sup_ciente on public.supervisoes;
create policy sup_ciente on public.supervisoes for update to authenticated
using (profissional_id = public.eq_prof_id())
with check (profissional_id = public.eq_prof_id());

insert into public.configuracoes (chave, valor, descricao, grupo) values
    ('checklist_fidelidade',
     '["Preparou os materiais antes da sessão",
       "Apresentou a instrução de forma clara e única",
       "Aguardou o tempo de resposta antes de ajudar",
       "Usou o nível de ajuda previsto no programa",
       "Reduziu a ajuda ao longo das tentativas",
       "Reforçou imediatamente a resposta correta",
       "Manteve o reforçador combinado no PEI",
       "Registrou as tentativas durante a sessão, não depois",
       "Seguiu o plano de manejo para comportamento",
       "Encerrou com transição adequada"]'::jsonb,
     'Itens verificados na supervisão de fidelidade', 'clinico')
on conflict (chave) do nothing;

notify pgrst, 'reload schema';

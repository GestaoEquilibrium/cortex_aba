-- ============================================================================
-- CORTEX aba — 19 · reforçadores e avaliação de preferência
-- ============================================================================

-- 1. O que funciona com cada criança ---------------------------------------------
-- Reforçador saturado é a causa mais comum de "o programa parou de funcionar".
-- Guardar isso por escrito é o que permite qualquer aplicador assumir a sessão.
create table if not exists public.reforcadores (
    id              uuid primary key default gen_random_uuid(),
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    nome            text not null,
    tipo            text not null default 'outro' check (tipo in
                    ('comestivel','atividade','social','sensorial','tangivel','outro')),
    preferencia     text not null default 'media' check (preferencia in ('alta','media','baixa')),
    observacao      text,
    restricao       text,                       -- alergia, restrição alimentar, limite de tempo
    ativo           boolean not null default true,
    ultima_avaliacao date,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (paciente_id, nome)
);

create index if not exists idx_ref_pac on public.reforcadores(paciente_id) where ativo;

-- 2. A avaliação de preferência ---------------------------------------------------
create table if not exists public.avaliacoes_preferencia (
    id              uuid primary key default gen_random_uuid(),
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    data            date not null default current_date,
    metodo          text not null default 'multiplo' check (metodo in
                    ('livre','pareado','multiplo','entrevista_familia')),
    resultado       jsonb,                      -- [{ item, escolhas, aproximacoes }]
    observacao      text,
    aplicado_por    uuid references public.profissionais(id) on delete set null,
    created_at      timestamptz not null default now()
);

create index if not exists idx_pref_pac on public.avaliacoes_preferencia(paciente_id, data desc);

drop trigger if exists trg_ref_upd on public.reforcadores;
create trigger trg_ref_upd before update on public.reforcadores
    for each row execute function public.set_updated_at();

alter table public.reforcadores           enable row level security;
alter table public.avaliacoes_preferencia enable row level security;

-- quem atende precisa ver e ajustar: reforçador se descobre na sala
drop policy if exists ref_select on public.reforcadores;
create policy ref_select on public.reforcadores for select to authenticated
using (public.eq_ve_paciente(paciente_id));

drop policy if exists ref_escrita on public.reforcadores;
create policy ref_escrita on public.reforcadores for all to authenticated
using  (public.eq_ve_paciente(paciente_id))
with check (public.eq_ve_paciente(paciente_id));

drop policy if exists pref_select on public.avaliacoes_preferencia;
create policy pref_select on public.avaliacoes_preferencia for select to authenticated
using (public.eq_ve_paciente(paciente_id));

drop policy if exists pref_escrita on public.avaliacoes_preferencia;
create policy pref_escrita on public.avaliacoes_preferencia for all to authenticated
using  (public.eq_ve_paciente(paciente_id))
with check (public.eq_ve_paciente(paciente_id));

-- 3. Prazo de reavaliação ----------------------------------------------------------
insert into public.configuracoes (chave, valor, descricao, grupo) values
    ('preferencia_reavaliar_dias', '90'::jsonb,
     'Dias até sugerir nova avaliação de preferência', 'clinico')
on conflict (chave) do nothing;

-- 4. Tarefa automática de reavaliação -----------------------------------------------
create or replace function public.gerar_tarefas_preferencia()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_criadas integer := 0; v_prazo integer; r record;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico') then
        return 0;
    end if;

    select coalesce((valor #>> '{}')::integer, 90) into v_prazo
      from public.configuracoes where chave = 'preferencia_reavaliar_dias';
    if v_prazo is null then v_prazo := 90; end if;

    for r in
        select p.id, p.nome_completo, p.equipe_id,
               (select max(data) from public.avaliacoes_preferencia a where a.paciente_id = p.id) as ultima,
               (select profissional_id from public.vinculos_paciente_aplicador v
                 where v.paciente_id = p.id and v.tipo = 'titular' and v.ativo limit 1) as aplicador
        from public.pacientes p
        where p.status = 'ativo'
    loop
        -- só cobra de quem já tem PEI: sem objetivo em ensino, reforçador ainda não pesa
        if not exists (select 1 from public.pei_programas pp
                       where pp.paciente_id = r.id and pp.status = 'em_ensino') then
            continue;
        end if;

        if r.ultima is null or r.ultima < current_date - v_prazo then
            insert into public.tarefas
                (titulo, descricao, tipo, paciente_id, responsavel_id, criado_por,
                 prazo, prioridade, origem, chave_unica)
            values
                ('Avaliar preferências — ' || r.nome_completo,
                 case when r.ultima is null
                      then 'Nunca foi feita avaliação de preferência para esta criança.'
                      else 'Última avaliação em ' || to_char(r.ultima,'DD/MM/YYYY') ||
                           '. Reforçador saturado é a causa mais comum de programa que para de andar.' end,
                 'supervisao', r.id, r.aplicador, public.eq_prof_id(),
                 current_date + 14, 'media', 'automatica',
                 'preferencia:' || r.id || ':' || coalesce(r.ultima::text, 'nunca'))
            on conflict (chave_unica) do nothing;
            if found then v_criadas := v_criadas + 1; end if;
        end if;
    end loop;

    return v_criadas;
end $$;

revoke execute on function public.gerar_tarefas_preferencia() from public, anon;
grant  execute on function public.gerar_tarefas_preferencia() to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- CORTEX aba — 06 · tarefas e geração automática por faltas
-- ============================================================================
create table if not exists public.tarefas (
    id             uuid primary key default gen_random_uuid(),
    titulo         text not null,
    descricao      text,
    tipo           text not null default 'outro' check (tipo in
                   ('contato_familia','revisao_pei','supervisao','relatorio','evolucao','outro')),
    paciente_id    uuid references public.pacientes(id) on delete cascade,
    responsavel_id uuid references public.profissionais(id) on delete set null,
    criado_por     uuid references public.profissionais(id) on delete set null,
    prazo          date,
    prioridade     text not null default 'media' check (prioridade in ('baixa','media','alta')),
    status         text not null default 'aberta' check (status in ('aberta','concluida','cancelada')),
    origem         text not null default 'manual' check (origem in ('manual','automatica')),
    chave_unica    text unique,
    concluida_em   timestamptz,
    concluida_por  uuid references public.profissionais(id) on delete set null,
    observacao_conclusao text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists idx_tar_status on public.tarefas(status, prazo);
create index if not exists idx_tar_resp   on public.tarefas(responsavel_id, status);
create index if not exists idx_tar_pac    on public.tarefas(paciente_id);

drop trigger if exists trg_tar_upd on public.tarefas;
create trigger trg_tar_upd before update on public.tarefas
    for each row execute function public.set_updated_at();

alter table public.tarefas enable row level security;

drop policy if exists tar_select on public.tarefas;
create policy tar_select on public.tarefas for select to authenticated
using (responsavel_id = public.eq_prof_id() or criado_por = public.eq_prof_id()
       or public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'));

drop policy if exists tar_insert on public.tarefas;
create policy tar_insert on public.tarefas for insert to authenticated
with check (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'));

drop policy if exists tar_update on public.tarefas;
create policy tar_update on public.tarefas for update to authenticated
using (responsavel_id = public.eq_prof_id()
       or public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'))
with check (responsavel_id = public.eq_prof_id()
       or public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba'));

create or replace function public.gerar_tarefas_faltas()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_criadas integer := 0; r record;
begin
    if public.eq_perfil() not in ('admin_direcao','coordenador_aba','supervisor_clinico','recepcao') then
        return 0;
    end if;

    for r in
        with faltas as (
            select s.paciente_id, s.data,
                   row_number() over (partition by s.paciente_id order by s.data) as seq
            from public.sessoes s
            where s.status in ('falta_injustificada','falta_justificada')
              and s.data >= current_date - 30
        ),
        seguidas as (
            select f1.paciente_id, max(f2.data) as data_ultima
            from faltas f1
            join faltas f2 on f2.paciente_id = f1.paciente_id and f2.seq = f1.seq + 1
            group by f1.paciente_id
        )
        select sg.paciente_id, sg.data_ultima, p.nome_completo, p.equipe_id
        from seguidas sg join public.pacientes p on p.id = sg.paciente_id
        where p.status = 'ativo'
    loop
        insert into public.tarefas
            (titulo, descricao, tipo, paciente_id, responsavel_id, criado_por,
             prazo, prioridade, origem, chave_unica)
        values
            ('Contatar responsável — faltas seguidas',
             r.nome_completo || ' faltou em sessões consecutivas. Última falta em ' ||
             to_char(r.data_ultima,'DD/MM/YYYY') || '. Falta repetida é o principal sinal de desistência.',
             'contato_familia', r.paciente_id,
             (select coordenador_id from public.equipes_aba where id = r.equipe_id),
             public.eq_prof_id(), current_date, 'alta', 'automatica',
             'falta:' || r.paciente_id || ':' || r.data_ultima)
        on conflict (chave_unica) do nothing;
        if found then v_criadas := v_criadas + 1; end if;
    end loop;
    return v_criadas;
end $$;

revoke execute on function public.gerar_tarefas_faltas() from public, anon;
grant  execute on function public.gerar_tarefas_faltas() to authenticated;

notify pgrst, 'reload schema';

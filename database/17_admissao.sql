-- ============================================================================
-- CORTEX aba — 17 · admissão, fila de espera e mapa de vagas
-- ============================================================================
create table if not exists public.admissoes (
    id                uuid primary key default gen_random_uuid(),
    paciente_id       uuid not null references public.pacientes(id) on delete cascade,
    origem            text not null default 'outro' check (origem in
                      ('indicacao','convenio','medico','escola','busca_espontanea','outro')),
    encaminhado_por   text,
    data_contato      date not null default current_date,
    prioridade        integer not null default 3 check (prioridade between 1 and 5),
    sessoes_desejadas integer check (sessoes_desejadas between 1 and 20),
    disponibilidade   jsonb,
    observacao        text,
    status            text not null default 'contato' check (status in
                      ('contato','triagem','aguardando_vaga','alocado','desistiu','recusado')),
    motivo_saida      text,
    responsavel_id    uuid references public.profissionais(id) on delete set null,
    alocado_em        date,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique (paciente_id)
);

create index if not exists idx_adm_status on public.admissoes(status, prioridade, data_contato);

drop trigger if exists trg_adm_upd on public.admissoes;
create trigger trg_adm_upd before update on public.admissoes
    for each row execute function public.set_updated_at();

alter table public.admissoes enable row level security;

drop policy if exists adm_select on public.admissoes;
create policy adm_select on public.admissoes for select to authenticated
using (public.eq_perfil() in ('admin_direcao','supervisor_clinico','coordenador_aba','recepcao'));

drop policy if exists adm_escrita on public.admissoes;
create policy adm_escrita on public.admissoes for all to authenticated
using  (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'))
with check (public.eq_perfil() in ('admin_direcao','coordenador_aba','recepcao'));

insert into public.configuracoes (chave, valor, descricao, grupo) values
    ('clinica_abre',  '"08:00"'::jsonb, 'Início do atendimento', 'operacao'),
    ('clinica_fecha', '"18:00"'::jsonb, 'Fim do atendimento', 'operacao')
on conflict (chave) do nothing;

-- Vaga é espaço recorrente na grade, não buraco de um dia: por isso percorre
-- cronograma_terapeutico e não sessoes.
create or replace function public.mapa_vagas(p_duracao integer default 60)
returns table (dia_semana smallint, hora time, livres integer, profissionais text[])
language sql stable security definer set search_path = public, pg_temp as $$
    with limites as (
        select coalesce((select (valor #>> '{}')::time from public.configuracoes where chave = 'clinica_abre'),  '08:00'::time) as abre,
               coalesce((select (valor #>> '{}')::time from public.configuracoes where chave = 'clinica_fecha'), '18:00'::time) as fecha
    ),
    horarios as (
        select generate_series((select abre from limites),
                               (select fecha from limites) - (p_duracao || ' minutes')::interval,
                               interval '30 minutes')::time as hora
    ),
    dias as (select generate_series(1,5)::smallint as dia),
    aplicadores as (
        select id, nome_completo from public.profissionais
        where ativo and perfil in ('aplicador','aplicador_itinerante','estagiario_aba')
    )
    select d.dia, h.hora, count(*)::integer,
           array_agg(a.nome_completo order by a.nome_completo)
    from dias d
    cross join horarios h
    cross join aplicadores a
    where not exists (
        select 1 from public.cronograma_terapeutico c
        where c.ativo and c.profissional_id = a.id and c.dia_semana = d.dia
          and c.hora_inicio < (h.hora + (p_duracao || ' minutes')::interval)
          and h.hora < (c.hora_inicio + (c.duracao_min || ' minutes')::interval))
    group by d.dia, h.hora
    order by d.dia, h.hora
$$;

revoke execute on function public.mapa_vagas(integer) from public, anon;
grant  execute on function public.mapa_vagas(integer) to authenticated;

create or replace function public.fila_espera()
returns table (admissao_id uuid, paciente_id uuid, nome text, idade_anos integer,
               prioridade integer, dias_esperando integer, sessoes_desejadas integer,
               disponibilidade jsonb, origem text, status text)
language sql stable security definer set search_path = public, pg_temp as $$
    select a.id, p.id, p.nome_completo,
           extract(year from age(p.data_nascimento))::integer,
           a.prioridade, (current_date - a.data_contato)::integer,
           a.sessoes_desejadas, a.disponibilidade, a.origem, a.status
    from public.admissoes a
    join public.pacientes p on p.id = a.paciente_id
    where a.status in ('contato','triagem','aguardando_vaga')
    order by a.prioridade, a.data_contato
$$;

revoke execute on function public.fila_espera() from public, anon;
grant  execute on function public.fila_espera() to authenticated;

notify pgrst, 'reload schema';
